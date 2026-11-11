import type { RendererContext } from "@superset/panes";
import { useCallback } from "react";
import {
	openInCenter,
	useTsentaCenterStore,
} from "renderer/tsenta/providers/TsentaCenterStore";
import { useChangesTab } from "../../../../components/WorkspaceSidebar/hooks/useChangesTab";
import type {
	DiffPaneData,
	FilePaneData,
	PaneViewerData,
} from "../../../../types";
import { openBesidePane } from "../../../../utils/openBesidePane";
import { openFileFromTree } from "../../../../utils/openFileFromTree";
import { useDiffPaneTarget } from "../../../useDiffPaneTarget";

interface ChangesListPaneProps {
	context: RendererContext<PaneViewerData>;
	workspaceId: string;
}

export function ChangesListPane({
	context,
	workspaceId,
}: ChangesListPaneProps) {
	const { store } = context;
	const paneId = context.pane.id;
	const selectedDiffTarget = useDiffPaneTarget(store);

	// tsenta:conductor: from the right panel, diffs and files open in the center.
	const centerStore = useTsentaCenterStore();
	const handleSelectFile = useCallback(
		(path: string, openInNewTab?: boolean, changeKey?: string) => {
			const pane = {
				kind: "diff",
				data: {
					path,
					changeKey,
					collapsedFiles: [],
					focusTick: Date.now(),
				} as DiffPaneData,
			};
			if (centerStore) return openInCenter(centerStore, pane);
			openBesidePane(store, paneId, pane, openInNewTab);
		},
		[centerStore, store, paneId],
	);

	const handleOpenFile = useCallback(
		(filePath: string, openInNewTab?: boolean) => {
			if (centerStore) {
				return openFileFromTree({
					store: centerStore,
					filePath,
					pin: openInNewTab,
				});
			}
			openBesidePane(
				store,
				paneId,
				{ kind: "file", data: { filePath, mode: "editor" } as FilePaneData },
				openInNewTab,
			);
		},
		[centerStore, store, paneId],
	);

	const changesTab = useChangesTab({
		workspaceId,
		selectedDiffTarget,
		onSelectFile: handleSelectFile,
		onOpenFile: handleOpenFile,
	});

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			{changesTab.content}
		</div>
	);
}
