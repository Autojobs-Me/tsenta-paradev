import type { ToolCall } from "@superset/chat/protocol";
import type { LucideIcon } from "lucide-react";
import { toolCallIntent } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/utils/shellIntent";
import { toolIcon } from "../../../TsentaToolCallRow/utils/toolIcon";

const MAX_ICONS = 6;

/** The run's tool glyphs, each once, in the order they first appear (WC §9). */
export function runIcons(items: readonly ToolCall[]): LucideIcon[] {
	const icons: LucideIcon[] = [];
	for (const item of items) {
		const icon = toolIcon(item, toolCallIntent(item));
		if (!icons.includes(icon)) icons.push(icon);
		if (icons.length === MAX_ICONS) break;
	}
	return icons;
}
