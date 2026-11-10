import { expect, test } from "bun:test";
import { currentTurn, outlineEntries } from "./outlineEntries";

test("one entry per prompt", () => {
	expect(
		outlineEntries([
			{ id: "u1", role: "user", preview: "First" },
			{ id: "a1", role: "assistant", preview: "Reply" },
			{ id: "u2", role: "user", preview: "Second" },
		]),
	).toEqual([
		{ id: "u1", summary: "First" },
		{ id: "u2", summary: "Second" },
	]);
});

test("the current turn is the last prompt above the viewport's bottom", () => {
	const ids = ["u1", "u2", "u3"];
	expect(
		currentTurn(ids, [
			{ id: "u1", aboveBottom: true },
			{ id: "t1", aboveBottom: true },
			{ id: "u2", aboveBottom: true },
			{ id: "t2", aboveBottom: true },
			{ id: "u3", aboveBottom: false },
		]),
	).toBe("u2");
});

test("a window that opens mid-turn counts the prompt before it", () => {
	expect(
		currentTurn(
			["u1", "u2", "u3"],
			[
				{ id: "t2", aboveBottom: true },
				{ id: "u3", aboveBottom: false },
			],
		),
	).toBe("u2");
	expect(currentTurn(["u1", "u2"], [])).toBeNull();
});
