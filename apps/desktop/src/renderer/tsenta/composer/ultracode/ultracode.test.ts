import { describe, expect, test } from "bun:test";
import type { SessionConfigOption } from "@superset/chat/protocol";
import { showsUltracode } from "./ultracode";

const effort = (ids: string[]) =>
	({
		id: "effort",
		category: "thought_level",
		currentValue: ids[0],
		options: ids.map((id) => ({ id, label: id })),
	}) as unknown as SessionConfigOption;

describe("showsUltracode", () => {
	test("Claude models with xhigh", () => {
		const xhigh = effort(["low", "medium", "high", "xhigh", "max"]);
		expect(
			showsUltracode({
				effort: xhigh,
				presetId: "claude",
				modelLabel: "Default",
			}),
		).toBe(true);
		expect(
			showsUltracode({
				effort: xhigh,
				presetId: undefined,
				modelLabel: "Opus 5.5",
			}),
		).toBe(true);
	});
	test("not without xhigh, or on other agents", () => {
		expect(
			showsUltracode({
				effort: effort(["low", "high"]),
				presetId: "claude",
				modelLabel: "Haiku 4.5",
			}),
		).toBe(false);
		expect(
			showsUltracode({
				effort: effort(["low", "xhigh"]),
				presetId: "codex",
				modelLabel: "GPT-5.6",
			}),
		).toBe(false);
		expect(
			showsUltracode({
				effort: undefined,
				presetId: "claude",
				modelLabel: "Opus 5.5",
			}),
		).toBe(false);
	});
});
