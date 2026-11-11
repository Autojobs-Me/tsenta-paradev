import type { WorkspaceStore } from "@superset/panes";
import { useEffect, useRef } from "react";
import { useV2UserPreferences } from "renderer/hooks/useV2UserPreferences";
import { createRightPane } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/RightPaneNewTab/paneOptions";
import { useDefaultBrowserUrl } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/useDefaultBrowserUrl";
import { useV2TerminalLauncher } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/useV2TerminalLauncher";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import { isConductorSkin } from "renderer/tsenta/skin";
import type { StoreApi } from "zustand/vanilla";
import { seedRightTabs } from "./seedRightTabs";

const TREE_DEFAULT_KEY = "tsenta-changes-tree-default";

/**
 * Under the skin the right sidebar opens on fixed tabs, as Conductor's panel
 * does: Changes (the list), Files, Browser, Terminal, Pages, and Desktop on cloud
 * boxes. A tab the user closed comes back the next time the sidebar opens.
 * The Changes list starts as a tree, once per machine.
 */
export function useTsentaRightTabs({
	store,
	isOpen,
	isReady,
	sandbox,
}: {
	store: StoreApi<WorkspaceStore<PaneViewerData>>;
	isOpen: boolean;
	isReady: boolean;
	sandbox: boolean;
}): void {
	const launcher = useV2TerminalLauncher();
	const browserUrl = useDefaultBrowserUrl();
	const latest = useRef({ launcher, browserUrl });
	latest.current = { launcher, browserUrl };
	const { setChangesViewMode } = useV2UserPreferences();

	useEffect(() => {
		if (!isConductorSkin() || !isOpen || !isReady) return;
		const { launcher, browserUrl } = latest.current;
		seedRightTabs(store, {
			sandbox,
			createPane: (kind) =>
				kind === "changes-list"
					? { kind, data: { kind } as PaneViewerData }
					: createRightPane(kind, {
							mintTerminalId: launcher.mint,
							browserUrl,
						}),
		});
	}, [store, isOpen, isReady, sandbox]);

	useEffect(() => {
		if (!isConductorSkin()) return;
		try {
			if (localStorage.getItem(TREE_DEFAULT_KEY)) return;
			localStorage.setItem(TREE_DEFAULT_KEY, "1");
		} catch {
			return;
		}
		setChangesViewMode("tree");
	}, [setChangesViewMode]);
}
