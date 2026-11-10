import { useLingui } from "@lingui/react/macro";
import {
	isPendingApproval,
	type SessionSnapshot,
	type TurnGroup,
} from "@superset/chat/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { useMemo, useRef } from "react";
import { collectSessionWork } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/collectAgentWork";
import { TsentaWorkspaceStatusMatrix } from "renderer/tsenta/components/TsentaWorkspaceStatusMatrix";
import { isConductorSkin } from "renderer/tsenta/skin";
import { useLiveTimer } from "./hooks/useLiveTimer";
import { useSettleToBottom } from "./hooks/useSettleToBottom";
import { type WaitingTask, waitingLabel } from "./utils/waitingLabel";

type TranscriptFooterProps = {
	sessionId: string;
	groups: readonly TurnGroup[];
	snapshot: SessionSnapshot;
};

/** When the turn's own work last moved: when it went over to its background tasks. */
function lastActivityMs(group: TurnGroup): number {
	let latest = group.turn?.startedAtMs ?? 0;
	for (const entry of group.entries) {
		const items = entry.kind === "tool_run" ? entry.items : [entry.item];
		for (const item of items) {
			latest = Math.max(latest, item.completedAtMs ?? item.startedAtMs);
		}
	}
	return latest;
}

type FooterState =
	| { kind: "idle" }
	| { kind: "working"; sinceMs: number }
	| { kind: "waiting"; sinceMs: number; tasks: WaitingTask[] };

function footerState(
	sessionId: string,
	groups: readonly TurnGroup[],
	snapshot: SessionSnapshot,
): FooterState {
	const last = groups.at(-1);
	const turn = last?.turn;
	if (!last || turn?.status !== "running") return { kind: "idle" };
	// A question or approval only the user can answer shows in the turn.
	const asking = last.entries.some(
		(entry) => entry.kind === "item" && isPendingApproval(entry.item),
	);
	if (asking) return { kind: "idle" };
	const session = snapshot.session;
	if (session?.awaitingBackground === true) {
		const tasks = collectSessionWork(session.backgroundTasks, {
			terminalId: "",
			sessionId,
		}).map((task) => ({ kind: task.kind, name: task.name }));
		return { kind: "waiting", sinceMs: lastActivityMs(last), tasks };
	}
	return { kind: "working", sinceMs: turn.startedAtMs };
}

/**
 * The end of the transcript under the skin: Conductor's footer (`eya`,
 * workspace-chat spec §2.6, §8). While the agent works, a 32px row with the
 * working glyph and a mono timer from the turn's start ("4.2s",
 * "1m, 3.0s"); while the turn waits on background tasks, the waiting glyph,
 * what it waits for, and a timer from when it began waiting. Paradev's own
 * "Working for 8s" line under each prompt is hidden under the skin
 * (chat.css). Renders nothing with the skin off.
 */
export function TsentaTranscriptFooter(props: TranscriptFooterProps) {
	return isConductorSkin() ? <ConductorFooter {...props} /> : null;
}

function ConductorFooter({
	groups,
	sessionId,
	snapshot,
}: TranscriptFooterProps) {
	const { t } = useLingui();
	const footerRef = useRef<HTMLDivElement>(null);
	const timerRef = useRef<HTMLSpanElement>(null);
	useSettleToBottom(footerRef, sessionId);
	const state = useMemo(
		() => footerState(sessionId, groups, snapshot),
		[sessionId, groups, snapshot],
	);
	useLiveTimer(timerRef, state.kind === "idle" ? null : state.sinceMs);
	const label =
		state.kind === "waiting"
			? waitingLabel(state.tasks)
			: t({ message: "Working" });
	const described =
		state.kind === "waiting"
			? state.tasks.filter((task) => task.name.trim())
			: [];
	const labelText = (
		<span className="min-w-0 truncate text-muted-foreground text-xs">
			{label}
		</span>
	);
	// Always mounted, so the scroller's content keeps the same children.
	return (
		<div className="px-7" data-tsenta="transcript-footer" ref={footerRef}>
			{state.kind !== "idle" && (
				<div className="flex h-8 min-w-0 items-center gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
					<TsentaWorkspaceStatusMatrix
						className="size-3"
						hasUnread={false}
						label={label}
						status={state.kind === "waiting" ? "waiting" : "working"}
					/>
					{state.kind === "waiting" &&
						(described.length > 1 ? (
							<Tooltip>
								<TooltipTrigger asChild>{labelText}</TooltipTrigger>
								<TooltipContent className="flex max-w-72 flex-col">
									{described.map((task, index) => (
										<span
											className="truncate"
											// biome-ignore lint/suspicious/noArrayIndexKey: tasks may share a name
											key={index}
										>
											{task.name}
										</span>
									))}
								</TooltipContent>
							</Tooltip>
						) : (
							labelText
						))}
					<span
						aria-hidden
						className="shrink-0 font-mono text-muted-foreground text-xs tracking-wider tabular-nums"
						ref={timerRef}
					/>
				</div>
			)}
		</div>
	);
}
