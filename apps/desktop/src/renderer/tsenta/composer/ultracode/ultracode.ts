import type { SessionConfigOption } from "@superset/chat/protocol";

/** A product name; never translated. */
export const ULTRACODE_LABEL = "Ultracode";

const CLAUDE_MODEL = /claude|opus|sonnet|haiku|fable/i;

/**
 * Whether a chat runs with ultracode. The user's Claude settings turn it on
 * ("ultracode": true), and claude-agent-acp keeps it on at every effort. The
 * CLI offers it on exactly the Claude models with an xhigh effort level.
 */
export function showsUltracode({
	effort,
	presetId,
	modelLabel,
}: {
	effort: SessionConfigOption | undefined;
	presetId: string | undefined;
	modelLabel: string | undefined;
}): boolean {
	if (!effort?.options.some((option) => option.id === "xhigh")) return false;
	return presetId === "claude" || CLAUDE_MODEL.test(modelLabel ?? "");
}
