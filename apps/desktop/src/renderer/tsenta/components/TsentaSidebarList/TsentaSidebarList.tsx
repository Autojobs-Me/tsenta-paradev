import { SESSIONS_TAG_SCOPE } from "@superset/shared/workspace-tags";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useV2UserPreferences } from "renderer/hooks/useV2UserPreferences";
import { useDashboardSidebarSectionRename } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarSectionRenameContext";
import { useDashboardSidebarDnd } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useSidebarDnd";
import { useDashboardSidebarActions } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarActionsProvider";
import {
	useDashboardSidebarSelection,
	type WorkspaceSelectionEvent,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarSelectionProvider";
import type {
	DashboardSidebarHiddenProject,
	DashboardSidebarPinnedWorkspace,
	DashboardSidebarProject,
	DashboardSidebarProjectChild,
	DashboardSidebarWorkspace,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { useDashboardSidebarState } from "renderer/routes/_authenticated/hooks/useDashboardSidebarState";
import type {
	SidebarProjectHostFilter,
	SidebarProjectSortMode,
} from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";
import { parseSidebarFolderKey } from "renderer/routes/_authenticated/utils/workspaceTagFolders";
import { useSidebarSectionsCollapseStore } from "renderer/stores/sidebar-sections-collapse";
import {
	type FolderSectionActions,
	TsentaFolderSection,
} from "./components/TsentaFolderSection";
import { TsentaMyWorkspaces } from "./components/TsentaMyWorkspaces";
import { TsentaPinnedSection } from "./components/TsentaPinnedSection";
import { TsentaSessionsSection } from "./components/TsentaSessionsSection";
import { TsentaSidebarDnd } from "./components/TsentaSidebarDnd";
import type { TsentaListRowProps } from "./types";
import {
	buildConductorSidebarModel,
	type ConductorFolderSection,
} from "./utils/buildConductorSidebarModel";

export interface TsentaSidebarListProps {
	/** Paradev's displayed projects: sorted, then host and text filtered. */
	projects: DashboardSidebarProject[];
	/** Every project in manual order, for the bulk-selection toolbar. */
	allProjects: DashboardSidebarProject[];
	/** Every pinned row; the list shows the ones the host filter keeps. */
	pinnedWorkspaces: DashboardSidebarPinnedWorkspace[];
	/** The Sessions lane: project-less rows and their folders. */
	sessionChildren: DashboardSidebarProjectChild[];
	hiddenProjects: DashboardSidebarHiddenProject[];
	onShowHiddenProject: (projectId: string) => void;
	workspaceShortcutLabels: Map<string, string>;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
	sortMode: SidebarProjectSortMode;
	onSortModeChange: (mode: SidebarProjectSortMode) => void;
	/** Null hides the local and cloud filter (and then it shows all). */
	hostFilter: SidebarProjectHostFilter | null;
	onHostFilterChange: (filter: SidebarProjectHostFilter) => void;
	filterQuery: string;
	onFilterQueryChange: (query: string) => void;
	/** Paradev's project reorder, which a repository header drop makes. */
	onReorderProjects: (projectIds: string[]) => void;
	/** Paradev's rule: no project reorder while a filter hides projects. */
	isProjectDragDisabled: boolean;
}

// Bulk actions are host-backed and project-scoped: Paradev's rule.
const isBulkSelectable = (workspace: DashboardSidebarWorkspace) =>
	workspace.projectId !== null &&
	workspace.type === "worktree" &&
	workspace.pendingTransaction?.type !== "insert" &&
	workspace.hostType !== "cloud";

/**
 * Conductor's sidebar list (shell-sidebar spec §4.1 to §4.7) in place of
 * Paradev's Pinned / Sessions / Projects tree under the Conductor skin, top
 * to bottom: Pinned, one section per folder (across projects), Sessions,
 * then "My workspaces" with the rest by repository.
 *
 * Everything comes from Paradev: the tree DashboardSidebar already built
 * (sorted and filtered there), its collapse state, its row, menus and
 * selection, and its mutations for every drop and action. This component
 * only regroups and restyles.
 */
export function TsentaSidebarList({
	projects,
	allProjects,
	pinnedWorkspaces,
	sessionChildren,
	hiddenProjects,
	onShowHiddenProject,
	workspaceShortcutLabels,
	onWorkspaceHover,
	sortMode,
	onSortModeChange,
	hostFilter,
	onHostFilterChange,
	filterQuery,
	onFilterQueryChange,
	onReorderProjects,
	isProjectDragDisabled,
}: TsentaSidebarListProps) {
	const model = useMemo(
		() =>
			buildConductorSidebarModel({
				projects,
				sessionChildren,
				pinnedWorkspaces,
				hostFilter: hostFilter ?? "all",
			}),
		[projects, sessionChildren, pinnedWorkspaces, hostFilter],
	);
	const {
		createSection,
		deleteSection,
		renameSection,
		reorderPinnedWorkspaces,
		reorderProjectChildren,
		setSectionWorkspaceOrder,
		setWorkspacePinned,
		toggleProjectCollapsed,
		toggleSectionCollapsed,
	} = useDashboardSidebarState();
	const { setSectionColor } = useDashboardSidebarActions();
	const { setTagFolderHidden } = useV2UserPreferences();
	const { requestSectionRename } = useDashboardSidebarSectionRename();
	const { isChildDragDisabled } = useDashboardSidebarDnd();
	const isMyWorkspacesCollapsed = useSidebarSectionsCollapseStore(
		(state) => state.collapsed.workspaces,
	);

	const folderActions = useMemo<FolderSectionActions>(() => {
		const each =
			(run: (sectionId: string) => void) =>
			(section: ConductorFolderSection) => {
				for (const folder of section.folders) run(folder.section.id);
			};
		return {
			// A section spanning projects opens or closes as one.
			onToggleCollapse: (section) => {
				const target = !section.isCollapsed;
				for (const folder of section.folders) {
					if (folder.section.isCollapsed !== target) {
						toggleSectionCollapsed(folder.section.id);
					}
				}
			},
			onRename: (section, name) =>
				each((sectionId) => renameSection(sectionId, name))(section),
			onSetColor: (section, color) =>
				each((sectionId) => setSectionColor(sectionId, color))(section),
			onDelete: each(deleteSection),
			onHide: (section) => {
				for (const folder of section.folders) {
					const key = parseSidebarFolderKey(folder.section.id);
					if (key && key.projectId !== SESSIONS_TAG_SCOPE) {
						setTagFolderHidden(key.projectId, key.tag, true);
					}
				}
			},
		};
	}, [
		deleteSection,
		renameSection,
		setSectionColor,
		setTagFolderHidden,
		toggleSectionCollapsed,
	]);

	const handleNewSection = useCallback(
		(projectId: string) => {
			requestSectionRename(createSection(projectId));
		},
		[createSection, requestSectionRename],
	);

	// Multi-select, as the stock list does it: per project, in the order the
	// rows show (sections first, then the repository), skipping rows a
	// collapsed section or repository hides.
	const laneOrders = useMemo(() => {
		const orders = new Map<string, string[]>();
		const add = (workspace: DashboardSidebarWorkspace) => {
			if (!isBulkSelectable(workspace) || workspace.projectId === null) return;
			const order = orders.get(workspace.projectId) ?? [];
			order.push(workspace.id);
			orders.set(workspace.projectId, order);
		};
		for (const section of model.sections) {
			if (section.isCollapsed) continue;
			for (const row of section.rows) add(row.workspace);
		}
		if (!isMyWorkspacesCollapsed) {
			for (const repo of model.repos) {
				if (repo.project.isCollapsed) continue;
				for (const workspace of repo.rows) add(workspace);
			}
		}
		return orders;
	}, [model, isMyWorkspacesCollapsed]);
	const laneOrdersRef = useRef(laneOrders);
	useLayoutEffect(() => {
		laneOrdersRef.current = laneOrders;
	});
	const { isWorkspaceSelected, selectWorkspaceFromEvent } =
		useDashboardSidebarSelection();
	const workspaceProjectRef = useRef(new Map<string, string>());
	useLayoutEffect(() => {
		const map = new Map<string, string>();
		for (const [projectId, ids] of laneOrders) {
			for (const id of ids) map.set(id, projectId);
		}
		workspaceProjectRef.current = map;
	});
	// One handler for every row, so the rows' memo holds while lists change.
	const handleSelectionClick = useCallback(
		(event: WorkspaceSelectionEvent, workspaceId: string) => {
			const projectId = workspaceProjectRef.current.get(workspaceId);
			if (!projectId) return false;
			return selectWorkspaceFromEvent(event, {
				workspaceId,
				projectId,
				orderedWorkspaceIds: laneOrdersRef.current.get(projectId) ?? [],
			});
		},
		[selectWorkspaceFromEvent],
	);
	const rowProps = useMemo<TsentaListRowProps>(
		() => ({
			shortcutLabels: workspaceShortcutLabels,
			onWorkspaceHover,
			isWorkspaceSelected: (workspace) =>
				isBulkSelectable(workspace) && isWorkspaceSelected(workspace.id),
			onSelectionClick: (workspace) =>
				isBulkSelectable(workspace) ? handleSelectionClick : undefined,
		}),
		[
			workspaceShortcutLabels,
			onWorkspaceHover,
			isWorkspaceSelected,
			handleSelectionClick,
		],
	);

	// Drops reorder every pin, as the stock list's do, so the drag and drop
	// works on all of them; a filter that hides some also disables drags.
	const pinned = useMemo(
		() =>
			pinnedWorkspaces.map((workspace) => ({
				workspaceId: workspace.id,
				projectId: workspace.projectId,
			})),
		[pinnedWorkspaces],
	);
	const laneChildren = useCallback(
		(laneProjectId: string | null) =>
			laneProjectId === null
				? sessionChildren
				: (projects.find((project) => project.id === laneProjectId)?.children ??
					null),
		[projects, sessionChildren],
	);
	const projectOrder = useMemo(
		() => allProjects.map((project) => project.id),
		[allProjects],
	);
	const mutations = useMemo(
		() => ({
			reorderPinnedWorkspaces,
			reorderProjectChildren,
			setSectionWorkspaceOrder,
			setWorkspacePinned,
		}),
		[
			reorderPinnedWorkspaces,
			reorderProjectChildren,
			setSectionWorkspaceOrder,
			setWorkspacePinned,
		],
	);

	return (
		<TsentaSidebarDnd
			pinned={pinned}
			sections={model.sections}
			laneChildren={laneChildren}
			mutations={mutations}
			disabled={isChildDragDisabled}
			projectOrder={projectOrder}
			onReorderProjects={onReorderProjects}
			isRepoDragDisabled={isProjectDragDisabled}
		>
			<div
				data-tsenta="sidebar-list"
				className="relative flex w-full min-w-0 flex-col pb-3"
			>
				<TsentaPinnedSection
					pinnedWorkspaces={model.pinned}
					shortcutLabels={workspaceShortcutLabels}
					onWorkspaceHover={onWorkspaceHover}
				/>
				<div className="flex w-full min-w-0 flex-col px-1.5 pt-0.5">
					{model.sections.map((section) => (
						<TsentaFolderSection
							key={section.key}
							section={section}
							actions={folderActions}
							{...rowProps}
						/>
					))}
					<TsentaSessionsSection
						sessions={model.sessions}
						shortcutLabels={workspaceShortcutLabels}
						onWorkspaceHover={onWorkspaceHover}
					/>
					<TsentaMyWorkspaces
						repos={model.repos}
						allProjects={allProjects}
						hiddenProjects={hiddenProjects}
						onShowHiddenProject={onShowHiddenProject}
						onToggleProjectCollapsed={toggleProjectCollapsed}
						onNewSection={handleNewSection}
						sortMode={sortMode}
						onSortModeChange={onSortModeChange}
						hostFilter={hostFilter}
						onHostFilterChange={onHostFilterChange}
						filterQuery={filterQuery}
						onFilterQueryChange={onFilterQueryChange}
						{...rowProps}
					/>
				</div>
			</div>
		</TsentaSidebarDnd>
	);
}
