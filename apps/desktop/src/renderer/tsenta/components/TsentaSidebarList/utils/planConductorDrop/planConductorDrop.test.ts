import { describe, expect, test } from "bun:test";
import type {
	DashboardSidebarProjectChild,
	DashboardSidebarSection,
	DashboardSidebarWorkspace,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { buildConductorSidebarModel } from "../buildConductorSidebarModel";
import {
	buildStockSidebarView,
	FIXTURE_IDS,
} from "../buildConductorSidebarModel/fixtures/stockSidebar";
import {
	type ConductorDropContext,
	planConductorDrop,
} from "./planConductorDrop";

const workspace = (id: string, projectId: string | null) =>
	({ id, projectId, name: id }) as DashboardSidebarWorkspace;

const folder = (
	id: string,
	projectId: string,
	ids: string[],
): DashboardSidebarSection => ({
	id,
	projectId,
	name: id,
	createdAt: new Date(0),
	isCollapsed: false,
	tabOrder: 0,
	color: null,
	workspaces: ids.map((wsId) =>
		workspace(wsId, projectId === "sessions" ? null : projectId),
	),
});

// p1: a, [support: b, c], d    p2: [support: e], f    sessions: s
const p1: DashboardSidebarProjectChild[] = [
	{ type: "workspace", workspace: workspace("a", "p1") },
	{ type: "section", section: folder("p1:support", "p1", ["b", "c"]) },
	{ type: "workspace", workspace: workspace("d", "p1") },
];
const p2: DashboardSidebarProjectChild[] = [
	{ type: "section", section: folder("p2:support", "p2", ["e"]) },
	{ type: "section", section: folder("legacy-uuid", "p2", []) },
	{ type: "workspace", workspace: workspace("f", "p2") },
];
const sessions: DashboardSidebarProjectChild[] = [
	{ type: "workspace", workspace: workspace("s", null) },
];
const model = buildConductorSidebarModel({
	projects: [
		{ id: "p1", children: p1 },
		{ id: "p2", children: p2 },
	] as never,
	sessionChildren: sessions,
});
const context: ConductorDropContext = {
	pinned: [
		{ workspaceId: "x", projectId: "p1" },
		{ workspaceId: "y", projectId: "p2" },
	],
	sections: model.sections,
	laneChildren: (laneProjectId) =>
		laneProjectId === "p1"
			? p1
			: laneProjectId === "p2"
				? p2
				: laneProjectId === null
					? sessions
					: null,
};
const loose = (id: string, laneProjectId: string | null) => ({
	workspaceId: id,
	laneProjectId,
	isPinned: false,
});

describe("planConductorDrop", () => {
	test("pins a row at the pointer's place in Pinned", () => {
		expect(
			planConductorDrop(
				loose("a", "p1"),
				{ kind: "pinned", overId: "y", placement: "before" },
				context,
			),
		).toEqual({
			type: "pin",
			pins: [
				{ workspaceId: "x", projectId: "p1" },
				{ workspaceId: "a", projectId: "p1" },
				{ workspaceId: "y", projectId: "p2" },
			],
		});
	});

	test("reorders Pinned, and ignores a pinned row dropped back on the section", () => {
		const pinnedX = { workspaceId: "x", laneProjectId: "p1", isPinned: true };
		expect(
			planConductorDrop(
				pinnedX,
				{ kind: "pinned", overId: "y", placement: "after" },
				context,
			),
		).toEqual({
			type: "pin",
			pins: [
				{ workspaceId: "y", projectId: "p2" },
				{ workspaceId: "x", projectId: "p1" },
			],
		});
		expect(planConductorDrop(pinnedX, { kind: "pinned" }, context)).toBeNull();
		expect(
			planConductorDrop(
				pinnedX,
				{ kind: "pinned", overId: "y", placement: "before" },
				context,
			),
		).toBeNull();
	});

	test("files a loose row into its project's folder by the pointer", () => {
		expect(
			planConductorDrop(
				loose("a", "p1"),
				{
					kind: "section",
					sectionKey: "tag:support",
					overId: "c",
					placement: "before",
				},
				context,
			),
		).toEqual({
			type: "folder",
			laneProjectId: "p1",
			sectionId: "p1:support",
			workspaceIds: ["b", "a", "c"],
			unpin: false,
		});
	});

	test("files a row from another project under the section's tag", () => {
		expect(
			planConductorDrop(
				loose("f", "p2"),
				{ kind: "section", sectionKey: "tag:support", overId: "b" },
				context,
			),
		).toMatchObject({
			type: "folder",
			laneProjectId: "p2",
			sectionId: "p2:support",
			// "b" is p1's, so the p2 row goes to the end of p2's folder.
			workspaceIds: ["e", "f"],
		});
		expect(
			planConductorDrop(
				loose("s", null),
				{ kind: "section", sectionKey: "tag:support" },
				context,
			),
		).toMatchObject({
			type: "folder",
			laneProjectId: null,
			sectionId: "sessions:support",
			workspaceIds: ["s"],
		});
	});

	test("never files a row into another project's legacy folder", () => {
		expect(
			planConductorDrop(
				loose("a", "p1"),
				{ kind: "section", sectionKey: "folder:legacy-uuid" },
				context,
			),
		).toBeNull();
	});

	test("unpins a pinned row dropped into a folder", () => {
		expect(
			planConductorDrop(
				{ workspaceId: "x", laneProjectId: "p1", isPinned: true },
				{ kind: "section", sectionKey: "tag:support" },
				context,
			),
		).toEqual({
			type: "folder",
			laneProjectId: "p1",
			sectionId: "p1:support",
			workspaceIds: ["b", "c", "x"],
			unpin: true,
		});
	});

	test("reorders inside a folder and ignores a drop that changes nothing", () => {
		expect(
			planConductorDrop(
				loose("c", "p1"),
				{
					kind: "section",
					sectionKey: "tag:support",
					overId: "b",
					placement: "before",
				},
				context,
			),
		).toMatchObject({ type: "folder", workspaceIds: ["c", "b"] });
		expect(
			planConductorDrop(
				loose("c", "p1"),
				{
					kind: "section",
					sectionKey: "tag:support",
					overId: "b",
					placement: "after",
				},
				context,
			),
		).toBeNull();
		expect(
			planConductorDrop(
				loose("c", "p1"),
				{ kind: "section", sectionKey: "tag:support" },
				context,
			),
		).toBeNull();
	});

	test("takes a row out of its folder to its repository, by the pointer or below the folder", () => {
		expect(
			planConductorDrop(
				loose("b", "p1"),
				{
					kind: "loose",
					laneProjectId: "p1",
					overId: "a",
					placement: "before",
				},
				context,
			),
		).toEqual({
			type: "loose",
			laneProjectId: "p1",
			items: [
				{ type: "workspace", id: "b" },
				{ type: "workspace", id: "a" },
				{ type: "section", id: "p1:support" },
				{ type: "workspace", id: "d" },
			],
			unpin: false,
		});
		expect(
			planConductorDrop(
				loose("b", "p1"),
				{ kind: "loose", laneProjectId: "p1" },
				context,
			),
		).toMatchObject({
			items: [
				{ type: "workspace", id: "a" },
				{ type: "section", id: "p1:support" },
				{ type: "workspace", id: "b" },
				{ type: "workspace", id: "d" },
			],
		});
	});

	test("keeps a workspace in its project", () => {
		expect(
			planConductorDrop(
				loose("b", "p1"),
				{ kind: "loose", laneProjectId: "p2", overId: "f" },
				context,
			),
		).toBeNull();
		// The flat list takes it back to its own lane; a row of another
		// project gives no position.
		expect(
			planConductorDrop(
				loose("b", "p1"),
				{ kind: "loose", overId: "f", overLaneProjectId: "p2" },
				context,
			),
		).toMatchObject({ type: "loose", laneProjectId: "p1" });
	});

	test("reorders loose rows, unpins into the lane, and skips no-op drops", () => {
		expect(
			planConductorDrop(
				loose("d", "p1"),
				{
					kind: "loose",
					laneProjectId: "p1",
					overId: "a",
					placement: "before",
				},
				context,
			),
		).toMatchObject({
			items: [
				{ type: "workspace", id: "d" },
				{ type: "workspace", id: "a" },
				{ type: "section", id: "p1:support" },
			],
		});
		expect(
			planConductorDrop(
				loose("d", "p1"),
				{ kind: "loose", laneProjectId: "p1" },
				context,
			),
		).toBeNull();
		expect(
			planConductorDrop(
				{ workspaceId: "x", laneProjectId: "p1", isPinned: true },
				{ kind: "loose", laneProjectId: "p1" },
				context,
			),
		).toMatchObject({
			type: "loose",
			unpin: true,
			items: [
				{ type: "workspace", id: "a" },
				{ type: "section", id: "p1:support" },
				{ type: "workspace", id: "d" },
				{ type: "workspace", id: "x" },
			],
		});
	});
});

describe("planConductorDrop with cloud rows", () => {
	// A real sidebar from Paradev's builders: cloud rows loose, in folders,
	// pinned and under a stand-in project, as the Conductor list gets them.
	const view = buildStockSidebarView({
		sortMode: "manual",
		hostFilter: "all",
		filterQuery: "",
	});
	const cloudModel = buildConductorSidebarModel({
		projects: view.displayedGroups,
		sessionChildren: view.sessionChildren,
		pinnedWorkspaces: view.pinnedWorkspaces,
	});
	const cloudContext: ConductorDropContext = {
		pinned: view.pinnedWorkspaces.map((workspace) => ({
			workspaceId: workspace.id,
			projectId: workspace.projectId,
		})),
		sections: cloudModel.sections,
		laneChildren: (laneProjectId) =>
			laneProjectId === null
				? view.sessionChildren
				: (view.displayedGroups.find((project) => project.id === laneProjectId)
						?.children ?? null),
	};
	const { DASH, PARADEV, scraperProjectId } = FIXTURE_IDS;

	test("files a loose cloud row into a folder beside host and cloud rows", () => {
		expect(
			planConductorDrop(
				loose("cloud-job-freshness", DASH),
				{
					kind: "section",
					sectionKey: "tag:agents",
					overId: "cloud-seo",
					placement: "before",
				},
				cloudContext,
			),
		).toEqual({
			type: "folder",
			laneProjectId: DASH,
			sectionId: `${DASH}:agents`,
			workspaceIds: [
				"remote-support-lead",
				"cloud-job-freshness",
				"cloud-seo",
				"cloud-creator-overview",
				"cloud-transcripts",
				"cloud-interview-emails",
			],
			unpin: false,
		});
	});

	test("files a stand-in project's cloud row under the section's tag", () => {
		expect(
			planConductorDrop(
				loose("cloud-scraper-status", scraperProjectId),
				{ kind: "section", sectionKey: "tag:fix-agents" },
				cloudContext,
			),
		).toEqual({
			type: "folder",
			laneProjectId: scraperProjectId,
			sectionId: `${scraperProjectId}:fix-agents`,
			workspaceIds: ["cloud-scraper-status"],
			unpin: false,
		});
	});

	test("takes a cloud row out of its folder to its repository, below the folder", () => {
		expect(
			planConductorDrop(
				loose("cloud-tse-2239", DASH),
				{ kind: "loose", laneProjectId: DASH },
				cloudContext,
			),
		).toEqual({
			type: "loose",
			laneProjectId: DASH,
			unpin: false,
			items: [
				{ type: "workspace", id: "cloud-job-freshness" },
				{ type: "workspace", id: "cloud-form-filling" },
				{ type: "workspace", id: "cloud-answering" },
				{ type: "workspace", id: "local-fix-prod-check" },
				{ type: "workspace", id: "local-creating" },
				{ type: "workspace", id: "local-main" },
				{ type: "workspace", id: "local-deleting" },
				{ type: "section", id: `${DASH}:agents` },
				{ type: "section", id: `${DASH}:support` },
				{ type: "section", id: `${DASH}:fix-agents` },
				{ type: "workspace", id: "cloud-tse-2239" },
				{ type: "section", id: FIXTURE_IDS.LEGACY_FOLDER_ID },
			],
		});
		// Never into another project's repository.
		expect(
			planConductorDrop(
				loose("cloud-tse-2239", DASH),
				{ kind: "loose", laneProjectId: PARADEV },
				cloudContext,
			),
		).toBeNull();
	});

	test("pins a cloud row, and unpins the pinned cloud row into a folder", () => {
		expect(
			planConductorDrop(
				loose("cloud-seo", DASH),
				{
					kind: "pinned",
					overId: "cloud-paradev-migration",
					placement: "after",
				},
				cloudContext,
			),
		).toEqual({
			type: "pin",
			pins: [
				{ workspaceId: "local-pinned", projectId: DASH },
				{ workspaceId: "cloud-paradev-migration", projectId: DASH },
				{ workspaceId: "cloud-seo", projectId: DASH },
				{ workspaceId: "session-pinned", projectId: null },
			],
		});
		expect(
			planConductorDrop(
				{
					workspaceId: "cloud-paradev-migration",
					laneProjectId: DASH,
					isPinned: true,
				},
				{ kind: "section", sectionKey: "tag:agents" },
				cloudContext,
			),
		).toMatchObject({
			type: "folder",
			sectionId: `${DASH}:agents`,
			unpin: true,
		});
	});
});
