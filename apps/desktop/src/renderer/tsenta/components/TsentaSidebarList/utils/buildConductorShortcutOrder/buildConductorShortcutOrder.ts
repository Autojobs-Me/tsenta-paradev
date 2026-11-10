import { SESSIONS_TAG_SCOPE } from "@superset/shared/workspace-tags";
import type {
	DashboardSidebarProject,
	DashboardSidebarProjectChild,
	DashboardSidebarWorkspace,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { buildConductorSidebarModel } from "../buildConductorSidebarModel";

export interface ConductorShortcutOrder {
	groups: DashboardSidebarProject[];
	sessionWorkspaces: DashboardSidebarWorkspace[];
	sessionChildren: DashboardSidebarProjectChild[];
	/**
	 * Always empty: the pinned rows already lead `groups`, and the hook puts
	 * these ahead of every group for previous and next, which would visit
	 * them twice.
	 */
	pinnedWorkspaces: DashboardSidebarWorkspace[];
}

/** Holds the Sessions lane's rows; only its id and collapse flag are read. */
const SESSIONS_LANE: DashboardSidebarProject = {
	id: SESSIONS_TAG_SCOPE,
	name: "",
	githubOwner: null,
	githubRepoName: null,
	iconUrl: null,
	color: null,
	createdAt: new Date(0),
	updatedAt: new Date(0),
	isCollapsed: false,
	children: [],
};

/**
 * Holds the pinned rows. Not a project: its id matches none, so a jump to a
 * pinned row toggles nothing (Conductor does not open a collapsed Pinned
 * either).
 */
const PINNED_LANE: DashboardSidebarProject = {
	...SESSIONS_LANE,
	id: "tsenta:pinned",
};

/**
 * The inputs of Paradev's useDashboardSidebarShortcuts in the Conductor
 * list's order, so ⌘1 to ⌘9 (and the labels the rows show) count rows the
 * way the list shows them: Pinned, every section, the Sessions rows, then
 * each repository's rows (shell-sidebar spec §6: "nth workspace in visible
 * sidebar order"; Conductor's list, R:492905, leads with the pinned rows).
 * Previous and next follow the same order, as Conductor's do. The hook
 * numbers its Sessions rows first and keeps pinned rows out of the count,
 * so both go in as groups instead.
 *
 * Each group is a slice of a real project (its id, so a jump still finds
 * and opens a collapsed folder or repository). A slice holding a folder is
 * never "collapsed" as a project: in the Conductor list a repository's
 * collapse does not hide its folders.
 */
export function buildConductorShortcutOrder({
	projects,
	sessionChildren,
	pinnedWorkspaces = [],
}: {
	projects: readonly DashboardSidebarProject[];
	sessionChildren: readonly DashboardSidebarProjectChild[];
	pinnedWorkspaces?: readonly DashboardSidebarWorkspace[];
}): ConductorShortcutOrder {
	const model = buildConductorSidebarModel({ projects, sessionChildren });
	const byId = new Map(projects.map((project) => [project.id, project]));
	const groups: DashboardSidebarProject[] = [];
	if (pinnedWorkspaces.length > 0) {
		groups.push({
			...PINNED_LANE,
			children: pinnedWorkspaces.map((workspace) => ({
				type: "workspace",
				workspace,
			})),
		});
	}
	for (const section of model.sections) {
		for (const folder of section.folders) {
			const lane =
				folder.laneProjectId === null
					? SESSIONS_LANE
					: byId.get(folder.laneProjectId);
			if (!lane) continue;
			groups.push({
				...lane,
				isCollapsed: false,
				children: [{ type: "section", section: folder.section }],
			});
		}
	}
	if (model.sessions.length > 0) {
		groups.push({
			...SESSIONS_LANE,
			children: model.sessions.map((workspace) => ({
				type: "workspace",
				workspace,
			})),
		});
	}
	for (const repo of model.repos) {
		groups.push({
			...repo.project,
			children: repo.rows.map((workspace) => ({
				type: "workspace",
				workspace,
			})),
		});
	}
	return {
		groups,
		sessionWorkspaces: [],
		sessionChildren: [],
		pinnedWorkspaces: [],
	};
}
