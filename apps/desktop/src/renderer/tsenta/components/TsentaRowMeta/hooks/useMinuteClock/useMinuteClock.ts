import { useSyncExternalStore } from "react";

const MINUTE_MS = 60_000;
let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	if (timer === null) {
		now = Date.now();
		timer = setInterval(() => {
			now = Date.now();
			for (const notify of listeners) notify();
		}, MINUTE_MS);
	}
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0 && timer !== null) {
			clearInterval(timer);
			timer = null;
		}
	};
}

const getSnapshot = () => now;

/**
 * The time, refreshed once a minute for every row together (Conductor
 * re-renders its relative times on a 60s tick), so the sidebar keeps one
 * timer however many rows show a time.
 */
export function useMinuteClock(): number {
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
