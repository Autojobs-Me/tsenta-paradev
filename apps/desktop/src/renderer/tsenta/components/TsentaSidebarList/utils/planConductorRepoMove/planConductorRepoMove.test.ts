import { describe, expect, test } from "bun:test";
import { planConductorRepoMove } from "./planConductorRepoMove";

describe("planConductorRepoMove", () => {
	const order = ["a", "b", "c", "d"];

	test("moves a repository before or after the one under the pointer", () => {
		expect(planConductorRepoMove(order, "d", "b", "before")).toEqual([
			"a",
			"d",
			"b",
			"c",
		]);
		expect(planConductorRepoMove(order, "a", "c", "after")).toEqual([
			"b",
			"c",
			"a",
			"d",
		]);
	});

	test("skips drops that leave the order as it was", () => {
		expect(planConductorRepoMove(order, "b", "b", "after")).toBeNull();
		expect(planConductorRepoMove(order, "b", "a", "after")).toBeNull();
		expect(planConductorRepoMove(order, "b", "c", "before")).toBeNull();
	});

	test("ignores a project the order does not hold", () => {
		expect(planConductorRepoMove(order, "x", "a", "before")).toBeNull();
		expect(planConductorRepoMove(order, "a", "x", "before")).toBeNull();
	});
});
