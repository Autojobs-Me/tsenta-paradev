import { describe, expect, test } from "bun:test";
import {
	buildConductorSidebarModel,
	type ConductorSidebarModel,
} from "./buildConductorSidebarModel";
import {
	buildStockSidebarData,
	buildStockSidebarView,
	FIXTURE_IDS,
	projectWorkspaceIds,
	type SidebarPlacement,
	type StockSidebarControls,
	type StockSidebarView,
	stockSidebarPlacement,
} from "./fixtures/stockSidebar";

const { DASH, PARADEV, LANDING, HOSPITALS, HQ, mobileProjectId } = FIXTURE_IDS;

/** What TsentaSidebarList hands the model: DashboardSidebar's own views. */
function conductorModel(view: StockSidebarView): ConductorSidebarModel {
	return buildConductorSidebarModel({
		projects: view.displayedGroups,
		sessionChildren: view.sessionChildren,
		pinnedWorkspaces: view.pinnedWorkspaces,
	});
}

/** The rows the Conductor list renders, and where, top to bottom. */
function conductorPlacement(model: ConductorSidebarModel): SidebarPlacement {
	const placement: SidebarPlacement = {};
	const put = (key: string, id: string) => {
		placement[key] ??= [];
		placement[key].push(id);
	};
	for (const workspace of model.pinned) put("pinned", workspace.id);
	for (const section of model.sections) {
		for (const row of section.rows)
			put(`folder:${row.folderId}`, row.workspace.id);
	}
	for (const workspace of model.sessions) put("sessions", workspace.id);
	for (const repo of model.repos) {
		for (const workspace of repo.rows)
			put(`repo:${repo.project.id}`, workspace.id);
	}
	return placement;
}

const allIds = (placement: SidebarPlacement) => Object.values(placement).flat();

const controls: StockSidebarControls[] = (
	["manual", "active", "created"] as const
).flatMap((sortMode) =>
	(["all", "local", "cloud"] as const).flatMap((hostFilter) =>
		["", "tse"].map((filterQuery) => ({ sortMode, hostFilter, filterQuery })),
	),
);

