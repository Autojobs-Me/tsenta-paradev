import { expect, test } from "bun:test";
import { formatCompactCount } from "./formatCompactCount";

test("counts compact as Conductor's sidebar does", () => {
	expect(formatCompactCount(0)).toBe("0");
	expect(formatCompactCount(999)).toBe("999");
	expect(formatCompactCount(1000)).toBe("1k");
	expect(formatCompactCount(1234)).toBe("1.2k");
	expect(formatCompactCount(9960)).toBe("10k");
	expect(formatCompactCount(12_345)).toBe("12k");
	expect(formatCompactCount(99_000)).toBe("99k");
	expect(formatCompactCount(99_001)).toBe("✱✱");
});
