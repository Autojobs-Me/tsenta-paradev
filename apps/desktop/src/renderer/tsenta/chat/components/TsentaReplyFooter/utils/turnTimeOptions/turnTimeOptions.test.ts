import { expect, test } from "bun:test";
import { turnTimeOptions } from "./turnTimeOptions";

const now = new Date(2026, 10, 10, 22, 30);

test("the time today, the weekday this week, else the date", () => {
	expect(turnTimeOptions(new Date(2026, 10, 10, 9, 5), now)).toEqual({
		hour: "numeric",
		minute: "2-digit",
	});
	expect(turnTimeOptions(new Date(2026, 10, 8, 9, 5), now)).toEqual({
		weekday: "short",
		hour: "numeric",
		minute: "2-digit",
	});
	expect(turnTimeOptions(new Date(2026, 9, 1, 9, 5), now)).toEqual({
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
	expect(turnTimeOptions(new Date(2025, 9, 1, 9, 5), now)).toMatchObject({
		year: "numeric",
	});
});
