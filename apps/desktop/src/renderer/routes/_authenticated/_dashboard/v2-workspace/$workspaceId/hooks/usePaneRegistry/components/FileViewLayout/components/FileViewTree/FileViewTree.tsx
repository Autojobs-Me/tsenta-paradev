import type { RendererContext } from "@superset/panes";
import { useCallback } from "react";
import { useTsentaCenterStore } from "renderer/tsenta/providers/TsentaCenterStore";
import { FilesTab } from "../../../../../../components/WorkspaceSidebar/components/FilesTab";
import { useWorkspaceGitStatus } from "../../../../../../providers/WorkspaceGitStatusProvider";
import type { FilePaneData, PaneViewerData } from "../../../../../../types";
import { openFileFromTree } from "../../../../../../utils/openFileFromTree";
import { RepoPicker } from "./components/RepoPicker";

interface FileViewTreeProps {
	context: RendererContext<PaneViewerData>;
	workspaceId: string;
	onSearch?: () => void;
}

export function FileViewTree({
	context,
	workspaceId,
	onSearch,
}: FileViewTreeProps) {
	const { store } = context;
	const paneId = context.pane.id;
	const gitStatus = useWorkspaceGitStatus();
	const selectedFilePath =
		context.pane.kind === "file"
			? (context.pane.data as FilePaneData).filePath
			: undefined;

	// tsenta:conductor: from the right panel, files open in the center.
	const centerStore = useTsentaCenterStore();
	const handleSelectFile = useCallback(
		(filePath: string, openInNewTab?: boolean) =>
			openFileFromTree({
				store: centerStore ?? store,
				filePath,
				sourcePaneId: centerStore ? undefined : paneId,
				pin: openInNewTab,
			}),
		[centerStore, store, paneId],
	);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<RepoPicker workspaceId={workspaceId} />
			<div className="min-h-0 flex-1">
				<FilesTab
					variant="fileView"
					onSelectFile={handleSelectFile}
					selectedFilePath={selectedFilePath}
					workspaceId={workspaceId}
					gitStatus={gitStatus.data}
					onSearch={onSearch}
				/>
			</div>
		</div>
	);
}
