import { useMessageScroller } from "@superset/chat-ui/MessageScroller";
import { type RefObject, useEffect, useRef } from "react";

/** Conductor settles once the height has held for this long (its Yba). */
const STABLE_MS = 500;
const INPUT_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
const AT_END_PX = 8;

/**
 * Conductor's settle loop (its Xba, workspace-chat spec §11). When a chat
 * opens at its end, late content (images, diffs, highlighting) keeps
 * growing the transcript; while it does, the end is pinned again on every
 * frame. Once the height has held for 500ms it pins once more and stops,
 * and it stops at the reader's first wheel, touch, click or key. Paradev's
 * scroller keeps everything else: it is only asked to scroll to its end,
 * and only while it is there, so a restored reading position stands.
 */
export function useSettleToBottom(
	anchorRef: RefObject<HTMLElement | null>,
	sessionId: string,
): void {
	const { scrollToEnd } = useMessageScroller();
	const scrollToEndRef = useRef(scrollToEnd);
	scrollToEndRef.current = scrollToEnd;

	useEffect(() => {
		// The footer sits in the scroller's content, whose parent scrolls.
		const viewport = anchorRef.current?.parentElement?.parentElement;
		if (!viewport || sessionId === "") return;
		const atEnd = () =>
			viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <=
			AT_END_PX;
		let frame = 0;
		let settled = false;
		let lastHeight = viewport.scrollHeight;
		let lastChange = performance.now();
		const pin = () => scrollToEndRef.current({ behavior: "auto" });
		const stop = () => {
			cancelAnimationFrame(frame);
			for (const type of INPUT_EVENTS) {
				document.removeEventListener(type, onInput, { capture: true });
			}
		};
		function onInput() {
			stop();
		}
		const step = (now: number) => {
			const height = viewport.scrollHeight;
			if (height !== lastHeight) {
				// Only while the end was still in view: a position Paradev
				// restored, or any other move away from the end, stands.
				const wasAtEnd =
					lastHeight - viewport.scrollTop - viewport.clientHeight <= AT_END_PX;
				if (!wasAtEnd) {
					stop();
					return;
				}
				lastHeight = height;
				lastChange = now;
				pin();
			} else if (now - lastChange > STABLE_MS) {
				if (settled) {
					stop();
					return;
				}
				settled = true;
				lastChange = now;
				pin();
			}
			frame = requestAnimationFrame(step);
		};
		// Wait one frame for the scroller's own opening position.
		frame = requestAnimationFrame(() => {
			if (!atEnd()) return;
			for (const type of INPUT_EVENTS) {
				document.addEventListener(type, onInput, { capture: true });
			}
			frame = requestAnimationFrame(step);
		});
		return stop;
	}, [anchorRef, sessionId]);
}
