const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	).getTime();
}

/**
 * Conductor's turn time (its DWs, workspace-chat spec §10.1): the time
 * today, the weekday and time within the week, else the date and time,
 * with the year when it is not this one.
 */
export function turnTimeOptions(
	at: Date,
	now: Date,
): Intl.DateTimeFormatOptions {
	const time = { hour: "numeric", minute: "2-digit" } as const;
	const daysAgo = Math.round((startOfDay(now) - startOfDay(at)) / DAY_MS);
	if (daysAgo === 0) return time;
	if (daysAgo > 0 && daysAgo < 7) return { weekday: "short", ...time };
	return {
		month: "short",
		day: "numeric",
		...(at.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
		...time,
	};
}
