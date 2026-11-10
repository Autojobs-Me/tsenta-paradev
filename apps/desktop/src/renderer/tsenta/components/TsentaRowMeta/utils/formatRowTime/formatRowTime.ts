import { formatRelativeTime } from "renderer/lib/formatRelativeTime";

const MINUTE_MS = 60_000;

/**
 * A sidebar row's time since its last activity, in Conductor's compact form
 * (shell-sidebar spec §4.7, trailing meta): "now" under a minute, then
 * Paradev's own compact units ("2m", "3h", "4d", "2mo"), with no " ago".
 */
export function formatRowTime(timestamp: number, now: number): string {
	if (now - timestamp < MINUTE_MS) return "now";
	return formatRelativeTime(timestamp);
}
