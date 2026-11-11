import { describe, expect, test } from "bun:test";
import { createWorkspaceStore } from "@superset/panes";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import { seedRightTabs } from "./seedRightTabs";

const createPane = (kind: string) => ({
	kind,
	data: { kind } as unknown as PaneViewerData,
});

const kinds = (
	store: ReturnType<typeof createWorkspaceStore<PaneViewerData>>,
) =>
	store.getState().tabs.map((tab) =>
		Object.values(tab.panes)
			.map((pane) => pane.kind)
			.join(),
	);

describe("seedRightTabs", () => {
	test("an empty pane gets Conductor's tabs, the first selected", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		seedRightTabs(store, { sandbox: false, createPane });
		expect(kinds(store)).toEqual([
			"diff",
			"files",
			"browser",
			"terminal",
			"pages-list",
		]);
		expect(store.getState().activeTabId).toBe(
			store.getState().tabs[0]?.id ?? null,
		);
	});

	test("adds only missing kinds and keeps the active tab", () => {
		const store = createWorkspaceStore<PaneViewerData>();
		store.getState().addTab({ panes: [createPane("browser")] });
		const active = store.getState().activeTabId;
		seedRightTabs(store, { sandbox: true, createPane });
		expect(kinds(store)).toEqual([
			"browser",
			"diff",
			"files",
			"terminal",
			"pages-list",
			"desktop",
		]);
		expect(store.getState().activeTabId).toBe(active);
		seedRightTabs(store, { sandbox: true, createPane });
		expect(kinds(store)).toHaveLength(6);
	});
});
