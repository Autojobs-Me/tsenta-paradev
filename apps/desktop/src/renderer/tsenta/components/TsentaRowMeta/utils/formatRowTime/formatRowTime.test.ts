import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { formatRowTime } from "./formatRowTime";

const NOW = new Date("2026-11-10T12:00:00Z").getTime();

describe("formatRowTime", () => {
	afterEach(() => setSystemTime());

	test("reads now under a minute, then Paradev's compact units", () => {
		setSystemTime(NOW);
		expect(formatRowTime(NOW - 5_000, NOW)).toBe("now");
		expect(formatRowTime(NOW - 59_000, NOW)).toBe("now");
		expect(formatRowTime(NOW + 10_000, NOW)).toBe("now");
		expect(formatRowTime(NOW - 2 * 60_000, NOW)).toBe("2m");
		expect(formatRowTime(NOW - 3 * 3_600_000, NOW)).toBe("3h");
		expect(formatRowTime(NOW - 4 * 86_400_000, NOW)).toBe("4d");
	});
});
