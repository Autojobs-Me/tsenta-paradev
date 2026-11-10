import { describe, expect, test } from "bun:test";
import type { PaneDefinition, RendererContext } from "@superset/panes";
import { foldPaneHeaders } from "./foldPaneHeaders";

type Data = Record<string, never>;

function context(
	kind: string,
	parentDirection: "horizontal" | "vertical" | null,
): RendererContext<Data> {
	return {
		pane: { id: "p", kind, data: {}, parentDirection },
		tab: {
			id: "t",
			createdAt: 0,
			activePaneId: "p",
			layout: { type: "pane", paneId: "p" },
			panes: {},
			position: 0,
		},
		isActive: true,
		store: {} as RendererContext<Data>["store"],
		actions: {
			close: () => {},
			focus: () => {},
			setTitle: () => {},
			pin: () => {},
			updateData: () => {},
			split: () => {},
		},
		headerActions: null,
	};
}

const plain: PaneDefinition<Data> = { renderPane: () => null };

describe("foldPaneHeaders", () => {
	test("a chat alone in its tab hides its header; in a split it keeps it", () => {
		const registry = foldPaneHeaders<Data>({ "chat-v3": plain });
		const chat = registry["chat-v3"];
		expect(chat.hideHeader?.(context("chat-v3", null))).toBe(true);
		expect(chat.hideHeader?.(context("chat-v3", "horizontal"))).toBe(false);
	});

	test("other kinds are left as they were", () => {
		const diff: PaneDefinition<Data> = { renderPane: () => null };
		const registry = foldPaneHeaders<Data>({ diff });
		expect(registry.diff).toBe(diff);
	});

	test("a kind with a toolbar keeps its header", () => {
		const terminal: PaneDefinition<Data> = {
			renderPane: () => null,
			renderToolbar: () => null,
		};
		expect(foldPaneHeaders<Data>({ terminal }).terminal).toBe(terminal);
	});

	test("a definition's own hideHeader still applies in a split", () => {
		const registry = foldPaneHeaders<Data>({
			terminal: { renderPane: () => null, hideHeader: () => true },
		});
		expect(
			registry.terminal.hideHeader?.(context("terminal", "vertical")),
		).toBe(true);
	});
});
