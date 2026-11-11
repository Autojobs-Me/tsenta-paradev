import { useLingui } from "@lingui/react/macro";
import type { RendererContext } from "@superset/panes";
import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { ChatHistoryPicker } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatPaneTitle/components/ChatHistoryPicker";
import { onOpenChatHistory } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/utils/chatHistoryOpen";
import type {
	ChatPaneData,
	PaneViewerData,
} from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";

/**
 * Conductor's history icon at the tab strip's end: the chat's history
 * picker, which Paradev keeps in the chat header the skin folds away. It
 * also answers `/resume`.
 */
export function TsentaChatHistoryButton({
	context,
}: {
	context: RendererContext<PaneViewerData>;
}) {
	const { t } = useLingui();
	const { workspace } = useWorkspace();
	const [open, setOpen] = useState(false);
	const paneId = context.pane.id;
	useEffect(() => onOpenChatHistory(paneId, () => setOpen(true)), [paneId]);
	const label = t({ message: "Chat history" });
	return (
		<ChatHistoryPicker
			current={context.pane.data as ChatPaneData}
			workspaceId={workspace.id}
			store={context.store}
			open={open}
			onOpenChange={setOpen}
		>
			<button
				type="button"
				aria-label={label}
				title={label}
				onClick={() => setOpen((value) => !value)}
				className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
			>
				<History className="size-3.5" />
			</button>
		</ChatHistoryPicker>
	);
}
