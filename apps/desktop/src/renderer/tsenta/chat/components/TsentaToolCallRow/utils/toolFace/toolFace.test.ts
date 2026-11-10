import { describe, expect, test } from "bun:test";
import type { ToolCall } from "@superset/chat/protocol";
import { nativeIntent, toolFace } from "./toolFace";

const t = (message: { message?: string }) => message.message ?? "";

function call(overrides: Partial<ToolCall>): ToolCall {
	return {
		id: "tool-1",
		kind: "tool_call",
		startedAtMs: 0,
		title: "Tool",
		toolKind: "other",
		toolName: "Tool",
		status: "completed",
		content: [],
		...overrides,
	} as ToolCall;
}

describe("toolFace", () => {
	test("a described command: the description left, the command in a chip", () => {
		expect(
			toolFace(
				call({
					title: "Run the checks",
					toolKind: "execute",
					toolName: "Bash",
					rawInput: { command: "bun test", description: "Run the checks" },
				}),
				t,
			),
		).toEqual({
			kind: "plain",
			label: "Run the checks",
			summary: "bun test",
			mono: true,
		});
	});

	test("an undescribed command: the tool's name left", () => {
		expect(
			toolFace(
				call({
					title: "Running bun run build",
					toolKind: "execute",
					toolName: "Bash",
					rawInput: { command: "bun run build" },
				}),
				t,
			),
		).toMatchObject({ label: "Bash", summary: "bun run build", mono: true });
		expect(
			toolFace(
				call({
					title: "bun run build",
					toolKind: "execute",
					toolName: "tool",
					rawInput: { command: "bun run build" },
				}),
				t,
			),
		).toMatchObject({ label: "Command", summary: "bun run build" });
	});

	test("a tool with a note shows it on the right in sans", () => {
		expect(
			toolFace(
				call({
					title: "Monitor",
					toolName: "Monitor",
					rawInput: { description: "New sidebar pieces landing" },
				}),
				t,
			),
		).toEqual({
			kind: "plain",
			label: "Monitor",
			summary: "New sidebar pieces landing",
			mono: false,
		});
	});

	test("Claude's Read and Grep read as a read and a search", () => {
		expect(
			toolFace(
				call({
					title: "Reading src/a.ts",
					toolKind: "read",
					toolName: "Read",
					rawInput: { file_path: "/repo/src/a.ts" },
				}),
				t,
			),
		).toEqual({
			kind: "intent",
			verb: "Read",
			intent: { verb: "read", path: "/repo/src/a.ts" },
		});
		expect(
			nativeIntent(
				call({
					toolName: "Grep",
					toolKind: "search",
					rawInput: { pattern: "useQueue", path: "src" },
				}),
			),
		).toEqual({ verb: "search", query: "useQueue", path: "src" });
	});
});
