import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@superset/ui/utils";
import { memo, useCallback, useMemo } from "react";
import { DashboardSidebarWorkspaceItem } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem";
import { getBlockedDragProps } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useBlockedDragNotice";
import type { WorkspaceSelectionEvent } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarSelectionProvider";
import type { DashboardSidebarWorkspace } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import {
	type SidebarListTarget,
	type SidebarRowDragData,
	type SidebarRowDropData,
	useRowDropIndicator,
	useTsentaSidebarDnd,
} from "../TsentaSidebarDnd";

/**
 * Conductor's row indents (shell-sidebar spec §4.7): `flush` (pl-1.5) in
 * the sections, `grouped` (pl-5) under a repository. sidebar.css applies
 * them to Paradev's row through `data-tsenta-indent`.
 */
export type TsentaRowIndent = "flush" | "grouped" | "pinned" | "in-section";

interface TsentaSidebarRowProps {
	workspace: DashboardSidebarWorkspace;
	/** The list it renders in; with the id it keys the row's drop target. */
	listKey: string;
	listTarget: SidebarListTarget;
	/** The lane Paradev files it under: its project, or null for Sessions. */
	laneProjectId: string | null;
	isPinned?: boolean;
	isInSection?: boolean;
	indent: TsentaRowIndent;
	shortcutLabel?: string;
	onHoverCardOpen: (workspaceId: string) => void | Promise<void>;
	isSelected?: boolean;
	onSelectionClick?: (
		event: WorkspaceSelectionEvent,
		workspaceId: string,
	) => boolean;
}

/**
 * One workspace row of the Conductor list: Paradev's own row
 * (DashboardSidebarWorkspaceItem, with its menus, hover card, rename and
 * selection) inside a wrapper that drags it, takes drops beside it and
 * draws the insertion line.
 */
export const TsentaSidebarRow = memo(function TsentaSidebarRow({
	workspace,
	listKey,
	listTarget,
	laneProjectId,
	isPinned = false,
	isInSection = false,
	indent,
	shortcutLabel,
	onHoverCardOpen,
	isSelected = false,
	onSelectionClick,
}: TsentaSidebarRowProps) {
	const { isDisabled } = useTsentaSidebarDnd();
	const rowKey = `${listKey}/${workspace.id}`;
	const isPending = workspace.pendingTransaction?.type === "insert";
	const dragData: SidebarRowDragData = {
		type: "tsenta-row",
		workspace,
		laneProjectId,
		isPinned,
	};
	const dropData: SidebarRowDropData = {
		type: "tsenta-row",
		listKey,
		rowKey,
		workspaceId: workspace.id,
		laneProjectId,
		target: listTarget,
	};
	const drag = useDraggable({
		id: `tsenta-drag:${rowKey}`,
		data: dragData,
		disabled: isDisabled || isPending,
	});
	const drop = useDroppable({ id: `tsenta-row:${rowKey}`, data: dropData });
	const setNodeRef = useCallback(
		(node: HTMLElement | null) => {
			drag.setNodeRef(node);
			drop.setNodeRef(node);
		},
		[drag.setNodeRef, drop.setNodeRef],
	);
	const indicator = useRowDropIndicator(rowKey);

	const workspaceId = workspace.id;
	const handleSelectionClick = useMemo(
		() =>
			onSelectionClick
				? (event: WorkspaceSelectionEvent) =>
						onSelectionClick(event, workspaceId)
				: undefined,
		[onSelectionClick, workspaceId],
	);
	// The row body (queries, menus) is the expensive part; drag state
	// re-renders this wrapper, not it.
	const row = useMemo(
		() => (
			<DashboardSidebarWorkspaceItem
				workspace={workspace}
				onHoverCardOpen={onHoverCardOpen}
				shortcutLabel={shortcutLabel}
				isInSection={isInSection}
				indentation="top-level"
				isSelected={isSelected}
				onSelectionClick={handleSelectionClick}
			/>
		),
		[
			workspace,
			onHoverCardOpen,
			shortcutLabel,
			isInSection,
			isSelected,
			handleSelectionClick,
		],
	);

	return (
		<div
			ref={setNodeRef}
			data-tsenta-indent={indent}
			className={cn("relative min-w-0", drag.isDragging && "opacity-50")}
			{...getBlockedDragProps(isDisabled)}
			{...drag.listeners}
		>
			{indicator && (
				<div
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full bg-ring",
						indicator === "before" ? "-top-[3px]" : "-bottom-[3px]",
					)}
				/>
			)}
			{row}
		</div>
	);
});
