import { describe, expect, test } from "bun:test";
import type {
	DashboardSidebarProject,
	DashboardSidebarProjectChild,
	DashboardSidebarSection,
	DashboardSidebarWorkspace,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { getProjectChildrenWorkspaces } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/utils/projectChildren";
import { buildConductorShortcutOrder } from "./buildConductorShortcutOrder";

const workspace = (id: string, projectId: string | null) =>
	({ id, projectId, name: id }) as DashboardSidebarWorkspace;
const folder = (
	id: string,
	projectId: string,
	ids: string[],
	isCollapsed = false,
): DashboardSidebarSection => ({
	id,
	projectId,
	name: id,
	createdAt: new Date(0),
	isCollapsed,
	tabOrder: 0,
	color: null,
	workspaces: ids.map((wsId) =>
		workspace(wsId, projectId === "sessions" ? null : projectId),
	),
});
const project = (
	id: string,
	children: DashboardSidebarProjectChild[],
	isCollapsed = false,
) => ({ id, name: id, isCollapsed, children }) as DashboardSidebarProject;

describe("buildConductorShortcutOrder", () => {
	test("counts Pinned first, and hands no pinned rows to previous and next twice", () => {
		const order = buildConductorShortcutOrder({
			projects: [
				project("p1", [{ type: "workspace", workspace: workspace("a", "p1") }]),
			],
			sessionChildren: [],
			pinnedWorkspaces: [workspace("x", "p1"), workspace("y", null)],
		});
		expect(
			order.groups.flatMap((group) =>
				getProjectChildrenWorkspaces(group.children).map((row) => row.id),
			),
		).toEqual(["x", "y", "a"]);
		expect(order.pinnedWorkspaces).toEqual([]);
		// The pinned group is no project, so a jump there toggles none.
		expect(order.groups[0]?.id).toBe("tsenta:pinned");
		expect(order.groups[0]?.isCollapsed).toBe(false);
	});

	test("counts sections, then Sessions rows, then each repository, as the list shows them", () => {
		const order = buildConductorShortcutOrder({
			projects: [
				project(
					"p1",
					[
						{ type: "workspace", workspace: workspace("a", "p1") },
						{
							type: "section",
							section: folder("p1:support", "p1", ["b"], true),
						},
					],
					true,
				),
				project("p2", [
					{ type: "workspace", workspace: workspace("c", "p2") },
					{ type: "section", section: folder("p2:support", "p2", ["d"]) },
					{ type: "section", section: folder("p2:fixes", "p2", ["e"]) },
				]),
			],
			sessionChildren: [
				{ type: "workspace", workspace: workspace("s", null) },
				{
					type: "section",
					section: folder("sessions:fixes", "sessions", ["t"]),
				},
			],
		});
		expect(
			order.groups.flatMap((group) =>
				getProjectChildrenWorkspaces(group.children).map((row) => row.id),
			),
		).toEqual(["b", "d", "e", "t", "s", "a", "c"]);
		expect(order.sessionWorkspaces).toEqual([]);
		expect(order.sessionChildren).toEqual([]);
		// Slices keep the project's id; only repository slices carry its
		// collapse, and the folder keeps its own.
		expect(order.groups.map((group) => [group.id, group.isCollapsed])).toEqual([
			["p1", false],
			["p2", false],
			["p2", false],
			["sessions", false],
			["sessions", false],
			["p1", true],
			["p2", false],
		]);
		const first = order.groups[0]?.children[0];
		expect(first?.type === "section" && first.section.isCollapsed).toBe(true);
	});
});
