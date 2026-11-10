import { useLingui } from "@lingui/react/macro";
import { cn } from "@superset/ui/utils";
import { useEffect, useRef } from "react";
import { DashboardSidebarBulkActions } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarBulkActions";
import { DashboardSidebarHiddenProjects } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarHiddenProjects";
import { WorkspaceBulkMenuScope } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem/components/WorkspaceBulkMenuScope";
import { DashboardSidebarProjectsFilterInput } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspacesHeader/components/DashboardSidebarProjectsFilterInput";
import { useProjectFilterExpanded } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspacesHeader/hooks/useProjectFilterExpanded";
import { useDashboardSidebarDnd } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useSidebarDnd";
import type {
	DashboardSidebarHiddenProject,
	DashboardSidebarProject,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import type {
	SidebarProjectHostFilter,
	SidebarProjectSortMode,
} from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";
import { useSidebarSectionsCollapseStore } from "renderer/stores/sidebar-sections-collapse";
import { useTsentaSidebarGrouping } from "renderer/tsenta/stores/sidebar-grouping";
import type { TsentaListRowProps } from "../../types";
import type { ConductorRepoGroup } from "../../utils/buildConductorSidebarModel";
import { TsentaRepoGroup } from "../TsentaRepoGroup";
import { TsentaSectionActionsButton } from "../TsentaSectionActionsButton";
import { TsentaSectionHeader } from "../TsentaSectionHeader";
import { useSidebarListDrop } from "../TsentaSidebarDnd";
import { TsentaSidebarRow } from "../TsentaSidebarRow";
import { TsentaMyWorkspacesMenu } from "./components/TsentaMyWorkspacesMenu";
import { useAddProjectActions } from "./hooks/useAddProjectActions";

const FLAT_TARGET = { kind: "loose" } as const;

interface TsentaMyWorkspacesProps extends TsentaListRowProps {
	repos: readonly ConductorRepoGroup[];
	/** Every project in the sidebar, for the bulk-selection toolbar. */
	allProjects: DashboardSidebarProject[];
	hiddenProjects: DashboardSidebarHiddenProject[];
	onShowHiddenProject: (projectId: string) => void;
	onToggleProjectCollapsed: (projectId: string) => void;
	onNewSection: (projectId: string) => void;
	sortMode: SidebarProjectSortMode;
	onSortModeChange: (mode: SidebarProjectSortMode) => void;
	hostFilter: SidebarProjectHostFilter | null;
	onHostFilterChange: (filter: SidebarProjectHostFilter) => void;
	filterQuery: string;
	onFilterQueryChange: (query: string) => void;
}

/**
 * Conductor's "My workspaces" (shell-sidebar spec §4.2, §4.4): a semibold
 * header whose "…" holds the list's controls, over the workspaces in no
 * folder, by repository or (Group by None) in one flat list. A row dropped
 * on it (outside a repository) leaves its folder for its own project. The header
 * gives way to Paradev's bulk-selection toolbar while rows are selected,
 * and Paradev's project filter opens under it. The hidden-projects list
 * and the no-match note follow, as in the stock list.
 */
export function TsentaMyWorkspaces({
	repos,
	allProjects,
	hiddenProjects,
	onShowHiddenProject,
	onToggleProjectCollapsed,
	onNewSection,
	sortMode,
	onSortModeChange,
	hostFilter,
	onHostFilterChange,
	filterQuery,
	onFilterQueryChange,
	...rowProps
}: TsentaMyWorkspacesProps) {
	const { t } = useLingui();
	const grouping = useTsentaSidebarGrouping((state) => state.grouping);
	const addProject = useAddProjectActions();
	const { workspacesById, groupInfo } = useDashboardSidebarDnd();
	const isCollapsed = useSidebarSectionsCollapseStore(
		(state) => state.collapsed.workspaces,
	);
	const toggleSection = useSidebarSectionsCollapseStore(
		(state) => state.toggle,
	);
	const { setNodeRef, isDropTarget } = useSidebarListDrop(
		"unsectioned",
		FLAT_TARGET,
	);
	const [isFilterExpanded, setIsFilterExpanded] =
		useProjectFilterExpanded(filterQuery);
	const openFilter = () => {
		setIsFilterExpanded(true);
		if (isCollapsed) toggleSection("workspaces");
	};
	// As the stock header does: collapsing the list closes a running filter,
	// which would otherwise hide projects with nothing on screen saying so.
	const wasCollapsedRef = useRef(isCollapsed);
	useEffect(() => {
		if (isCollapsed && !wasCollapsedRef.current) {
			onFilterQueryChange("");
			setIsFilterExpanded(false);
		}
		wasCollapsedRef.current = isCollapsed;
	}, [isCollapsed, onFilterQueryChange, setIsFilterExpanded]);

	const label = t({ message: "My workspaces" });
	const trimmedQuery = filterQuery.trim();
	const isFlat = grouping === "none";

	return (
		<div
			ref={setNodeRef}
			data-tsenta="list-my-workspaces"
			className={cn(
				"flex w-full min-w-0 flex-col",
				isDropTarget && "rounded-md bg-sidebar-accent",
			)}
		>
			<DashboardSidebarBulkActions projects={allProjects}>
				<div className="group/section-header relative mt-0.5">
					<TsentaSectionHeader
						label={label}
						weight="semibold"
						className="[&>span:first-child]:flex-1"
						isCollapsed={isCollapsed}
						onToggleCollapse={() => toggleSection("workspaces")}
						hasActions
					/>
					<TsentaSectionActionsButton label={label} contentClassName="w-48">
						<TsentaMyWorkspacesMenu
							sortMode={sortMode}
							onSortModeChange={onSortModeChange}
							hostFilter={hostFilter}
							onHostFilterChange={onHostFilterChange}
							onOpenFilter={openFilter}
							projects={repos.map((repo) => repo.project)}
							onNewSection={onNewSection}
							addProject={addProject}
						/>
					</TsentaSectionActionsButton>
				</div>
			</DashboardSidebarBulkActions>
			{isFilterExpanded && (
				<div className="flex px-1.5 pt-1">
					<DashboardSidebarProjectsFilterInput
						query={filterQuery}
						onQueryChange={onFilterQueryChange}
						isExpanded
						onExpandedChange={setIsFilterExpanded}
					/>
				</div>
			)}
			<div
				hidden={isCollapsed}
				className="flex w-full min-w-0 flex-col gap-1 pt-1"
			>
				{isFlat
					? repos.map((repo) => (
							<WorkspaceBulkMenuScope
								key={repo.project.id}
								projectId={repo.project.id}
								workspacesById={workspacesById}
								groupInfo={groupInfo}
							>
								{repo.rows.map((workspace) => (
									<TsentaSidebarRow
										key={workspace.id}
										workspace={workspace}
										listKey="unsectioned"
										listTarget={FLAT_TARGET}
										laneProjectId={repo.project.id}
										indent="flush"
										shortcutLabel={rowProps.shortcutLabels.get(workspace.id)}
										onHoverCardOpen={rowProps.onWorkspaceHover}
										isSelected={rowProps.isWorkspaceSelected(workspace)}
										onSelectionClick={rowProps.onSelectionClick(workspace)}
									/>
								))}
							</WorkspaceBulkMenuScope>
						))
					: repos.map((repo) => (
							<TsentaRepoGroup
								key={repo.project.id}
								group={repo}
								onToggleCollapse={onToggleProjectCollapsed}
								canReorder={repos.length > 1}
								{...rowProps}
							/>
						))}
				<DashboardSidebarHiddenProjects
					projects={hiddenProjects}
					onShow={onShowHiddenProject}
				/>
				{(trimmedQuery !== "" ||
					hostFilter === "local" ||
					hostFilter === "cloud") &&
					repos.length === 0 && (
						<div className="cursor-text select-text px-1.5 py-2 text-muted-foreground text-xs">
							{trimmedQuery !== ""
								? t({ message: `No projects match "${trimmedQuery}"` })
								: hostFilter === "cloud"
									? t({ message: "No cloud workspaces" })
									: t({ message: "No local workspaces" })}
						</div>
					)}
			</div>
		</div>
	);
}
