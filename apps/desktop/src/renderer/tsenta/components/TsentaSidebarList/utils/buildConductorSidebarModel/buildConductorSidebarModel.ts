import type {
	DashboardSidebarPinnedWorkspace,
	DashboardSidebarProject,
	DashboardSidebarProjectChild,
	DashboardSidebarSection,
	DashboardSidebarWorkspace,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { matchesHostFilter } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/utils/filterDashboardSidebarProjectsByHost";
import type { SidebarProjectHostFilter } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";
import {
	laneProjectIdForScope,
	parseSidebarFolderKey,
} from "renderer/routes/_authenticated/utils/workspaceTagFolders";

/** One of Paradev's folders inside a Conductor section. */
export interface ConductorFolder {
	section: DashboardSidebarSection;
	/** The lane its rows are filed under: a project id, or null for Sessions. */
	laneProjectId: string | null;
}

export interface ConductorSectionRow {
	workspace: DashboardSidebarWorkspace;
	laneProjectId: string | null;
	folderId: string;
}

/**
 * A top-level Conductor user section (shell-sidebar spec §4.6): every
 * Paradev folder that files workspaces under the same tag, whichever project
 * (or the Sessions lane) it belongs to. A legacy folder, which has no tag,
 * is a section of its own.
 */
export interface ConductorFolderSection {
	key: string;
	/** The folder tag, or null for a legacy folder. */
	tag: string | null;
	name: string;
	color: string | null;
	folders: ConductorFolder[];
	/** Folder by folder, each in Paradev's order. */
	rows: ConductorSectionRow[];
	/** Collapsed only when every folder in it is. */
	isCollapsed: boolean;
}

/** A project's rows that sit in no folder, under its repository header. */
export interface ConductorRepoGroup {
	project: DashboardSidebarProject;
	rows: DashboardSidebarWorkspace[];
}

export interface ConductorSidebarModel {
	/** The pinned rows the stock list shows: pin order, host filtered. */
	pinned: DashboardSidebarPinnedWorkspace[];
	sections: ConductorFolderSection[];
	/** Sessions in no folder. */
	sessions: DashboardSidebarWorkspace[];
	repos: ConductorRepoGroup[];
}

export function conductorSectionKey(section: DashboardSidebarSection): {
	key: string;
	tag: string | null;
} {
	const tag = parseSidebarFolderKey(section.id)?.tag ?? null;
	return tag === null
		? { key: `folder:${section.id}`, tag: null }
		: { key: `tag:${tag}`, tag };
}

/**
 * Reshapes what the stock list renders into Conductor's flat list: the
 * pinned rows, one section per folder tag across every lane, the Sessions
 * lane's loose rows, and each project's loose rows.
 *
 * The input is DashboardSidebar's own data, unchanged: useDashboardSidebarData
 * already decided every row (local, remote host and cloud, cloud rows filed
 * under their repository's project), hid the hidden projects and rows, and
 * DashboardSidebar sorted and filtered the projects. Membership and order
 * are Paradev's; this only regroups them, so the two lists cannot show
 * different rows (buildConductorSidebarModel.parity.test.ts holds them to
 * that over a realistic sidebar).
 */
export function buildConductorSidebarModel({
	projects,
	sessionChildren,
	pinnedWorkspaces = [],
	hostFilter = "all",
}: {
	/** DashboardSidebar's displayed projects: sorted, host and text filtered. */
	projects: readonly DashboardSidebarProject[];
	/** The Sessions lane, unfiltered, as the stock list renders it. */
	sessionChildren: readonly DashboardSidebarProjectChild[];
	/** Every pinned row, in pin order. */
	pinnedWorkspaces?: readonly DashboardSidebarPinnedWorkspace[];
	/** The local and cloud filter; "all" while it is hidden. */
	hostFilter?: SidebarProjectHostFilter;
}): ConductorSidebarModel {
	const sections = new Map<string, ConductorFolderSection>();
	const addFolder = (section: DashboardSidebarSection) => {
		const { key, tag } = conductorSectionKey(section);
		const laneProjectId = laneProjectIdForScope(section.projectId);
		let entry = sections.get(key);
		if (!entry) {
			entry = {
				key,
				tag,
				name: section.name,
				color: section.color,
				folders: [],
				rows: [],
				isCollapsed: true,
			};
			sections.set(key, entry);
		}
		entry.folders.push({ section, laneProjectId });
		entry.color ??= section.color;
		entry.isCollapsed &&= section.isCollapsed;
		for (const workspace of section.workspaces) {
			entry.rows.push({ workspace, laneProjectId, folderId: section.id });
		}
	};
	const looseRows = (children: readonly DashboardSidebarProjectChild[]) => {
		const rows: DashboardSidebarWorkspace[] = [];
		for (const child of children) {
			if (child.type === "workspace") rows.push(child.workspace);
			else addFolder(child.section);
		}
		return rows;
	};

	const repos = projects.map((project) => ({
		project,
		rows: looseRows(project.children),
	}));
	const sessions = looseRows(sessionChildren);
	// DashboardSidebar's displayedPinnedWorkspaces: the stock Pinned section
	// follows the local and cloud filter (its Sessions lane does not).
	const pinned =
		hostFilter === "all"
			? [...pinnedWorkspaces]
			: pinnedWorkspaces.filter((workspace) =>
					matchesHostFilter(workspace, hostFilter),
				);
	return { pinned, sections: [...sections.values()], sessions, repos };
}
