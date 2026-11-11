import type { CreatePaneInput, WorkspaceStore } from "@superset/panes";
import { createContext, useContext } from "react";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import { isConductorSkin } from "renderer/tsenta/skin";
import type { StoreApi } from "zustand/vanilla";

type PaneStore = StoreApi<WorkspaceStore<PaneViewerData>>;

const CenterStoreContext = createContext<PaneStore | null>(null);

/** Given to the right panel, so what it opens lands in the center, as in Conductor. */
export const TsentaCenterStoreProvider = CenterStoreContext.Provider;

/** The center pane store under the skin, inside the right panel; otherwise null. */
export function useTsentaCenterStore(): PaneStore | null {
	const store = useContext(CenterStoreContext);
	return isConductorSkin() ? store : null;
}

/** Shows `pane` in the first pane of its kind, or a new tab: one diff tab, as Conductor's All changes. */
export function openInCenter(
	store: PaneStore,
	pane: CreatePaneInput<PaneViewerData>,
): void {
	const state = store.getState();
	for (const tab of state.tabs) {
		for (const open of Object.values(tab.panes)) {
			if (open.kind !== pane.kind) continue;
			state.setPaneData({ paneId: open.id, data: pane.data });
			state.focusPane(open.id);
			return;
		}
	}
	state.addTab({ panes: [pane] });
}
