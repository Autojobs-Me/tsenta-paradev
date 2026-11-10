import { expect, test } from "bun:test";
import { isPlanMode } from "./isPlanMode";

const modes = [{ id: "default" }, { id: "plan" }, { id: "bypassPermissions" }];

test("a plan session mode", () => {
	expect(isPlanMode({ modes, currentModeId: "plan" })).toBe(true);
	expect(isPlanMode({ modes, currentModeId: "default" })).toBe(false);
});

test("a plan config option", () => {
	const option = (currentValue: string) => ({
		id: "mode",
		label: "Mode",
		category: "agent_mode",
		currentValue,
		options: [
			{ id: "build", label: "Build" },
			{ id: "plan", label: "Plan" },
		],
	});
	expect(isPlanMode({ configOptions: [option("plan")] })).toBe(true);
	expect(isPlanMode({ configOptions: [option("build")] })).toBe(false);
});

test("no plan at all", () => {
	expect(isPlanMode({})).toBe(false);
	expect(
		isPlanMode({ modes: [{ id: "default" }], currentModeId: "default" }),
	).toBe(false);
});