describe("Conductor sidebar parity with the stock sidebar", () => {
	const data = buildStockSidebarData();

	test.each(
		controls,
	)("shows the stock list's rows, each once, in the same place and order (sort $sortMode, show $hostFilter, filter '$filterQuery')", (control) => {
		const view = buildStockSidebarView(control, data);
		const stock = stockSidebarPlacement(view);
		const conductor = conductorPlacement(conductorModel(view));
		expect(conductor).toEqual(stock);
		const ids = allIds(conductor);
		expect(new Set(ids).size).toBe(ids.length);
	});

	const view = buildStockSidebarView({
		sortMode: "manual",
		hostFilter: "all",
		filterQuery: "",
	});
	const model = conductorModel(view);
	const placement = conductorPlacement(model);
	const shown = new Set(allIds(placement));

	test("shows cloud rows loose, in folders, pinned and under stand-in projects", () => {
		expect(placement[`repo:${DASH}`]).toEqual([
			"cloud-job-freshness",
			"cloud-form-filling",
			"cloud-answering",
			"local-fix-prod-check",
			"local-creating",
			"local-main",
		]);
		expect(placement[`folder:${DASH}:agents`]).toEqual([
			"remote-support-lead",
			"cloud-seo",
			"cloud-creator-overview",
			"cloud-transcripts",
			"cloud-interview-emails",
		]);
		expect(placement[`folder:${DASH}:fix-agents`]).toEqual([
			"cloud-tse-2239",
			"cloud-tse-2241",
			"local-tse-2206",
			"cloud-tse-2222",
		]);
		expect(placement.pinned).toEqual([
			"local-pinned",
			"cloud-paradev-migration",
		]);
		expect(placement[`repo:${FIXTURE_IDS.scraperProjectId}`]).toEqual([
			"cloud-scraper-status",
		]);
		expect(placement[`repo:${FIXTURE_IDS.noRepoProjectId}`]).toEqual([
			"cloud-no-repo",
		]);
		// Cloud rows keep the cloud identity their row behaviours key on.
		const seo = model.sections
			.flatMap((section) => section.rows)
			.find((row) => row.workspace.id === "cloud-seo")?.workspace;
		expect(seo).toMatchObject({ hostType: "cloud", hostId: "cloud-seo" });
		const provisioning = model.sections
			.flatMap((section) => section.rows)
			.find((row) => row.workspace.id === "cloud-tse-2222")?.workspace;
		expect(provisioning?.sandboxStatus).toBe("provisioning");
		expect(model.pinned[1]).toMatchObject({
			hostType: "cloud",
			projectName: "autojobs-dashboard",
		});
		expect(
			model.repos.find(
				(repo) => repo.project.id === FIXTURE_IDS.scraperProjectId,
			)?.project.kind,
		).toBe("cloud-repo");
	});

	test("files a folder's rows from every project and the Sessions lane into one section", () => {
		const agents = model.sections.find(
			(section) => section.key === "tag:agents",
		);
		expect(agents?.rows.map((row) => row.workspace.id)).toEqual([
			"remote-support-lead",
			"cloud-seo",
			"cloud-creator-overview",
			"cloud-transcripts",
			"cloud-interview-emails",
			"session-agent-notes",
		]);
		expect(model.sections.map((section) => section.key)).toEqual([
			"tag:agents",
			"tag:support",
			"tag:fix-agents",
			`folder:${FIXTURE_IDS.LEGACY_FOLDER_ID}`,
		]);
		expect(model.sessions.map((workspace) => workspace.id)).toEqual([
			"session-scratch",
		]);
		// A collapsed folder still holds its rows (hidden, not dropped), as
		// the stock list's do.
		const support = model.sections.find(
			(section) => section.key === "tag:support",
		);
		expect(support?.isCollapsed).toBe(true);
		expect(support?.rows).toHaveLength(3);
		// A collapsed project still holds its rows too.
		const paradev = model.repos.find((repo) => repo.project.id === PARADEV);
		expect(paradev?.project.isCollapsed).toBe(true);
		expect(paradev?.rows.map((workspace) => workspace.id)).toEqual([
			"local-paradev-batch2",
		]);
	});

	test("hides the projects stock hides, and lists them for the hidden-projects control", () => {
		expect(view.hiddenProjects.map((project) => project.name)).toEqual([
			"autojobs-landing",
			"shyamhospitals-dashboard",
			"tsenta-hq",
			"autojobs-mobile",
		]);
		const hiddenIds = new Set([LANDING, HOSPITALS, HQ, mobileProjectId]);
		expect(
			model.repos.filter((repo) => hiddenIds.has(repo.project.id)),
		).toEqual([]);
		for (const hiddenRow of [
			"local-landing-disclosure",
			"cloud-landing-copy",
			"local-hospitals-app",
			"local-hq-docs",
			"cloud-mobile-release",
		]) {
			expect(shown.has(hiddenRow)).toBe(false);
		}
		// Nor does any stock project list them.
		for (const projectId of hiddenIds) {
			expect(projectWorkspaceIds(view.displayedGroups, projectId)).toEqual([]);
		}
	});

	test("leaves out the rows the stock list leaves out", () => {
		for (const id of [
			"cloud-teammate",
			"cloud-unplaced",
			"cloud-hidden-row",
			"local-hidden-row",
			"local-gone",
		]) {
			expect(shown.has(id)).toBe(false);
		}
	});

	test("keeps every pin under the local and cloud filter, as the stock list does", () => {
		for (const hostFilter of ["local", "cloud"] as const) {
			const filtered = buildStockSidebarView({
				sortMode: "manual",
				hostFilter,
				filterQuery: "",
			});
			expect(stockSidebarPlacement(filtered).pinned).toEqual(placement.pinned);
			expect(
				conductorModel(filtered).pinned.map((workspace) => workspace.id),
			).toEqual(placement.pinned);
		}
	});
});
