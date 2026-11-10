/**
 * Conductor's durations (its yMt and Jba, workspace-chat spec §8.1 and
 * §10): "4.2s", "1m, 3.0s", or without tenths "48s", "45m, 12s". Minutes
 * keep counting past the hour, and seconds are not padded, as Conductor's.
 */
export function formatElapsed(ms: number, { tenths = true } = {}): string {
	const safe = Math.max(0, ms);
	const totalSeconds = Math.floor(safe / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	const tenth = Math.floor((safe % 1000) / 100);
	const tail = tenths ? `${seconds}.${tenth}s` : `${seconds}s`;
	return minutes > 0 ? `${minutes}m, ${tail}` : tail;
}
