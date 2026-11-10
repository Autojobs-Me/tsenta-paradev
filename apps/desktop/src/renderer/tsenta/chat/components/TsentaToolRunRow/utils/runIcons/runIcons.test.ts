import { expect, test } from "bun:test";
import type { ToolCall } from "@superset/chat/protocol";
import { FilePen, FileText, Terminal } from "lucide-react";
import { runIcons } from "./runIcons";

function call(toolName: string, toolKind: ToolCall["toolKind"]): ToolCall {
	return {
		id: toolName,
		kind: "tool_call",
		title: toolName,
		toolKind,
		toolName,
		status: "completed",
		startedAtMs: 0,
		content: [],
	};
}

test("each glyph once, in the order the run first used it", () => {
	expect(
		runIcons([
			call("Bash", "execute"),
			call("Read", "read"),
			call("Bash", "execute"),
			call("Edit", "edit"),
		]),
	).toEqual([Terminal, FileText, FilePen]);
});
