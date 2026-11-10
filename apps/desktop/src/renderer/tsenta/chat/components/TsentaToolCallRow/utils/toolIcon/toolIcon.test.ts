import { describe, expect, test } from "bun:test";
import {
	Bot,
	FilePen,
	FileSearch,
	FileText,
	Globe,
	Radio,
	Search,
	Terminal,
	Wrench,
} from "lucide-react";
import { toolIcon } from "./toolIcon";

describe("toolIcon", () => {
	test("Conductor's glyph for a known tool name", () => {
		expect(toolIcon({ toolName: "Bash", toolKind: "execute" })).toBe(Terminal);
		expect(toolIcon({ toolName: "Monitor", toolKind: "other" })).toBe(Radio);
		expect(toolIcon({ toolName: "Glob", toolKind: "search" })).toBe(FileSearch);
		expect(toolIcon({ toolName: "Write", toolKind: "edit" })).toBe(FilePen);
	});

	test("falls back to the tool kind for other agents' names", () => {
		expect(toolIcon({ toolName: "shell", toolKind: "execute" })).toBe(Terminal);
		expect(toolIcon({ toolName: "fetch_url", toolKind: "fetch" })).toBe(Globe);
		expect(toolIcon({ toolName: "tool", toolKind: "other" })).toBe(Wrench);
	});

	test("a shell command that only read or searched shows as that", () => {
		expect(
			toolIcon(
				{ toolName: "Bash", toolKind: "execute" },
				{ verb: "read", path: "a.ts" },
			),
		).toBe(FileText);
		expect(
			toolIcon(
				{ toolName: "Bash", toolKind: "execute" },
				{ verb: "search", query: "x" },
			),
		).toBe(Search);
	});

	test("subagents and MCP tools", () => {
		expect(
			toolIcon({ toolName: "Task", toolKind: "other", subagent: true }),
		).toBe(Bot);
		expect(
			toolIcon({
				toolName: "mcp__x__y",
				toolKind: "other",
				mcpServer: { name: "x", tool: "y" },
			}),
		).toBe(Wrench);
	});
});
