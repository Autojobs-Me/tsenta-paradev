import { useDraggable } from "@dnd-kit/core";
import { cn } from "@superset/ui/utils";
import { useMemo } from "react";
import { DashboardSidebarProjectContextMenu } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarProjectSection/components/DashboardSidebarProjectContextMenu";
import { ImportWorktreesDialog } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarProjectSection/components/ImportWorktreesDialog";
import { useDashboardSidebarProjectSectionActions } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarProjectSection/hooks/useDashboardSidebarProjectSectionActions";
import { WorkspaceBulkMenuScope } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem/components/WorkspaceBulkMenuScope";
import { getBlockedDragProps } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useBlockedDragNotice";
import { useDashboardSidebarDnd } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useSidebarDnd";
import { DeleteProjectDialog } from "renderer/routes/_authenticated/components/DeleteProjectDialog";
import { TsentaSidebarProjectRow } from "renderer/tsenta/components/TsentaSidebarProjectRow";
import type { TsentaListRowProps } from "../../types";
import type { ConductorRepoGroup } from "../../utils/buildConductorSidebarModel";
import {
	type SidebarRepoDragData,
	useRepoDropIndicator,
	useSidebarListDrop,
	useTsentaSidebarDnd,
} from "../TsentaSidebarDnd";
import { TsentaSidebarRow } from "../TsentaSidebarRow";

interface TsentaRepoGroupProps extends TsentaListRowProps {
	group: ConductorRepoGroup;
	onToggleCollapse: (projectId: string) => void;
	/** False while it is the only repository: nothing to reorder against. */
	canReorder: boolean;
}

/**
 * A project's workspaces that sit in no folder, as Conductor's repository
 * group (shell-sidebar spec §4.4): the fork's repository header (icon that
 * turns into a chevron, semibold name, count while collapsed, "…" and "+"),
 * which keeps every Paradev project action (its context menu, new
 * workspace, settings, rename, import, delete), then the rows, indented
 * under it. The group takes dropped rows of its own project (out of their
 * folder, or to a place among the rows). Its header drags to reorder the
 * repositories, as Conductor's does and Paradev's project header did, with
 * an insertion line on the repository it would land beside.
 */
export function TsentaRepoGroup({
	group,
	onToggleCollapse,
	canReorder,
	shortcutLabels,
	onWorkspaceHover,
	isWorkspaceSelected,
	onSelectionClick,
}: TsentaRepoGroupProps) {
	const { project, rows } = group;
	const listKey = `repo:${project.id}`;
	const listTarget = useMemo(
		() => ({ kind: "loose" as const, laneProjectId: project.id }),
		[project.id],
	);
	const { setNodeRef, isDropTarget } = useSidebarListDrop(listKey, listTarget);
	const { workspacesById, groupInfo } = useDashboardSidebarDnd();
	const { isRepoDragDisabled } = useTsentaSidebarDnd();
	const dragData: SidebarRepoDragData = { type: "tsenta-repo", project };
	const drag = useDraggable({
		id: `tsenta-repo:${project.id}`,
		data: dragData,
		disabled: !canReorder || isRepoDragDisabled,
	});
	const repoIndicator = useRepoDropIndicator(project.id);
	const {
		canDeleteProject,
		cancelRename,
		confirmImportWorktrees,
		handleImportWorktrees,
		handleNewSection,
		hideProject,
		isDeleteDialogOpen,
		leaveProjectIfActive,
		openDeleteDialog,
		projectHostIds,
		setIsDeleteDialogOpen,
		handleNewWorkspace,
		handleOpenInFinder,
		handleOpenSettings,
		importableWorktrees,
		isImportingWorktrees,
		isRenaming,
		renameValue,
		setImportableWorktrees,
		setRenameValue,
		startRename,
		submitRename,
	} = useDashboardSidebarProjectSectionActions({ project });
	const isCloudRepo = project.kind === "cloud-repo";

	return (
		<div
			ref={setNodeRef}
			data-tsenta="list-repo"
			className={cn(
				"relative flex w-full min-w-0 flex-col",
				isDropTarget && "rounded-md bg-sidebar-accent",
				drag.isDragging && "opacity-50",
			)}
		>
			{repoIndicator && (
				<div
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full bg-ring",
						repoIndicator === "before" ? "-top-[3px]" : "-bottom-[3px]",
					)}
				/>
			)}
			<div
				ref={drag.setNodeRef}
				{...getBlockedDragProps(canReorder && isRepoDragDisabled)}
				{...drag.listeners}
			>
				<DashboardSidebarProjectContextMenu
					projectId={project.id}
					kind={project.kind}
					onCreateSection={handleNewSection}
					onImportWorktrees={handleImportWorktrees}
					onOpenInFinder={handleOpenInFinder}
					onOpenSettings={handleOpenSettings}
					onHide={hideProject}
					onDelete={canDeleteProject ? openDeleteDialog : null}
					onRename={startRename}
				>
					<TsentaSidebarProjectRow
						className="mx-0"
						projectName={project.name}
						iconUrl={project.iconUrl}
						projectColor={project.color}
						isCollapsed={project.isCollapsed}
						isRenaming={isRenaming}
						renameValue={renameValue}
						onRenameValueChange={setRenameValue}
						onSubmitRename={submitRename}
						onCancelRename={cancelRename}
						onStartRename={isCloudRepo ? undefined : startRename}
						onToggleCollapse={() => onToggleCollapse(project.id)}
						onNewWorkspace={handleNewWorkspace}
						data-workspace-count={rows.length}
					/>
				</DashboardSidebarProjectContextMenu>
			</div>
			<div
				hidden={project.isCollapsed}
				data-sidebar-workspace-list={`repo-${project.id}`}
				className={cn(
					"flex w-full min-w-0 flex-col gap-1",
					rows.length === 0 && "pb-2",
				)}
			>
				<WorkspaceBulkMenuScope
					projectId={project.id}
					workspacesById={workspacesById}
					groupInfo={groupInfo}
				>
					{rows.map((workspace) => (
						<TsentaSidebarRow
							key={workspace.id}
							workspace={workspace}
							listKey={listKey}
							listTarget={listTarget}
							laneProjectId={project.id}
							indent="grouped"
							shortcutLabel={shortcutLabels.get(workspace.id)}
							onHoverCardOpen={onWorkspaceHover}
							isSelected={isWorkspaceSelected(workspace)}
							onSelectionClick={onSelectionClick(workspace)}
						/>
					))}
				</WorkspaceBulkMenuScope>
			</div>
			{importableWorktrees && (
				<ImportWorktreesDialog
					open
					worktrees={importableWorktrees}
					isImporting={isImportingWorktrees}
					onOpenChange={(open) => {
						if (!open) setImportableWorktrees(null);
					}}
					onConfirm={confirmImportWorktrees}
				/>
			)}
			{canDeleteProject && (
				<DeleteProjectDialog
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
					projectId={project.id}
					projectName={project.name}
					hostIds={projectHostIds}
					onDeleted={leaveProjectIfActive}
					onHide={hideProject}
				/>
			)}
		</div>
	);
}
