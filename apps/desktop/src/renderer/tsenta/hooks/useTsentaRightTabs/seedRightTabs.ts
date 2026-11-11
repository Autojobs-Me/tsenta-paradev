import type { CreatePaneInput, WorkspaceStore } from "@superset/panes";
import type { RightPaneKind } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/RightPaneNewTab/types";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import type { StoreApi } from "zustand/vanilla";

/** Conductor's right panel, in order. Desktop only exists on cloud boxes. */
export const RIGHT_TAB_KINDS: RightPaneKind[] = [
	"diff",
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
		createPane: (kind: RightPaneKind) => CreatePaneInput<PaneViewerData>;
	},
): void {
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
