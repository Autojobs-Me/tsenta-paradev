import { msg, plural } from "@lingui/core/macro";
import type { Plan } from "@superset/chat/protocol";
import { i18n } from "@superset/i18n";

export type TodoCard = {
	/** Persist key suffix, so each of a pair of cards keeps its own state. */
	key: string;
	label: string;
	summary: string | null;
};

/**
 * Conductor's todo headers (`hta`, workspace-chat spec §6.8): what the
 * update did to the list, and on the right the item now in progress or how
 * far the list has got. An update that finished items and started another
 * is two cards, "Todo completed" and "Todo started".
 */
export function todoCards(entries: Plan["entries"]): TodoCard[] {
	const total = entries.length;
	const done = entries.filter((entry) => entry.status === "completed").length;
	const startedAt = entries.findIndex(
		(entry) => entry.status === "in_progress",
	);
	const started = entries[startedAt];
	const startedCard = started
		? {
				key: "started",
				label: i18n._(msg({ message: "Todo started" })),
				summary: `${startedAt + 1}. ${started.text}`,
			}
		: null;
	if (total === 0) {
		return [
			{
				key: "",
				label: i18n._(msg({ message: "Todo list created" })),
				summary: null,
			},
		];
	}
	if (startedCard && done > 0 && done < total) {
		return [
			{
				key: "completed",
				label: i18n._(msg({ message: "Todo completed" })),
				summary: i18n._(msg({ message: `${done}/${total} completed` })),
			},
			startedCard,
		];
	}
	if (startedCard) return [startedCard];
	if (done === total) {
		return [
			{
				key: "",
				label: i18n._(msg({ message: "Todo list completed" })),
				summary: null,
			},
		];
	}
	if (done > 0) {
		return [
			{
				key: "",
				label: i18n._(msg({ message: "Todo completed" })),
				summary: i18n._(msg({ message: `${done}/${total} completed` })),
			},
		];
	}
	return [
		{
			key: "",
			label: i18n._(msg({ message: "Todo list created" })),
			summary: plural(total, { one: "# todo", other: "# todos" }),
		},
	];
}
