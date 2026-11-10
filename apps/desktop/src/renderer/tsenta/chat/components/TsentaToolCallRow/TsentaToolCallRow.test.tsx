import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import type { ToolCall } from "@superset/chat/protocol";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ToolCallRow } from "./TsentaToolCallRow";

// File icons resolve against the page URL, and the test DOM starts on about:blank.
const page = (
	window as unknown as { happyDOM: { setURL: (url: string) => void } }
).happyDOM;
beforeAll(() => {
	page.setURL("http://localhost/");
	document.documentElement.dataset.skin = "conductor";
});
afterAll(() => {
	page.setURL("about:blank");
	delete document.documentElement.dataset.skin;
});
afterEach(cleanup);

function bash(overrides: Partial<ToolCall> = {}): ToolCall {
	return {
		id: `call-${Math.random()}`,
		kind: "tool_call",
		title: "Run the checks",
		toolKind: "execute",
		toolName: "Bash",
		status: "completed",
		startedAtMs: 1,
		rawInput: { command: "bun test", description: "Run the checks" },
		content: [{ type: "terminal", command: "bun test", output: "12 pass" }],
		...overrides,
	};
}

test("a command card: the description, the command in a chip, the output when opened", () => {
	const view = render(<ToolCallRow item={bash()} />);
	expect(
		view.container.querySelector("[data-tsenta=tool-card]"),
	).not.toBeNull();
	expect(view.getByText("Run the checks")).toBeDefined();
	expect(view.getByText("bun test")).toBeDefined();
	expect(view.container.textContent).not.toContain("12 pass");
	fireEvent.click(view.getByRole("button", { name: "Run the checks" }));
	expect(view.container.textContent).toContain("12 pass");
});

test("a failed call gets an error row with what went wrong", () => {
	const view = render(
		<ToolCallRow
			item={bash({
				status: "failed",
				content: [{ type: "text", text: "command not found: bun" }],
			})}
		/>,
	);
	expect(view.getByText("Error")).toBeDefined();
	expect(view.container.textContent).toContain("command not found: bun");
});

test("with the skin off it is Paradev's row", () => {
	delete document.documentElement.dataset.skin;
	const view = render(<ToolCallRow item={bash()} />);
	expect(view.container.querySelector("[data-tsenta=tool-card]")).toBeNull();
	document.documentElement.dataset.skin = "conductor";
});
