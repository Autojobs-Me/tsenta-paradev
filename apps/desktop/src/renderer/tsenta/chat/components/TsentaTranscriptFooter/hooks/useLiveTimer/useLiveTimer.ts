import { type RefObject, useLayoutEffect } from "react";
import { formatElapsed } from "../../../../utils/formatElapsed";

const TICK_MS = 100;

/**
 * Conductor's working timer (workspace-chat spec §8.1): the element's text
 * is rewritten every 100ms straight in the DOM, so the transcript does not
 * re-render ten times a second.
 */
export function useLiveTimer(
	ref: RefObject<HTMLElement | null>,
	sinceMs: number | null,
): void {
	useLayoutEffect(() => {
		const element = ref.current;
		if (!element || sinceMs === null) return;
		const tick = () => {
			element.textContent = formatElapsed(Date.now() - sinceMs);
		};
		tick();
		const timer = window.setInterval(tick, TICK_MS);
		return () => window.clearInterval(timer);
	}, [ref, sinceMs]);
}
