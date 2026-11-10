import { expect, test } from "bun:test";
import { waitingLabel } from "./waitingLabel";

test("one task by name, several by count, as Conductor's waiting row", () => {
	expect(waitingLabel([{ kind: "shell", name: "bun run dev" }])).toBe(
		"Waiting for bun run dev",
	);
	expect(
		waitingLabel([
			{ kind: "shell", name: "a" },
			{ kind: "subagent", name: "b" },
		]),
	).toBe("Waiting for 2 background tasks");
	expect(
		waitingLabel([
			{ kind: "subagent", name: "a" },
			{ kind: "subagent", name: "b" },
		]),
	).toBe("Waiting for 2 agents");
	expect(waitingLabel([])).toBe("Waiting for background tasks");
});
