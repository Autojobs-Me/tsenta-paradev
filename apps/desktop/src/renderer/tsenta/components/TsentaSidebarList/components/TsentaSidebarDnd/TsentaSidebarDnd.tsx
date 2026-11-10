import {
	type CollisionDetection,
	DndContext,
	type DragEndEvent,
	type DragMoveEvent,
	DragOverlay,
	type DragStartEvent,
	MeasuringStrategy,
	MouseSensor,
	pointerWithin,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { DRAG_ACTIVATION_DISTANCE_PX } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useSidebarDnd/constants";
import { useDashboardSidebarHoverActions } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarHoverProvider";
import type { useDashboardSidebarState } from "renderer/routes/_authenticated/hooks/useDashboardSidebarState";
import {
	type ConductorDropContext,
	type ConductorDropPlan,
	type DropPlacement,
	planConductorDrop,
} from "../../utils/planConductorDrop";
import { planConductorRepoMove } from "../../utils/planConductorRepoMove";
import {
	TsentaSidebarDragGhost,
	TsentaSidebarRepoDragGhost,
} from "../TsentaSidebarDragGhost";
import {
	type SidebarDragData,
	type SidebarListDropData,
	type SidebarRowDropData,
	TsentaSidebarDndContext,
	toDropTarget,
} from "./context";
import {
	createDropIndicatorStore,
	type DropIndicator,
	IDLE_DROP_INDICATOR,
} from "./dropIndicatorStore";

type DropData = SidebarRowDropData | SidebarListDropData;

/** A repository group's own drop target: its project id, else null. */
function repoTargetOf(data: DropData | undefined): string | null {
	if (data?.type !== "tsenta-list" || data.target.kind !== "loose") return null;
	const { laneProjectId } = data.target;
	return typeof laneProjectId === "string" ? laneProjectId : null;
}

type Collisions = ReturnType<CollisionDetection>;

/** The hit with the pointer's half of it, in the frame it was measured in. */
function withPlacement(
	hit: Collisions[number],
	args: Parameters<CollisionDetection>[0],
): Collisions {
	const rect = args.droppableRects.get(hit.id);
	const pointer = args.pointerCoordinates;
	const placement: DropPlacement =
		rect && pointer && pointer.y > rect.top + rect.height / 2
			? "after"
			: "before";
	return [{ ...hit, data: { ...hit.data, placement } }];
}

const measuring = { droppable: { strategy: MeasuringStrategy.Always } };

/**
 * The row under the pointer when there is one, else the innermost list the
 * pointer is in (a repository inside "My workspaces", say). A row's hit
 * also says which half of it the pointer is in, measured in the same frame
 * as the hit itself, so auto-scroll cannot skew it.
 */
const collisionDetection: CollisionDetection = (args) => {
	const hits = pointerWithin(args);
	const dataOf = (hit: Collisions[number]) =>
		hit.data?.droppableContainer?.data.current as DropData | undefined;
	// A repository header only ever lands beside another repository.
	if (
		(args.active.data.current as SidebarDragData | undefined)?.type ===
		"tsenta-repo"
	) {
		const repo = hits.find((hit) => repoTargetOf(dataOf(hit)) !== null);
		return repo ? withPlacement(repo, args) : [];
	}
	const row = hits.find((hit) => dataOf(hit)?.type === "tsenta-row");
	if (row) return withPlacement(row, args);
	let innermost: (typeof hits)[number] | null = null;
	let innermostArea = Number.POSITIVE_INFINITY;
	for (const hit of hits) {
		const rect = args.droppableRects.get(hit.id);
		if (!rect) continue;
		const area = rect.width * rect.height;
		if (area < innermostArea) {
			innermost = hit;
			innermostArea = area;
		}
	}
	return innermost ? [innermost] : [];
};

type SidebarState = ReturnType<typeof useDashboardSidebarState>;

interface TsentaSidebarDndProps extends ConductorDropContext {
	/** The useDashboardSidebarState writes a drop makes. */
	mutations: Pick<
		SidebarState,
		| "reorderPinnedWorkspaces"
		| "reorderProjectChildren"
		| "setSectionWorkspaceOrder"
		| "setWorkspacePinned"
	>;
	/** Paradev's rule: no drags while the list is sorted or filtered. */
	disabled: boolean;
	/** Every project in manual order, which a repository drop rewrites. */
	projectOrder: readonly string[];
	/** Paradev's project reorder (DashboardSidebar's, as its own drag uses). */
	onReorderProjects: (projectIds: string[]) => void;
	/** Paradev's rule for projects: no reorder while a filter hides some. */
	isRepoDragDisabled: boolean;
	children: ReactNode;
}

type ResolvedDrop =
	| { type: "workspace"; plan: ConductorDropPlan }
	| { type: "repo"; order: string[] };

/**
 * Drag and drop for the Conductor list, on dnd-kit like Paradev's own and
 * nested inside its context so the two never see each other's rows. Rows
 * drop onto sections (file into the folder), Pinned (pin), a repository or
 * "My workspaces" (out of any folder) or next to a row (that place in the
 * list); planConductorDrop turns the drop into the same useDashboardSidebarState
 * writes Paradev's sidebar makes, so the stock list shows the result too.
 * Repository headers drag too, beside each other, into Paradev's project
 * order (shell-sidebar spec §4.4).
 */
export function TsentaSidebarDnd({
	pinned,
	sections,
	laneChildren,
	mutations,
	disabled,
	projectOrder,
	onReorderProjects,
	isRepoDragDisabled,
	children,
}: TsentaSidebarDndProps) {
	const {
		reorderPinnedWorkspaces,
		reorderProjectChildren,
		setSectionWorkspaceOrder,
		setWorkspacePinned,
	} = mutations;
	const [store] = useState(createDropIndicatorStore);
	const [active, setActive] = useState<SidebarDragData | null>(null);
	const latest = useRef<ConductorDropContext>({
		pinned,
		sections,
		laneChildren,
	});
	const latestProjectOrder = useRef(projectOrder);
	useLayoutEffect(() => {
		latest.current = { pinned, sections, laneChildren };
		latestProjectOrder.current = projectOrder;
	});
	// Paradev's hover machine, held for the drag as its own sidebar drag
	// does (DashboardSidebarDndProvider): no card opens over the rows the
	// pointer crosses, none pops up under the drop, and no row it crosses
	// refreshes its pull request. One hold per drag, released on any end.
	const { beginHoverCardSuppression, endHoverCardSuppression, forceClose } =
		useDashboardSidebarHoverActions();
	const isHoldingHoverRef = useRef(false);
	const releaseHoverHold = useCallback(() => {
		if (!isHoldingHoverRef.current) return;
		isHoldingHoverRef.current = false;
		endHoverCardSuppression();
	}, [endHoverCardSuppression]);
	// A drag cut short by an unmount must not leave hover cards shut.
	useEffect(() => releaseHoverHold, [releaseHoverHold]);

	const sensorOptions = useMemo(
		() => ({
			mouse: {
				activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX },
			},
			touch: { activationConstraint: { delay: 200, tolerance: 5 } },
		}),
		[],
	);
	const sensors = useSensors(
		useSensor(MouseSensor, sensorOptions.mouse),
		useSensor(TouchSensor, sensorOptions.touch),
	);

	const resolve = useCallback(
		(
			event: DragMoveEvent | DragEndEvent,
		): { drop: ResolvedDrop | null; indicator: DropIndicator } => {
			const dragged = event.active.data.current as SidebarDragData | undefined;
			const over = event.over;
			const overData = over?.data.current as DropData | undefined;
			const draggingWorkspaceId =
				dragged?.type === "tsenta-row" ? dragged.workspace.id : null;
			const idle = { ...IDLE_DROP_INDICATOR, draggingWorkspaceId };
			if (!dragged || !over || !overData)
				return { drop: null, indicator: idle };
			const placement: DropPlacement =
				event.collisions?.[0]?.data?.placement === "after" ? "after" : "before";
			if (dragged.type === "tsenta-repo") {
				const overProjectId = repoTargetOf(overData);
				const order =
					overProjectId === null
						? null
						: planConductorRepoMove(
								latestProjectOrder.current,
								dragged.project.id,
								overProjectId,
								placement,
							);
				if (!order) return { drop: null, indicator: idle };
				return {
					drop: { type: "repo", order },
					indicator: { ...idle, repoId: overProjectId, placement },
				};
			}
			const plan = planConductorDrop(
				{
					workspaceId: dragged.workspace.id,
					laneProjectId: dragged.laneProjectId,
					isPinned: dragged.isPinned,
				},
				toDropTarget(overData, placement),
				latest.current,
			);
			if (!plan) return { drop: null, indicator: idle };
			return {
				drop: { type: "workspace", plan },
				indicator: {
					listKey: overData.listKey,
					rowKey: overData.type === "tsenta-row" ? overData.rowKey : null,
					repoId: null,
					placement,
					draggingWorkspaceId,
				},
			};
		},
		[],
	);

	const handleDragStart = useCallback(
		({ active: start }: DragStartEvent) => {
			const data = start.data.current as SidebarDragData | undefined;
			setActive(data ?? null);
			// Conductor keeps the hover card shut while a row is dragged.
			forceClose();
			if (!isHoldingHoverRef.current) {
				isHoldingHoverRef.current = true;
				beginHoverCardSuppression();
			}
			store.set({
				...IDLE_DROP_INDICATOR,
				draggingWorkspaceId:
					data?.type === "tsenta-row" ? data.workspace.id : null,
			});
		},
		[store, forceClose, beginHoverCardSuppression],
	);
	const handleDragMove = useCallback(
		(event: DragMoveEvent) => store.set(resolve(event).indicator),
		[resolve, store],
	);
	const reset = useCallback(() => {
		setActive(null);
		releaseHoverHold();
		store.set(IDLE_DROP_INDICATOR);
	}, [store, releaseHoverHold]);
	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { drop } = resolve(event);
			const dragged = event.active.data.current as SidebarDragData | undefined;
			reset();
			if (!drop || !dragged) return;
			if (drop.type === "repo") {
				onReorderProjects(drop.order);
				return;
			}
			if (dragged.type !== "tsenta-row") return;
			const { plan } = drop;
			const { workspace } = dragged;
			if (plan.type === "pin") {
				reorderPinnedWorkspaces(plan.pins, {
					allowNewWorkspaceId: workspace.id,
				});
				return;
			}
			if (plan.unpin) {
				setWorkspacePinned(workspace.id, workspace.projectId, false);
			}
			if (plan.type === "folder") {
				setSectionWorkspaceOrder(
					plan.laneProjectId,
					plan.sectionId,
					plan.workspaceIds,
				);
				return;
			}
			reorderProjectChildren(plan.laneProjectId, plan.items);
		},
		[
			resolve,
			reset,
			onReorderProjects,
			reorderPinnedWorkspaces,
			reorderProjectChildren,
			setSectionWorkspaceOrder,
			setWorkspacePinned,
		],
	);

	const value = useMemo(
		() => ({
			store,
			isDisabled: disabled,
			isRepoDragDisabled,
			activeWorkspaceId:
				active?.type === "tsenta-row" ? active.workspace.id : null,
		}),
		[store, disabled, isRepoDragDisabled, active],
	);

	return (
		<TsentaSidebarDndContext.Provider value={value}>
			<DndContext
				sensors={sensors}
				collisionDetection={collisionDetection}
				measuring={measuring}
				onDragStart={handleDragStart}
				onDragMove={handleDragMove}
				onDragOver={handleDragMove}
				onDragEnd={handleDragEnd}
				onDragCancel={reset}
			>
				{children}
				{/* On the body: the sidebar's slide transform would otherwise
				    anchor the fixed-position ghost to the panel. */}
				{createPortal(
					<DragOverlay dropAnimation={null}>
						{active?.type === "tsenta-row" ? (
							<TsentaSidebarDragGhost workspace={active.workspace} />
						) : active?.type === "tsenta-repo" ? (
							<TsentaSidebarRepoDragGhost project={active.project} />
						) : null}
					</DragOverlay>,
					document.body,
				)}
			</DndContext>
		</TsentaSidebarDndContext.Provider>
	);
}
