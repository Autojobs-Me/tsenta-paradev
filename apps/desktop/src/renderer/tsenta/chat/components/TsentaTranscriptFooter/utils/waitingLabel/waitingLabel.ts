import { msg, plural } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";

export type WaitingTask = { kind: "subagent" | "shell"; name: string };

/**
 * Conductor's waiting row label (`i3a`, workspace-chat spec §8.2): the one
 * task by name, else how many agents or background tasks the turn waits on.
 */
export function waitingLabel(tasks: readonly WaitingTask[]): string {
	const only = tasks.length === 1 ? tasks[0]?.name.trim() : undefined;
	if (only) return i18n._(msg({ message: `Waiting for ${only}` }));
	if (tasks.length === 0) {
		return i18n._(msg({ message: "Waiting for background tasks" }));
	}
	return tasks.every((task) => task.kind === "subagent")
		? plural(tasks.length, {
				one: "Waiting for # agent",
				other: "Waiting for # agents",
			})
		: plural(tasks.length, {
				one: "Waiting for # background task",
				other: "Waiting for # background tasks",
			});
}
