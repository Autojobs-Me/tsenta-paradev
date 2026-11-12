/**
 * Test support: one realistic sidebar run through Paradev's own builders,
 * composed the way useDashboardSidebarData and DashboardSidebar compose them,
 * so a test can hold the Conductor list against what the stock list shows
 * for the same data.
 *
 * The data mirrors a real sidebar: one project holding local, remote-host
 * (one offline) and cloud workspaces, loose and in tag folders; a collapsed
 * project; cloud workspaces whose repo no host has (stand-in projects, one
 * with a tagged row); four hidden projects (one a stand-in); sessions,
 * loose, in a folder and pinned; pinned local and cloud rows; a legacy
 * folder; rows being created and deleted; and rows neither list may show (a
 * hidden row, rows and a pin of hidden projects, someone else's cloud
 * workspace, a cloud workspace with no placement yet, a row whose project
 * has no placement).
 */

import { cloudRepoProjectId } from "renderer/lib/github/cloudRepoProjectId";
import {
	applyCloudSidebarPinnedRows,
	applyCloudSidebarRows,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useDashboardSidebarData/applyCloudSidebarRows";
import {
	buildCloudSidebarWorkspaces,
	type CloudSidebarWorkspaceInput,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useDashboardSidebarData/buildCloudSidebarWorkspaces";
import {
	buildDashboardSidebarPinnedWorkspaces,
	buildDashboardSidebarProjects,
	buildDashboardSidebarSessions,
	partitionSidebarWorkspacesByPinned,
	type SidebarProjectInput,
	type SidebarWorkspaceInput,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useDashboardSidebarData/buildDashboardSidebarProjects";
import type {
	DashboardSidebarHiddenProject,
	DashboardSidebarPinnedWorkspace,
	DashboardSidebarProject,
	DashboardSidebarProjectChild,
	DashboardSidebarWorkspace,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { filterDashboardSidebarProjects } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/utils/filterDashboardSidebarProjects";
import { filterDashboardSidebarProjectsByHost } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/utils/filterDashboardSidebarProjectsByHost";
import { sortDashboardSidebarProjects } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/utils/sortDashboardSidebarProjects";
import { isInCloudSidebar } from "renderer/routes/_authenticated/_dashboard/utils/buildCloudSidebar";
import { getVisibleSidebarWorkspaces } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal";
import type {
	SidebarProjectHostFilter,
	SidebarProjectSortMode,
} from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";
import {
	deriveTagFolders,
	EMPTY_TAG_FOLDER_CONTEXT,
	mergeTagFolderWorkspaces,
	type TagFolderSectionInput,
} from "renderer/routes/_authenticated/utils/workspaceTagFolders";

export const MACHINE_ID = "machine-laptop";
const REMOTE_HOST_ID = "machine-box";
const OFFLINE_HOST_ID = "machine-asleep";
export const USER_ID = "user-me";
const OTHER_USER_ID = "user-teammate";
const DATE = new Date("2026-11-01T00:00:00.000Z");
const at = (minutes: number) => new Date(DATE.getTime() + minutes * 60_000);

interface HostProject {
	id: string;
	name: string;
	repoOwner: string | null;
	repoName: string | null;
}

/** v2SidebarProjects: order, collapse and hidden, per project. */
interface ProjectPlacement {
	projectId: string;
	tabOrder: number;
	isCollapsed: boolean;
	isHidden: boolean;
}

interface HostWorkspace {
	id: string;
	projectId: string | null;
	hostId: string;
	type: SidebarWorkspaceInput["type"];
	name: string;
	branch: string;
	tags?: string[];
}

interface CloudWorkspace extends CloudSidebarWorkspaceInput {
	repo: string | null;
	tags?: string[];
}

/** v2WorkspaceLocalState: a row's place in the sidebar. */
interface WorkspacePlacement {
	workspaceId: string;
	projectId: string | null;
	tabOrder: number;
	sectionId?: string | null;
	isHidden?: boolean;
	pinnedAt?: number | null;
}

const DASH = "project-dashboard";
const PARADEV = "project-paradev";
const LANDING = "project-landing";
const HOSPITALS = "project-hospitals";
const HQ = "project-hq";
const GONE = "project-gone";

const hostProjects: HostProject[] = [
	{
		id: DASH,
		name: "autojobs-dashboard",
		repoOwner: "Autojobs-Me",
		repoName: "autojobs-dashboard",
	},
	{
		id: PARADEV,
		name: "tsenta-paradev",
		repoOwner: "Autojobs-Me",
		repoName: "tsenta-paradev",
	},
	{
		id: LANDING,
		name: "autojobs-landing",
		repoOwner: "Autojobs-Me",
		repoName: "autojobs-landing",
	},
	{
		id: HOSPITALS,
		name: "shyamhospitals-dashboard",
		repoOwner: "pulkitgupta2",
		repoName: "hr-attendance-salary-app",
	},
	{ id: HQ, name: "tsenta-hq", repoOwner: null, repoName: null },
];

const SCRAPER_REPO = "Autojobs-Me/job-scraper";
const MOBILE_REPO = "Autojobs-Me/autojobs-mobile";

const hostWorkspaces: HostWorkspace[] = [
	// autojobs-dashboard: loose local rows, one still being created.
	{
		id: "local-fix-prod-check",
		projectId: DASH,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "",
		branch: "pulkitgupta2/fix-prod-check",
	},
	{
		id: "local-creating",
		projectId: DASH,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "New workspace",
		branch: "pulkitgupta2/new",
	},
	{
		id: "local-main",
		projectId: DASH,
		hostId: MACHINE_ID,
		type: "local",
		name: "",
		branch: "main",
	},
	// Being deleted: both lists keep it until the host drops it.
	{
		id: "local-deleting",
		projectId: DASH,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "",
		branch: "pulkitgupta2/llm-cost-tracking",
	},
	// A remote host that is asleep: its row stays, marked offline.
	{
		id: "remote-offline-tse-2240",
		projectId: DASH,
		hostId: OFFLINE_HOST_ID,
		type: "worktree",
		name: "TSE-2240 Workday upload loops",
		branch: "fix/tse-2240",
		tags: ["fix-agents"],
	},
	// A remote host's row, in the agents folder beside cloud rows.
	{
		id: "remote-support-lead",
		projectId: DASH,
		hostId: REMOTE_HOST_ID,
		type: "worktree",
		name: "Support Lead",
		branch: "agents/support-lead",
		tags: ["agents"],
	},
	...["likhit", "saikiran", "ashutosh"].map(
		(who): HostWorkspace => ({
			id: `local-support-${who}`,
			projectId: DASH,
			hostId: MACHINE_ID,
			type: "worktree",
			name: `Support: ${who}`,
			branch: `support/${who}`,
			tags: ["support"],
		}),
	),
	{
		id: "local-tse-2206",
		projectId: DASH,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "TSE-2206 Google sign-in hangs",
		branch: "fix/tse-2206",
		tags: ["fix-agents"],
	},
	{
		id: "local-legacy-member",
		projectId: DASH,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "Old folder member",
		branch: "old/member",
	},
	{
		id: "local-pinned",
		projectId: DASH,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "Pinned local",
		branch: "pinned/local",
	},
	{
		id: "local-hidden-row",
		projectId: DASH,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "Removed from the sidebar",
		branch: "pulkitgupta2/mobile-hide-auto-apply",
	},
	// A collapsed project.
	{
		id: "local-paradev-batch2",
		projectId: PARADEV,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "",
		branch: "tsenta/batch2",
	},
	// Hidden projects' rows.
	{
		id: "local-landing-disclosure",
		projectId: LANDING,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "",
		branch: "pulkitgupta2/google-limited-use-disclosure",
	},
	{
		id: "local-hospitals-app",
		projectId: HOSPITALS,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "",
		branch: "pulkitgupta2/hr-attendance-salary-app",
	},
	// Pinned before its project was hidden: Pinned drops it with the project.
	{
		id: "local-hospitals-pinned",
		projectId: HOSPITALS,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "",
		branch: "pulkitgupta2/payroll-export",
	},
	{
		id: "local-hq-docs",
		projectId: HQ,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "",
		branch: "docs/refresh",
		tags: ["agents"],
	},
	// A row whose project has no placement row (deleted project).
	{
		id: "local-gone",
		projectId: GONE,
		hostId: MACHINE_ID,
		type: "worktree",
		name: "",
		branch: "gone",
	},
	// Sessions: loose, and one in the agents folder of the Sessions lane.
	{
		id: "session-scratch",
		projectId: null,
		hostId: MACHINE_ID,
		type: "session",
		name: "Scratch",
		branch: "",
	},
	{
		id: "session-agent-notes",
		projectId: null,
		hostId: MACHINE_ID,
		type: "session",
		name: "Agent notes",
		branch: "",
		tags: ["agents"],
	},
	{
		id: "session-pinned",
		projectId: null,
		hostId: MACHINE_ID,
		type: "session",
		name: "Pinned session",
		branch: "",
	},
];

const cloud = (
	id: string,
	name: string,
	options: {
		repo?: string | null;
		tags?: string[];
		minutes: number;
		createdBy?: string;
		status?: CloudWorkspace["status"];
	},
): CloudWorkspace => ({
	id,
	name,
	branch: `cloud/${id}`,
	createdAt: at(0),
	updatedAt: at(options.minutes),
	agentStatusAt: at(options.minutes),
	createdBy: { userId: options.createdBy ?? USER_ID, name: "Teammate", image: null },
	status: options.status ?? "ready",
	repo:
		options.repo === undefined
			? "Autojobs-Me/autojobs-dashboard"
			: options.repo,
	tags: options.tags,
});

const cloudWorkspaces: CloudWorkspace[] = [
	// autojobs-dashboard, loose.
	cloud("cloud-job-freshness", "Job freshness: old but still hiring", {
		minutes: 90,
	}),
	cloud("cloud-form-filling", "Form Filling Complaints and PRs", {
		minutes: 80,
	}),
	cloud("cloud-answering", "Answering Revamp", { minutes: 70 }),
	// autojobs-dashboard, agents folder.
	cloud("cloud-seo", "SEO", { tags: ["agents"], minutes: 60 }),
	cloud("cloud-creator-overview", "Creator Dashboard Overview", {
		tags: ["agents"],
		minutes: 59,
	}),
	cloud("cloud-transcripts", "Transcript Activity Review", {
		tags: ["agents"],
		minutes: 58,
	}),
	// Someone else's, which this user added to the sidebar.
	cloud("cloud-interview-emails", "Interview Complaint Emails", {
		tags: ["agents"],
		minutes: 57,
		createdBy: OTHER_USER_ID,
	}),
	// autojobs-dashboard, fix-agents folder; one still provisioning.
	cloud("cloud-tse-2239", "TSE-2239 Cisco Phenom applies", {
		tags: ["fix-agents"],
		minutes: 50,
	}),
	cloud("cloud-tse-2241", "TSE-2241 tailoring stops stapling", {
		tags: ["fix-agents"],
		minutes: 49,
	}),
	cloud("cloud-tse-2222", "TSE-2222 SuccessFactors fills sign-up", {
		tags: ["fix-agents"],
		minutes: 48,
		status: "provisioning",
	}),
	// Pinned.
	cloud("cloud-paradev-migration", "Paradev migration build", {
		minutes: 40,
	}),
	// Repos no host has: a stand-in project each, one with no known repo.
	cloud("cloud-scraper-status", "Job Scraper Status", {
		repo: SCRAPER_REPO,
		minutes: 30,
	}),
	cloud("cloud-no-repo", "Interview Tools", { repo: null, minutes: 20 }),
	// A stand-in project's row in a folder: the agents section takes it.
	cloud("cloud-norepo-agent", "Creator Dashboard Overview", {
		repo: null,
		tags: ["agents"],
		minutes: 19,
	}),
	// A hidden host project's repo, and a hidden stand-in's.
	cloud("cloud-landing-copy", "Landing copy", {
		repo: "Autojobs-Me/autojobs-landing",
		minutes: 15,
	}),
	cloud("cloud-mobile-release", "Mobile release", {
		repo: MOBILE_REPO,
		minutes: 10,
	}),
	// Neither list shows these: someone else's, not added; one with no
	// placement row yet; one removed from the sidebar.
	cloud("cloud-teammate", "Teammate's workspace", {
		minutes: 5,
		createdBy: OTHER_USER_ID,
	}),
	cloud("cloud-unplaced", "Created a second ago", { minutes: 4 }),
	cloud("cloud-hidden-row", "Removed cloud row", { minutes: 3 }),
];

/** cloudSidebarStore: cloud workspaces of others the user added. */
const cloudSidebarEntries: Record<string, { inSidebar: boolean }> = {
	"cloud-interview-emails": { inSidebar: true },
};

const scraperProjectId = cloudRepoProjectId(SCRAPER_REPO);
const noRepoProjectId = cloudRepoProjectId(null);
const mobileProjectId = cloudRepoProjectId(MOBILE_REPO);

const projectPlacements: ProjectPlacement[] = [
	{ projectId: DASH, tabOrder: 0, isCollapsed: false, isHidden: false },
	{ projectId: PARADEV, tabOrder: 1, isCollapsed: true, isHidden: false },
	{ projectId: LANDING, tabOrder: 2, isCollapsed: false, isHidden: true },
	{ projectId: HOSPITALS, tabOrder: 3, isCollapsed: false, isHidden: true },
	{ projectId: HQ, tabOrder: 4, isCollapsed: false, isHidden: true },
	{
		projectId: scraperProjectId,
		tabOrder: 5,
		isCollapsed: false,
		isHidden: false,
	},
	{
		projectId: noRepoProjectId,
		tabOrder: 6,
		isCollapsed: false,
		isHidden: false,
	},
	{
		projectId: mobileProjectId,
		tabOrder: 7,
		isCollapsed: false,
		isHidden: true,
	},
];

const LEGACY_FOLDER_ID = "0b1c6f1e-2a3b-4c5d-8e9f-0a1b2c3d4e5f";

/** v2SidebarSections: presentation rows (order, collapse, colour). */
const storedSections: TagFolderSectionInput[] = [
	{
		sectionId: `${DASH}:agents`,
		projectId: DASH,
		name: "agents",
		tag: "agents",
		tabOrder: 10,
		isCollapsed: false,
		color: null,
		createdAt: DATE,
	},
	{
		sectionId: `${DASH}:support`,
		projectId: DASH,
		name: "support",
		tag: "support",
		tabOrder: 11,
		isCollapsed: true,
		color: "#ef4444",
		createdAt: DATE,
	},
	{
		sectionId: `${DASH}:fix-agents`,
		projectId: DASH,
		name: "fix-agents",
		tag: "fix-agents",
		tabOrder: 12,
		isCollapsed: false,
		color: null,
		createdAt: DATE,
	},
	{
		sectionId: LEGACY_FOLDER_ID,
		projectId: DASH,
		name: "Old folder",
		tag: null,
		tabOrder: 13,
		isCollapsed: false,
		color: null,
		createdAt: DATE,
	},
];

const workspacePlacements: WorkspacePlacement[] = [
	{ workspaceId: "cloud-job-freshness", projectId: DASH, tabOrder: 0 },
	{ workspaceId: "cloud-form-filling", projectId: DASH, tabOrder: 1 },
	{ workspaceId: "cloud-answering", projectId: DASH, tabOrder: 2 },
	{ workspaceId: "local-fix-prod-check", projectId: DASH, tabOrder: 3 },
	{ workspaceId: "local-creating", projectId: DASH, tabOrder: 4 },
	{ workspaceId: "local-main", projectId: DASH, tabOrder: 5 },
	{ workspaceId: "local-deleting", projectId: DASH, tabOrder: 6 },
	{ workspaceId: "remote-support-lead", projectId: DASH, tabOrder: 20 },
	{ workspaceId: "cloud-seo", projectId: DASH, tabOrder: 21 },
	{ workspaceId: "cloud-creator-overview", projectId: DASH, tabOrder: 22 },
	{ workspaceId: "cloud-transcripts", projectId: DASH, tabOrder: 23 },
	{ workspaceId: "cloud-interview-emails", projectId: DASH, tabOrder: 24 },
	{ workspaceId: "local-support-likhit", projectId: DASH, tabOrder: 30 },
	{ workspaceId: "local-support-saikiran", projectId: DASH, tabOrder: 31 },
	{ workspaceId: "local-support-ashutosh", projectId: DASH, tabOrder: 32 },
	{ workspaceId: "cloud-tse-2239", projectId: DASH, tabOrder: 40 },
	{ workspaceId: "cloud-tse-2241", projectId: DASH, tabOrder: 41 },
	{ workspaceId: "local-tse-2206", projectId: DASH, tabOrder: 42 },
	{ workspaceId: "cloud-tse-2222", projectId: DASH, tabOrder: 43 },
	{ workspaceId: "remote-offline-tse-2240", projectId: DASH, tabOrder: 44 },
	{
		workspaceId: "local-legacy-member",
		projectId: DASH,
		tabOrder: 50,
		sectionId: LEGACY_FOLDER_ID,
	},
	{
		workspaceId: "local-pinned",
		projectId: DASH,
		tabOrder: 60,
		pinnedAt: 1,
	},
	{
		workspaceId: "cloud-paradev-migration",
		projectId: DASH,
		tabOrder: 61,
		pinnedAt: 2,
	},
	{
		workspaceId: "local-hidden-row",
		projectId: DASH,
		tabOrder: 62,
		isHidden: true,
	},
	{ workspaceId: "local-paradev-batch2", projectId: PARADEV, tabOrder: 0 },
	{ workspaceId: "local-landing-disclosure", projectId: LANDING, tabOrder: 0 },
	{ workspaceId: "cloud-landing-copy", projectId: LANDING, tabOrder: 1 },
	{ workspaceId: "local-hospitals-app", projectId: HOSPITALS, tabOrder: 0 },
	{
		workspaceId: "local-hospitals-pinned",
		projectId: HOSPITALS,
		tabOrder: 1,
		pinnedAt: 4,
	},
	{ workspaceId: "local-hq-docs", projectId: HQ, tabOrder: 0 },
	{
		workspaceId: "cloud-scraper-status",
		projectId: scraperProjectId,
		tabOrder: 0,
	},
	{ workspaceId: "cloud-no-repo", projectId: noRepoProjectId, tabOrder: 0 },
	{
		workspaceId: "cloud-norepo-agent",
		projectId: noRepoProjectId,
		tabOrder: 1,
	},
	{
		workspaceId: "cloud-mobile-release",
		projectId: mobileProjectId,
		tabOrder: 0,
	},
	{
		workspaceId: "cloud-hidden-row",
		projectId: DASH,
		tabOrder: 63,
		isHidden: true,
	},
	{ workspaceId: "local-gone", projectId: GONE, tabOrder: 0 },
	{ workspaceId: "session-scratch", projectId: null, tabOrder: 0 },
	{ workspaceId: "session-agent-notes", projectId: null, tabOrder: 1 },
	{
		workspaceId: "session-pinned",
		projectId: null,
		tabOrder: 2,
		pinnedAt: 3,
	},
];

/** workspace-creates: the rows a create or delete is still running for. */
const pendingTypes: Record<string, "insert" | "delete"> = {
	"local-creating": "insert",
	"local-deleting": "delete",
};
function pendingTransactionOf(workspaceId: string) {
	const type = pendingTypes[workspaceId];
	if (!type) return null;
	return {
		id: `tx-${workspaceId}`,
		workspaceId,
		type,
		state: "pending" as const,
		createdAt: DATE,
		updatedAt: DATE,
	};
}

/** Paradev's sidebar data: what useDashboardSidebarData returns. */
export interface StockSidebarData {
	groups: DashboardSidebarProject[];
	hiddenProjects: DashboardSidebarHiddenProject[];
	pinnedWorkspaces: DashboardSidebarPinnedWorkspace[];
	sessionChildren: DashboardSidebarProjectChild[];
}

/**
 * useDashboardSidebarData's composition of the builders, step for step
 * (hidden projects, cloud rows filed by repo, stand-ins, placement, pins,
 * sessions, cloud identity re-applied), over the fixture above.
 */
export function buildStockSidebarData(): StockSidebarData {
	const hostProjectsById = new Map(
		hostProjects.map((project) => [project.id, project]),
	);
	const orderedPlacements = [...projectPlacements].sort(
		(left, right) =>
			left.tabOrder - right.tabOrder ||
			left.projectId.localeCompare(right.projectId),
	);
	const placementById = new Map(
		orderedPlacements.map((row) => [row.projectId, row]),
	);
	const sidebarProjects: SidebarProjectInput[] = orderedPlacements.flatMap(
		(row) => {
			if (row.isHidden) return [];
			const project = hostProjectsById.get(row.projectId);
			if (!project) return [];
			return [
				{
					id: project.id,
					name: project.name,
					githubOwner: project.repoOwner,
					githubRepoName: project.repoName,
					iconUrl: null,
					color: null,
					createdAt: DATE,
					updatedAt: DATE,
					isCollapsed: row.isCollapsed,
				},
			];
		},
	);
	const visibleIds = new Set(sidebarProjects.map((project) => project.id));
	const cloudProjectTargets = [
		...sidebarProjects,
		...hostProjects
			.filter((project) => !visibleIds.has(project.id))
			.map((project) => ({
				id: project.id,
				githubOwner: project.repoOwner,
				githubRepoName: project.repoName,
			})),
	];
	const hiddenProjects: DashboardSidebarHiddenProject[] =
		orderedPlacements.flatMap((row) => {
			if (!row.isHidden) return [];
			const project = hostProjectsById.get(row.projectId);
			if (!project) return [];
			return [
				{ id: project.id, name: project.name, iconUrl: null, color: null },
			];
		});

	const shownCloudRows = cloudWorkspaces.filter((row) =>
		isInCloudSidebar(row, cloudSidebarEntries[row.id], USER_ID),
	);
	// TagFolderWorkspacesProvider: host tags, and the API's tags for the
	// cloud rows in the sidebar, scoped to the project their placement
	// row files them under.
	const placementProjectIds = new Map(
		workspacePlacements.map((row) => [row.workspaceId, row.projectId]),
	);
	const tagFolderWorkspaces = mergeTagFolderWorkspaces({
		hostWorkspaces,
		isSandboxHost: () => false,
		cloudWorkspaces: shownCloudRows,
		placementProjectIdOf: (workspaceId) => placementProjectIds.get(workspaceId),
	});
	const tagsById = new Map(
		tagFolderWorkspaces.map((workspace) => [workspace.id, workspace.tags]),
	);
	const sidebarSections = deriveTagFolders(
		storedSections,
		tagFolderWorkspaces,
		EMPTY_TAG_FOLDER_CONTEXT,
	).map((section) => ({
		id: section.sectionId,
		projectId: section.projectId,
		name: section.name,
		createdAt: section.createdAt,
		isCollapsed: section.isCollapsed,
		tabOrder: section.tabOrder,
		color: section.color,
		tag: section.tag,
	}));

	const cloudLayout = buildCloudSidebarWorkspaces({
		cloudWorkspaces: shownCloudRows,
		userId: USER_ID,
		projects: cloudProjectTargets,
		repoFullNameById: new Map(
			cloudWorkspaces.flatMap((row) =>
				row.repo ? [[row.id, row.repo] as const] : [],
			),
		),
		branchById: new Map(),
		pullRequestsById: new Map(),
		unknownRepoProjectName: "Cloud",
	});
	const cloudRowById = new Map<string, DashboardSidebarWorkspace>();
	for (const rows of cloudLayout.byProjectId.values()) {
		for (const row of rows) cloudRowById.set(row.id, row);
	}
	for (const repoProject of cloudLayout.repoProjects) {
		for (const row of repoProject.cloudWorkspaces) {
			cloudRowById.set(row.id, row);
		}
	}
	const standInProjectIds = new Set(
		cloudLayout.repoProjects.map((repoProject) => repoProject.id),
	);
	const standIns: SidebarProjectInput[] = cloudLayout.repoProjects.flatMap(
		(repoProject) => {
			const row = placementById.get(repoProject.id);
			if (row?.isHidden) return [];
			return [
				{
					id: repoProject.id,
					name: repoProject.name,
					githubOwner: repoProject.githubOwner,
					githubRepoName: repoProject.githubRepoName,
					iconUrl: repoProject.iconUrl,
					color: null,
					createdAt: repoProject.createdAt,
					updatedAt: repoProject.updatedAt,
					isCollapsed: row?.isCollapsed ?? false,
				},
			];
		},
	);
	const orderIndexById = new Map(
		orderedPlacements.map((row, index) => [row.projectId, index]),
	);
	const orderOf = (project: { id: string }) =>
		orderIndexById.get(project.id) ?? Number.MAX_SAFE_INTEGER;
	const builderProjects = [...sidebarProjects, ...standIns].sort(
		(left, right) => orderOf(left) - orderOf(right),
	);

	const hostWorkspacesById = new Map(
		hostWorkspaces.map((workspace) => [workspace.id, workspace]),
	);
	const orderedWorkspacePlacements = [...workspacePlacements].sort(
		(left, right) =>
			left.tabOrder - right.tabOrder ||
			left.workspaceId.localeCompare(right.workspaceId),
	);
	const rawSidebarWorkspaces = orderedWorkspacePlacements.flatMap((local) => {
		const host = hostWorkspacesById.get(local.workspaceId);
		const source = host
			? { ...host, taskId: null }
			: cloudRowById.get(local.workspaceId);
		if (!source) return [];
		return [
			{
				id: source.id,
				projectId: local.projectId,
				hostId: source.hostId,
				type: source.type,
				name: source.name,
				branch: source.branch,
				taskId: source.taskId,
				createdAt: DATE,
				updatedAt: DATE,
				lastActivityAt: null,
				tabOrder: local.tabOrder,
				sectionId: local.sectionId ?? null,
				tags: tagsById.get(local.workspaceId),
				isHidden: local.isHidden ?? false,
				pinnedAt: local.pinnedAt ?? null,
				hostIsOnline: source.hostId !== OFFLINE_HOST_ID,
				pendingTransaction: pendingTransactionOf(local.workspaceId),
			},
		];
	});
	const visible = getVisibleSidebarWorkspaces(rawSidebarWorkspaces);
	const { pinned, unpinned } = partitionSidebarWorkspacesByPinned(visible);
	const sessionRows = unpinned.filter((row) => row.projectId === null);
	const projectRows = unpinned.filter((row) => row.projectId !== null);
	const pullRequestsByWorkspaceId = new Map();

	const groups = applyCloudSidebarRows(
		buildDashboardSidebarProjects({
			sidebarProjects: builderProjects,
			sidebarSections,
			visibleSidebarWorkspaces: projectRows,
			machineId: MACHINE_ID,
			pullRequestsByWorkspaceId,
		}),
		cloudRowById,
		standInProjectIds,
	);
	const hiddenRepoProjects = cloudLayout.repoProjects.flatMap((repoProject) =>
		placementById.get(repoProject.id)?.isHidden
			? [
					{
						id: repoProject.id,
						name: repoProject.name,
						iconUrl: repoProject.iconUrl,
						color: null,
					},
				]
			: [],
	);
	const sessions = buildDashboardSidebarSessions({
		sessionSidebarWorkspaces: sessionRows,
		sidebarSections,
		machineId: MACHINE_ID,
		pullRequestsByWorkspaceId,
	});
	const pinnedWorkspaces = applyCloudSidebarPinnedRows(
		buildDashboardSidebarPinnedWorkspaces({
			pinnedSidebarWorkspaces: pinned,
			sidebarProjects: builderProjects,
			machineId: MACHINE_ID,
			pullRequestsByWorkspaceId,
		}),
		cloudRowById,
	);
	return {
		groups,
		hiddenProjects: [...hiddenProjects, ...hiddenRepoProjects],
		pinnedWorkspaces,
		sessionChildren: sessions.children,
	};
}

/** The list controls DashboardSidebar derives its views from. */
export interface StockSidebarControls {
	sortMode: SidebarProjectSortMode;
	hostFilter: SidebarProjectHostFilter;
	filterQuery: string;
}

/** DashboardSidebar's views of that data, which both lists are handed. */
export interface StockSidebarView extends StockSidebarData {
	/** Sorted, unfiltered: what ⌘1 to ⌘9 count. */
	sortedGroups: DashboardSidebarProject[];
	/** Sorted, then host and text filtered: the projects the list shows. */
	displayedGroups: DashboardSidebarProject[];
	hostFilter: SidebarProjectHostFilter;
}

export function buildStockSidebarView(
	controls: StockSidebarControls,
	data: StockSidebarData = buildStockSidebarData(),
): StockSidebarView {
	const sortedGroups =
		controls.sortMode === "manual"
			? data.groups
			: sortDashboardSidebarProjects(data.groups, controls.sortMode);
	const displayedGroups = filterDashboardSidebarProjects(
		filterDashboardSidebarProjectsByHost(sortedGroups, controls.hostFilter),
		controls.filterQuery,
	);
	return {
		...data,
		sortedGroups,
		displayedGroups,
		hostFilter: controls.hostFilter,
	};
}

/**
 * Where a row shows: "pinned", "sessions" (a session in no folder),
 * `repo:<projectId>` (a project's row in no folder), or `folder:<id>` (the
 * Paradev folder it is filed in).
 */
export type SidebarPlace = string;

/** Each place's rows, top to bottom. */
export type SidebarPlacement = Record<SidebarPlace, string[]>;

function place(placement: SidebarPlacement, key: string, id: string): void {
	placement[key] ??= [];
	placement[key].push(id);
}

function placeChildren(
	placement: SidebarPlacement,
	children: readonly DashboardSidebarProjectChild[],
	looseKey: string,
): void {
	for (const child of children) {
		if (child.type === "workspace") {
			place(placement, looseKey, child.workspace.id);
		} else {
			for (const workspace of child.section.workspaces) {
				place(placement, `folder:${child.section.id}`, workspace.id);
			}
		}
	}
}

/**
 * The rows the expanded stock list renders and where, all read from its
 * drag and drop provider (useSidebarDnd), as DashboardSidebar hands it the
 * data: the Pinned section's pinnedItems (every pin: the provider gets the
 * unfiltered pins, and the host filtered list DashboardSidebar also passes
 * the section only reaches the icon rail), the Sessions lane's items (the
 * unfiltered lane), and every displayed project's flat item list
 * (buildFlatItems: loose rows, and each folder's members, rendered even
 * while collapsed so they can animate).
 */
export function stockSidebarPlacement(
	view: StockSidebarView,
): SidebarPlacement {
	const placement: SidebarPlacement = {};
	for (const workspace of view.pinnedWorkspaces) {
		place(placement, "pinned", workspace.id);
	}
	placeChildren(placement, view.sessionChildren, "sessions");
	for (const project of view.displayedGroups) {
		placeChildren(placement, project.children, `repo:${project.id}`);
	}
	return placement;
}

/** Every workspace id of a project, loose or in a folder. */
export function projectWorkspaceIds(
	projects: readonly DashboardSidebarProject[],
	projectId: string,
): string[] {
	const project = projects.find((entry) => entry.id === projectId);
	if (!project) return [];
	return project.children.flatMap((child) =>
		child.type === "workspace"
			? [child.workspace.id]
			: child.section.workspaces.map((workspace) => workspace.id),
	);
}

export const FIXTURE_IDS = {
	DASH,
	PARADEV,
	LANDING,
	HOSPITALS,
	HQ,
	scraperProjectId,
	noRepoProjectId,
	mobileProjectId,
	LEGACY_FOLDER_ID,
} as const;
