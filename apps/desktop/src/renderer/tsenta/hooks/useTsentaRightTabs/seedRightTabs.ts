import type { CreatePaneInput, WorkspaceStore } from "@superset/panes";
import type { RightPaneKind } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/RightPaneNewTab/types";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import type { StoreApi } from "zustand/vanilla";

/** Conductor's right panel, in order. Desktop only exists on cloud boxes. */
export type RightTabKind = RightPaneKind | "changes-list";

export const RIGHT_TAB_KINDS: RightTabKind[] = [
	"changes-list",
	"files",
	"browser",
	"terminal",
	"pages-list",
	"desktop",
];

/**
 * Adds a tab for each kind the right pane has none of, keeping the tab the
 * user was on (or the first, when there was none). A tab's pane only mounts
 * once the tab is selected, so a terminal or browser starts on first open.
 */
export function seedRightTabs(
	store: StoreApi<WorkspaceStore<PaneViewerData>>,
	{
		sandbox,
		createPane,
	}: {
		sandbox: boolean;
		createPane: (kind: RightTabKind) => CreatePaneInput<PaneViewerData>;
	},
): void {
	dropSeededDiffTab(store);
	const before = store.getState();
	const present = new Set<string>(
		before.tabs.flatMap((tab) =>
			Object.values(tab.panes).map((pane) => pane.kind),
		),
	);
	const missing = RIGHT_TAB_KINDS.filter(
		(kind) => !present.has(kind) && (kind !== "desktop" || sandbox),
	);
	if (missing.length === 0) return;
	for (const kind of missing) {
		store.getState().addTab({ panes: [createPane(kind)], focus: false });
	}
	const first = store.getState().tabs[0];
	const active = before.activeTabId ?? first?.id;
	if (active) store.getState().setActiveTab(active);
}

/**
 * An earlier build seeded an empty diff pane as the Changes tab; the list
 * (changes-list) is that tab now and diffs open in the center, so it goes.
 */
function dropSeededDiffTab(
	store: StoreApi<WorkspaceStore<PaneViewerData>>,
): void {
	const state = store.getState();
	for (const tab of state.tabs) {
		const panes = Object.values(tab.panes);
		const only = panes.length === 1 ? panes[0] : undefined;
		if (only?.kind === "diff" && !(only.data as { path?: string }).path) {
			state.removeTab(tab.id, { intent: "remove" });
		}
	}
}

/** Selects the first tab holding a pane of `kind`; false when there is none. */
export function selectRightTab(
	store: StoreApi<WorkspaceStore<PaneViewerData>>,
	kind: RightTabKind,
): boolean {
	const state = store.getState();
	const tab = state.tabs.find((candidate) =>
		Object.values(candidate.panes).some((pane) => pane.kind === kind),
	);
	if (!tab) return false;
	state.setActiveTab(tab.id);
	return true;
}
