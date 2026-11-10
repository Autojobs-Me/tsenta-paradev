import { useLingui } from "@lingui/react/macro";
import { useMessageScroller } from "@superset/chat-ui/MessageScroller";
import {
	type ChatHistorySidebarScrollerProps,
	ChatHistorySidebarScroller as ParadevChatHistorySidebarScroller,
} from "@superset/ui/chat-history-sidebar";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@superset/ui/hover-card";
import { cn } from "@superset/ui/utils";
import { useMemo, useRef, useState } from "react";
import { isConductorSkin } from "renderer/tsenta/skin";
import { useCurrentTurn } from "./hooks/useCurrentTurn";
import { MAX_MARKS, outlineEntries } from "./utils/outlineEntries";

/**
 * What SessionView renders beside the transcript: Conductor's outline of
 * turns under the skin, Paradev's rail of prompts otherwise. Same props:
 * Paradev's prompt list and its jump, which loads a turn the windowed
 * transcript has not mounted.
 */
export function ChatHistorySidebarScroller(
	props: ChatHistorySidebarScrollerProps,
) {
	return isConductorSkin() ? (
		<TsentaTranscriptOutline {...props} />
	) : (
		<ParadevChatHistorySidebarScroller {...props} />
	);
}

/** Scrolls the list so the current turn sits in its middle (Conductor's Qga). */
function centerInList(element: HTMLElement | null): void {
	const list = element?.parentElement;
	if (!element || !list) return;
	list.scrollTop =
		element.offsetTop - (list.clientHeight - element.offsetHeight) / 2;
}

/**
 * Conductor's turn outline (its e2a, the stacked marks at the transcript's
 * top right): one short mark per turn, the last 50, the turn on screen
 * bright, fading out at the bottom. Hovering it opens the list of prompts
 * to the left; a click jumps to that turn.
 */
export function TsentaTranscriptOutline({
	messages,
	onMessageSelect,
}: ChatHistorySidebarScrollerProps) {
	const { t } = useLingui();
	const [open, setOpen] = useState(false);
	const anchorRef = useRef<HTMLDivElement>(null);
	const { scrollToMessage } = useMessageScroller();
	const entries = useMemo(() => outlineEntries(messages), [messages]);
	const entryIds = useMemo(() => entries.map((entry) => entry.id), [entries]);
	const currentId = useCurrentTurn(anchorRef, entryIds);
	if (entries.length < 2) return null;
	const marks = entries.slice(-MAX_MARKS);
	const navigate = (id: string) => {
		setOpen(false);
		if (onMessageSelect) onMessageSelect(id);
		else scrollToMessage(id, { align: "start", behavior: "smooth" });
	};
	return (
		<div
			className="absolute top-4 right-2 z-40"
			data-tsenta="transcript-outline"
			ref={anchorRef}
		>
			<HoverCard
				closeDelay={100}
				onOpenChange={setOpen}
				open={open}
				openDelay={50}
			>
				<HoverCardTrigger asChild>
					<button
						aria-label={t({ message: "User messages" })}
						className="rounded p-1 transition-colors hover:bg-muted"
						type="button"
					>
						<span className="relative block max-h-[calc(100vh-12rem)]">
							<span className="flex max-h-[calc(100vh-12rem)] w-7 flex-col gap-1.5 overflow-hidden p-1">
								{marks.map((entry) => (
									<span
										className={cn(
											"block h-0.5 w-full shrink-0 rounded-full transition-all",
											entry.id === currentId
												? "bg-foreground"
												: "bg-muted-foreground/30",
										)}
										key={entry.id}
									/>
								))}
							</span>
							<span className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-background to-transparent" />
						</span>
					</button>
				</HoverCardTrigger>
				<HoverCardContent
					align="start"
					className="w-64 overflow-hidden p-2"
					side="left"
					sideOffset={-28}
				>
					<nav
						aria-label={t({ message: "User messages" })}
						className="relative flex max-h-80 flex-col gap-0.5 overflow-y-auto overflow-x-hidden"
					>
						{entries.map((entry, index) => {
							const position = index + 1;
							return (
								<button
									aria-current={entry.id === currentId ? "true" : undefined}
									aria-label={t({
										message: `Jump to user message ${position}`,
									})}
									className={cn(
										"inline-flex h-8 w-full shrink-0 items-center justify-start truncate rounded-md px-2 text-left font-450 text-foreground/90 text-sm hover:bg-sidebar-accent",
										entry.id === currentId && "bg-foreground/5",
									)}
									key={entry.id}
									onClick={() => navigate(entry.id)}
									ref={entry.id === currentId ? centerInList : undefined}
									type="button"
								>
									<span className="truncate">{entry.summary}</span>
								</button>
							);
						})}
					</nav>
				</HoverCardContent>
			</HoverCard>
		</div>
	);
}
