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
import { TsentaSidebarDragGhost } from "../TsentaSidebarDragGhost";
import {
	type SidebarListDropData,
	type SidebarRowDragData,
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

const measuring = { droppable: { strategy: MeasuringStrategy.Always } };

/**
 * The row under the pointer when there is one, else the innermost list the
 * pointer is in (a repository inside "My workspaces", say). A row's hit
 * also says which half of it the pointer is in, measured in the same frame
 * as the hit itself, so auto-scroll cannot skew it.
 */
const collisionDetection: CollisionDetection = (args) => {
	const hits = pointerWithin(args);
	const row = hits.find(
		(hit) =>
			(hit.data?.droppableContainer?.data.current as DropData | undefined)
				?.type === "tsenta-row",
	);
	if (row) {
		const rect = args.droppableRects.get(row.id);
		const pointer = args.pointerCoordinates;
		const placement: DropPlacement =
			rect && pointer && pointer.y > rect.top + rect.height / 2
				? "after"
				: "before";
		return [{ ...row, data: { ...row.data, placement } }];
	}
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
	children: ReactNode;
}

/**
 * Drag and drop for the Conductor list, on dnd-kit like Paradev's own and
 * nested inside its context so the two never see each other's rows. Rows
 * drop onto sections (file into the folder), Pinned (pin), a repository or
 * "My workspaces" (out of any folder) or next to a row (that place in the
 * list); planConductorDrop turns the drop into the same useDashboardSidebarState
 * writes Paradev's sidebar makes, so the stock list shows the result too.
 */
export function TsentaSidebarDnd({
	pinned,
	sections,
	laneChildren,
	mutations,
	disabled,
	children,
}: TsentaSidebarDndProps) {
	const {
		reorderPinnedWorkspaces,
		reorderProjectChildren,
		setSectionWorkspaceOrder,
		setWorkspacePinned,
	} = mutations;
	const [store] = useState(createDropIndicatorStore);
	const [active, setActive] = useState<SidebarRowDragData | null>(null);
	const latest = useRef<ConductorDropContext>({
		pinned,
		sections,
		laneChildren,
	});
	useLayoutEffect(() => {
		latest.current = { pinned, sections, laneChildren };
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
		): { plan: ConductorDropPlan | null; indicator: DropIndicator } => {
			const dragged = event.active.data.current as
				| SidebarRowDragData
				| undefined;
			const over = event.over;
			const overData = over?.data.current as DropData | undefined;
			const draggingWorkspaceId = dragged?.workspace.id ?? null;
			const idle = { ...IDLE_DROP_INDICATOR, draggingWorkspaceId };
			if (!dragged || !over || !overData)
				return { plan: null, indicator: idle };
			const placement: DropPlacement =
				event.collisions?.[0]?.data?.placement === "after" ? "after" : "before";
			const plan = planConductorDrop(
				{
					workspaceId: dragged.workspace.id,
					laneProjectId: dragged.laneProjectId,
					isPinned: dragged.isPinned,
				},
				toDropTarget(overData, placement),
				latest.current,
			);
			if (!plan) return { plan, indicator: idle };
			return {
				plan,
				indicator: {
					listKey: overData.listKey,
					rowKey: overData.type === "tsenta-row" ? overData.rowKey : null,
					placement,
					draggingWorkspaceId,
				},
			};
		},
		[],
	);

	const handleDragStart = useCallback(
		({ active: start }: DragStartEvent) => {
			const data = start.data.current as SidebarRowDragData | undefined;
			setActive(data ?? null);
			// Conductor keeps the hover card shut while a row is dragged.
			forceClose();
			if (!isHoldingHoverRef.current) {
				isHoldingHoverRef.current = true;
				beginHoverCardSuppression();
			}
			store.set({
				...IDLE_DROP_INDICATOR,
				draggingWorkspaceId: data?.workspace.id ?? null,
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
			const { plan } = resolve(event);
			const dragged = event.active.data.current as
				| SidebarRowDragData
				| undefined;
			reset();
			if (!plan || !dragged) return;
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
			activeWorkspaceId: active?.workspace.id ?? null,
		}),
		[store, disabled, active],
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
						{active ? (
							<TsentaSidebarDragGhost workspace={active.workspace} />
						) : null}
					</DragOverlay>,
					document.body,
				)}
			</DndContext>
		</TsentaSidebarDndContext.Provider>
	);
}
