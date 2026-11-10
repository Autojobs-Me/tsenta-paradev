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
 * The inputs of Paradev's useDashboardSidebarShortcuts in the Conductor
 * list's order, so ⌘1 to ⌘9 (and the labels the rows show) count rows the
 * way the list shows them: every section, the Sessions rows, then each
 * repository's rows (shell-sidebar spec §6: "nth workspace in visible
 * sidebar order"). The hook numbers its Sessions rows first, so they go in
 * as one more group instead.
 *
 * Each group is a slice of a real project (its id, so a jump still finds
 * and opens a collapsed folder or repository). A slice holding a folder is
 * never "collapsed" as a project: in the Conductor list a repository's
 * collapse does not hide its folders.
 */
export function buildConductorShortcutOrder({
	projects,
	sessionChildren,
}: {
	projects: readonly DashboardSidebarProject[];
	sessionChildren: readonly DashboardSidebarProjectChild[];
}): ConductorShortcutOrder {
	const model = buildConductorSidebarModel({ projects, sessionChildren });
	const byId = new Map(projects.map((project) => [project.id, project]));
	const groups: DashboardSidebarProject[] = [];
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
	return { groups, sessionWorkspaces: [], sessionChildren: [] };
}
