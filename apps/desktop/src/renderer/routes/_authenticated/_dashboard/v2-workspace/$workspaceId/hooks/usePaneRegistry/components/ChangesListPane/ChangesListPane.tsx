import type { RendererContext } from "@superset/panes";
import { useCallback } from "react";
// tsenta:conductor: the workspace's pull request leads the Changes pane.
import { TsentaChangesPrBar } from "renderer/tsenta/components/TsentaChangesPrBar";
import { isConductorSkin } from "renderer/tsenta/skin";
import { useChangesTab } from "../../../../components/WorkspaceSidebar/hooks/useChangesTab";
import type {
	DiffPaneData,
	FilePaneData,
	PaneViewerData,
} from "../../../../types";
import { openBesidePane } from "../../../../utils/openBesidePane";
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

	const handleSelectFile = useCallback(
		(path: string, openInNewTab?: boolean, changeKey?: string) => {
			openBesidePane(
				store,
				paneId,
				{
					kind: "diff",
					data: {
						path,
						changeKey,
						collapsedFiles: [],
						focusTick: Date.now(),
					} as DiffPaneData,
				},
				openInNewTab,
			);
		},
		[store, paneId],
	);

	const handleOpenFile = useCallback(
		(filePath: string, openInNewTab?: boolean) => {
			openBesidePane(
				store,
				paneId,
				{ kind: "file", data: { filePath, mode: "editor" } as FilePaneData },
				openInNewTab,
			);
		},
		[store, paneId],
	);

	const changesTab = useChangesTab({
		workspaceId,
		selectedDiffTarget,
		onSelectFile: handleSelectFile,
		onOpenFile: handleOpenFile,
	});

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			{isConductorSkin() && (
				<TsentaChangesPrBar workspaceId={workspaceId} store={store} />
			)}
			{changesTab.content}
		</div>
	);
}
