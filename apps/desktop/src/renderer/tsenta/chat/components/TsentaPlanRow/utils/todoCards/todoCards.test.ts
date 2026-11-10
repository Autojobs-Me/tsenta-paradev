import { expect, test } from "bun:test";
import type { Plan } from "@superset/chat/protocol";
import { todoCards } from "./todoCards";

function plan(...statuses: Plan["entries"][number]["status"][]) {
	return statuses.map((status, index) => ({
		text: `Step ${index + 1}`,
		status,
	}));
}

test("a new list says how many todos it has", () => {
	expect(todoCards(plan("pending", "pending"))).toEqual([
		{ key: "", label: "Todo list created", summary: "2 todos" },
	]);
	expect(todoCards([])).toEqual([
		{ key: "", label: "Todo list created", summary: null },
	]);
});

test("a started todo names it with its number", () => {
	expect(todoCards(plan("in_progress", "pending"))).toEqual([
		{ key: "started", label: "Todo started", summary: "1. Step 1" },
	]);
});

test("finishing one and starting the next is two cards", () => {
	expect(todoCards(plan("completed", "in_progress", "pending"))).toEqual([
		{ key: "completed", label: "Todo completed", summary: "1/3 completed" },
		{ key: "started", label: "Todo started", summary: "2. Step 2" },
	]);
});

test("a finished list", () => {
	expect(todoCards(plan("completed", "completed"))).toEqual([
		{ key: "", label: "Todo list completed", summary: null },
	]);
	expect(todoCards(plan("completed", "pending"))).toEqual([
		{ key: "", label: "Todo completed", summary: "1/2 completed" },
	]);
});
