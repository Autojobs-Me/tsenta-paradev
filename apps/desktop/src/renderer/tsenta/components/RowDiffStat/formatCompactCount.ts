/** Conductor's compact line counts: 999, 1.2k, 12k, and ✱✱ past 99k. */
export function formatCompactCount(count: number): string {
	if (count > 99_000) return "✱✱";
	if (count >= 10_000) return `${Math.round(count / 1000)}k`;
	if (count > 999) return `${(count / 1000).toFixed(1).replace(".0", "")}k`;
	return `${count}`;
}
