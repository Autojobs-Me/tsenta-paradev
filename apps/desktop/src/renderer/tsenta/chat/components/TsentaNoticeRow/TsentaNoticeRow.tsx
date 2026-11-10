import type { Notice } from "@superset/chat/protocol";
// The file, not the NoticeRow barrel: the barrel exports this module.
import { NoticeRow as ParadevNoticeRow } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/NoticeRow/NoticeRow";
import { isConductorSkin } from "renderer/tsenta/skin";

/**
 * What the NoticeRow barrel exports: under the skin an error notice is
 * Conductor's destructive badge (workspace-chat spec §7); every other
 * notice, and every notice with the skin off, is Paradev's line.
 */
export function NoticeRow({ item }: { item: Notice }) {
	if (!isConductorSkin() || item.noticeKind !== "error") {
		return <ParadevNoticeRow item={item} />;
	}
	return (
		<div className="flex w-fit max-w-full select-text items-start rounded-md border border-transparent bg-destructive/10 px-2 py-1.5 text-destructive text-xs [overflow-wrap:anywhere]">
			{item.text ?? item.noticeKind}
		</div>
	);
}
