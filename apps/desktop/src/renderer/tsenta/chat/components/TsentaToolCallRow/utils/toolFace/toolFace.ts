import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ToolCall } from "@superset/chat/protocol";
import { i18n } from "@superset/i18n";
import type { FileChange } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/utils/fileChange";
import {
	type ShellIntent,
	toolCallCommand,
	unwrapShellCommand,
} from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/utils/shellIntent";
import { toolTitle } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/utils/toolTitle";

const translate = (message: MessageDescriptor) => i18n._(message);

/** Paradev's own words for a shell intent, so the catalogue has them already. */
const READ_VERB = {
	running: msg({ message: "Reading", context: "shell intent" }),
	settled: msg({ message: "Read", context: "shell intent" }),
};
const SEARCH_VERB = {
	running: msg({ message: "Searching", context: "shell intent" }),
	settled: msg({ message: "Searched", context: "shell intent" }),
};
const COMMAND = msg({ message: "Command" });

/** What a tool card says, left and right (workspace-chat spec §6). */
export type ToolFace =
	| { kind: "change"; verb: string; change: FileChange }
	| { kind: "intent"; verb: string; intent: ShellIntent }
	| {
			kind: "plain";
			label: string;
			/** The right summary: a command in mono, or the agent's note in sans. */
			summary: string | null;
			mono: boolean;
	  };

function inputOf(item: ToolCall): Record<string, unknown> {
	const raw = item.rawInput;
	return typeof raw === "object" && raw !== null && !Array.isArray(raw)
		? (raw as Record<string, unknown>)
		: {};
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Claude's own Read, Grep and Glob, said the way a shell read or search is:
 * the verb, then the file as a chip or the pattern in mono (Conductor's
 * file badge and grep row).
 */
export function nativeIntent(item: ToolCall): ShellIntent | null {
	const input = inputOf(item);
	switch (item.toolName) {
		case "Read":
		case "NotebookRead": {
			const path =
				text(input.file_path) ??
				text(input.notebook_path) ??
				item.locations?.[0]?.path;
			if (!path) return null;
			const offset = input.offset;
			return typeof offset === "number" && offset > 1
				? { verb: "read", path, startLine: offset }
				: { verb: "read", path };
		}
		case "Grep":
		case "Glob": {
			const query = text(input.pattern);
			if (!query) return null;
			const path = text(input.path);
			return path ? { verb: "search", query, path } : { verb: "search", query };
		}
		default:
			return null;
	}
}

function nativeVerb(intent: ShellIntent, running: boolean, t = translate) {
	const verb = intent.verb === "read" ? READ_VERB : SEARCH_VERB;
	return t(running ? verb.running : verb.settled);
}

/** A tool name that reads as a label (Bash), not an id (mcp__x__y, tool). */
function labelName(name: string): string | null {
	return /^[A-Z][A-Za-z]{1,30}$/.test(name) ? name : null;
}

export function toolFace(
	item: ToolCall,
	t = translate,
	pluginAvailable = false,
): ToolFace {
	const title = toolTitle(item, t, pluginAvailable);
	if (title.change) {
		return { kind: "change", verb: title.label, change: title.change };
	}
	if (title.intent) {
		return { kind: "intent", verb: title.label, intent: title.intent };
	}
	const native = nativeIntent(item);
	if (native) {
		return {
			kind: "intent",
			verb: nativeVerb(native, item.status === "running", t),
			intent: native,
		};
	}
	const command = item.toolKind === "execute" ? toolCallCommand(item) : null;
	if (command) {
		// Conductor's Bash row: the agent's description, or the tool's name,
		// and the command itself in a mono chip.
		const titleIsCommand = !item.title || item.title.endsWith(command);
		return {
			kind: "plain",
			label: titleIsCommand
				? (labelName(item.toolName) ?? t(COMMAND))
				: item.title,
			summary: unwrapShellCommand(command),
			mono: true,
		};
	}
	const note = text(inputOf(item).description);
	return {
		kind: "plain",
		label: title.label,
		summary: note && note !== title.label ? note.trim() : null,
		mono: false,
	};
}
