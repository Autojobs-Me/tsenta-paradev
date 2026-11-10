import { expect, test } from "bun:test";
import { formatElapsed } from "./formatElapsed";

test("seconds with tenths, then minutes, as Conductor's working timer", () => {
	expect(formatElapsed(4_250)).toBe("4.2s");
	expect(formatElapsed(63_000)).toBe("1m, 3.0s");
	expect(formatElapsed(8 * 60_000 + 37_040)).toBe("8m, 37.0s");
});

test("without tenths, as Conductor's turn footer", () => {
	expect(formatElapsed(48_900, { tenths: false })).toBe("48s");
	expect(formatElapsed(45 * 60_000 + 12_000, { tenths: false })).toBe(
		"45m, 12s",
	);
	expect(formatElapsed(2 * 3_600_000, { tenths: false })).toBe("120m, 0s");
});

test("never negative", () => {
	expect(formatElapsed(-5)).toBe("0.0s");
});
