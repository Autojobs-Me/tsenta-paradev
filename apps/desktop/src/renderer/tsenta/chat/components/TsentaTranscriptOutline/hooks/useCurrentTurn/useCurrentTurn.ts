import { type RefObject, useEffect, useState } from "react";
import { currentTurn } from "../../utils/outlineEntries";

/**
 * Which turn is on screen, from the transcript's own rows: the scroller's
 * items carry their message ids, so this reads them on scroll and resize,
 * once a frame, without reaching into Paradev's scroller.
 */
export function useCurrentTurn(
	anchorRef: RefObject<HTMLElement | null>,
	entryIds: readonly string[],
): string | null {
	const [current, setCurrent] = useState<string | null>(null);
	const key = entryIds.join("\0");
	useEffect(() => {
		const ids = key ? key.split("\0") : [];
		const log = anchorRef.current?.parentElement?.querySelector<HTMLElement>(
			'[data-tsenta="transcript"] [role="log"]',
		);
		const viewport = log?.parentElement;
		if (!log || !viewport) return;
		let frame = 0;
		const measure = () => {
			frame = 0;
			const bottom = viewport.getBoundingClientRect().bottom;
			const rows: { id: string; aboveBottom: boolean }[] = [];
			for (const child of log.children) {
				const id = (child as HTMLElement).dataset.messageId;
				if (!id) continue;
				const rect = child.getBoundingClientRect();
				// Rows the skin hides (Paradev's working lines) have no box.
				if (rect.height === 0) continue;
				rows.push({ id, aboveBottom: rect.top < bottom });
			}
			setCurrent(currentTurn(ids, rows));
		};
		const schedule = () => {
			if (frame === 0) frame = requestAnimationFrame(measure);
		};
		viewport.addEventListener("scroll", schedule, { passive: true });
		const resize = new ResizeObserver(schedule);
		resize.observe(viewport);
		resize.observe(log);
		schedule();
		return () => {
			cancelAnimationFrame(frame);
			viewport.removeEventListener("scroll", schedule);
			resize.disconnect();
		};
	}, [anchorRef, key]);
	return current;
}
