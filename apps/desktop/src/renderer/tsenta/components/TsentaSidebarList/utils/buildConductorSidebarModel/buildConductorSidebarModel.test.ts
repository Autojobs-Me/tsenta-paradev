import { describe, expect, test } from "bun:test";
import type {
	DashboardSidebarProject,
	DashboardSidebarSection,
	DashboardSidebarWorkspace,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { buildConductorSidebarModel } from "./buildConductorSidebarModel";

const workspace = (id: string, projectId: string | null) =>
	({ id, projectId, name: id }) as DashboardSidebarWorkspace;

const folder = (
	id: string,
	projectId: string,
	workspaces: DashboardSidebarWorkspace[],
	overrides: Partial<DashboardSidebarSection> = {},
): DashboardSidebarSection => ({
	id,
	projectId,
	name: id.split(":")[1] ?? id,
	createdAt: new Date(0),
	isCollapsed: false,
	tabOrder: 0,
	color: null,
	workspaces,
	...overrides,
});

const project = (
	id: string,
	children: DashboardSidebarProject["children"],
): DashboardSidebarProject =>
	({ id, name: id, children }) as DashboardSidebarProject;

describe("buildConductorSidebarModel", () => {
	test("lifts folders out of their projects and keeps loose rows per repository", () => {
		const model = buildConductorSidebarModel({
			projects: [
				project("p1", [
					{ type: "workspace", workspace: workspace("a", "p1") },
					{
						type: "section",
						section: folder("p1:support", "p1", [workspace("b", "p1")]),
					},
					{ type: "workspace", workspace: workspace("c", "p1") },
				]),
			],
			sessionChildren: [],
		});
		expect(model.repos.map((repo) => repo.rows.map((row) => row.id))).toEqual([
			["a", "c"],
		]);
		expect(model.sections).toHaveLength(1);
		expect(model.sections[0]).toMatchObject({
			key: "tag:support",
			tag: "support",
			name: "support",
		});
		expect(model.sections[0]?.rows).toEqual([
			{
				workspace: workspace("b", "p1"),
				laneProjectId: "p1",
				folderId: "p1:support",
			},
		]);
	});

	test("merges the same folder tag across projects and the Sessions lane", () => {
		const model = buildConductorSidebarModel({
			projects: [
				project("p1", [
					{
						type: "section",
						section: folder("p1:support", "p1", [workspace("a", "p1")], {
							name: "Support",
							isCollapsed: true,
						}),
					},
				]),
				project("p2", [
					{
						type: "section",
						section: folder("p2:support", "p2", [workspace("b", "p2")], {
							isCollapsed: false,
						}),
					},
					{
						type: "section",
						section: folder("p2:fixes", "p2", []),
					},
				]),
			],
			sessionChildren: [
				{
					type: "section",
					section: folder("sessions:support", "sessions", [
						workspace("s", null),
					]),
				},
				{ type: "workspace", workspace: workspace("t", null) },
			],
		});
		expect(model.sections.map((section) => section.key)).toEqual([
			"tag:support",
			"tag:fixes",
		]);
		const support = model.sections[0];
		expect(support?.name).toBe("Support");
		// One open folder keeps the merged section open.
		expect(support?.isCollapsed).toBe(false);
		expect(support?.folders.map((entry) => entry.laneProjectId)).toEqual([
			"p1",
			"p2",
			null,
		]);
		expect(support?.rows.map((row) => row.workspace.id)).toEqual([
			"a",
			"b",
			"s",
		]);
		expect(model.sessions.map((row) => row.id)).toEqual(["t"]);
		expect(model.repos.map((repo) => repo.rows)).toEqual([[], []]);
	});

	test("keeps a legacy folder, which has no tag, as a section of its own", () => {
		const model = buildConductorSidebarModel({
			projects: [
				project("p1", [
					{
						type: "section",
						section: folder("0b1c6f1e-legacy", "p1", [workspace("a", "p1")]),
					},
				]),
			],
			sessionChildren: [],
		});
		expect(model.sections[0]).toMatchObject({
			key: "folder:0b1c6f1e-legacy",
			tag: null,
		});
	});
});
