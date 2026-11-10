import type { ChatHistorySidebarMessage } from "@superset/ui/chat-history-sidebar";

export type OutlineEntry = { id: string; summary: string };

/** Conductor shows the last 50 turns as marks (its Kga). */
export const MAX_MARKS = 50;

/** The outline's entries, one per turn as its prompt (Conductor's i2a). */
export function outlineEntries(
	messages: readonly ChatHistorySidebarMessage[],
): OutlineEntry[] {
	return messages.flatMap((message) =>
		message.role === "user"
			? [{ id: message.id, summary: message.preview }]
			: [],
	);
}

/**
 * The turn on screen, as Conductor's: the turn of the last visible row.
 * `rows` are the transcript's mounted rows in order, each with its message
 * id and whether it starts above the viewport's bottom edge. The windowed
 * transcript may not have mounted the prompt of the turn it opens in, so
 * then it is the prompt before the first one mounted.
 */
export function currentTurn(
	entryIds: readonly string[],
	rows: readonly { id: string; aboveBottom: boolean }[],
): string | null {
	const ids = new Set(entryIds);
	let current: string | null = null;
	let firstMounted: string | null = null;
	let anyVisible = false;
	for (const row of rows) {
		if (row.aboveBottom) anyVisible = true;
		if (!ids.has(row.id)) continue;
		firstMounted ??= row.id;
		if (!row.aboveBottom) break;
		current = row.id;
	}
	if (current !== null || !anyVisible) return current;
	const index = firstMounted === null ? -1 : entryIds.indexOf(firstMounted);
	return index > 0 ? (entryIds[index - 1] ?? null) : (entryIds.at(-1) ?? null);
}
