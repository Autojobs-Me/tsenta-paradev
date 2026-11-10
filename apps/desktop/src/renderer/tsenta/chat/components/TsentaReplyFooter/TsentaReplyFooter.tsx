import { Trans, useLingui } from "@lingui/react/macro";
import type { SessionSnapshot } from "@superset/chat/core";
import type { AgentMessage, Turn } from "@superset/chat/protocol";
import { useFormat } from "@superset/i18n/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@superset/ui/hover-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { Ellipsis } from "lucide-react";
import type { ComponentProps } from "react";
import { CopyButton } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/CopyButton";
// The file, not the ReplyFooter barrel: the barrel exports this module.
import { ReplyFooter as ParadevReplyFooter } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ReplyFooter/ReplyFooter";
import { useNestedItems } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/providers/NestedItemsProvider";
import { modelDisplayName } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/utils/modelDisplayName";
import { isConductorSkin } from "renderer/tsenta/skin";
import { formatElapsed } from "../../utils/formatElapsed";
import { turnTimeOptions } from "./utils/turnTimeOptions";

type ReplyFooterProps = ComponentProps<typeof ParadevReplyFooter>;

/** Conductor's small action button (its Lzt). */
const ACTION_CLASSNAME =
	"inline-flex size-5 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground";

/**
 * What the ReplyFooter barrel exports: Conductor's turn footer under the
 * skin, Paradev's otherwise.
 */
export function ReplyFooter(props: ReplyFooterProps) {
	return isConductorSkin() ? (
		<TsentaReplyFooter {...props} />
	) : (
		<ParadevReplyFooter {...props} />
	);
}

function turnOf(
	snapshot: SessionSnapshot,
	item: AgentMessage,
): Turn | undefined {
	const turnId = snapshot.items.get(item.id)?.turnId;
	return turnId ? snapshot.turns.get(turnId) : undefined;
}

/**
 * Conductor's turn footer (`Iva`, workspace-chat spec §10), always shown
 * under a finished turn: how long the turn took and when it ended,
 * "45m, 12s · 10:26 PM", which opens on hover to the model, the turn's
 * start and end and its tokens; then copy, and the more-actions menu with
 * Paradev's branch actions.
 */
export function TsentaReplyFooter({
	canForkToWorktree = true,
	item,
	onFork,
	text,
}: ReplyFooterProps) {
	const { t } = useLingui();
	const { formatDateTime, formatNumber } = useFormat();
	// Footers render only in the transcript, under its provider.
	const { snapshot } = useNestedItems();
	const turn = turnOf(snapshot, item);
	const endMs = turn?.completedAtMs ?? item.completedAtMs ?? item.startedAtMs;
	const startMs = turn?.startedAtMs;
	const end = new Date(endMs);
	const duration =
		startMs !== undefined && turn?.completedAtMs !== undefined
			? formatElapsed(turn.completedAtMs - startMs, { tenths: false })
			: null;
	const time = formatDateTime(end, turnTimeOptions(end, new Date()));
	const usage = turn?.usage;
	const model = item.model
		? modelDisplayName(item.model, snapshot.session?.configOptions)
		: null;

	return (
		<div
			className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2 text-muted-foreground text-xs"
			data-tsenta="turn-footer"
		>
			<HoverCard closeDelay={100} openDelay={300}>
				<HoverCardTrigger asChild>
					<span
						className="shrink-0 cursor-default rounded-sm tabular-nums outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:text-foreground"
						// biome-ignore lint/a11y/noNoninteractiveTabindex: the turn's details open on focus too
						tabIndex={0}
					>
						{duration ? `${duration} · ${time}` : time}
					</span>
				</HoverCardTrigger>
				<HoverCardContent
					className="w-auto max-w-80 rounded-sm p-1 text-xs tracking-wide"
					collisionPadding={8}
					side="top"
				>
					<div className="flex flex-col gap-1 p-1">
						{model && <span className="font-medium">{model}</span>}
						<span className="text-muted-foreground">
							{startMs !== undefined
								? `${formatDateTime(new Date(startMs))} → ${formatDateTime(end)}`
								: formatDateTime(end)}
						</span>
						{usage && (
							<div className="mt-1 flex flex-col gap-0.5 border-border border-t pt-1">
								<div className="flex justify-between gap-4">
									<span className="text-muted-foreground">
										<Trans>Input</Trans>
									</span>
									<span className="font-medium tabular-nums">
										{formatNumber(usage.inputTokens)}
									</span>
								</div>
								<div className="flex justify-between gap-4">
									<span className="text-muted-foreground">
										<Trans>Output</Trans>
									</span>
									<span className="font-medium tabular-nums">
										{formatNumber(usage.outputTokens)}
									</span>
								</div>
								<div className="flex justify-between gap-4">
									<span className="text-muted-foreground">
										<Trans>Cache read</Trans>
									</span>
									<span className="font-medium tabular-nums">
										{formatNumber(usage.cachedInputTokens)}
									</span>
								</div>
							</div>
						)}
					</div>
				</HoverCardContent>
			</HoverCard>
			<span className="flex shrink-0 items-center gap-1">
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="inline-flex">
							<CopyButton
								className={ACTION_CLASSNAME}
								label={t({ message: "Copy message" })}
								text={text}
							/>
						</span>
					</TooltipTrigger>
					<TooltipContent>
						<Trans>Copy message</Trans>
					</TooltipContent>
				</Tooltip>
				{onFork && (
					<DropdownMenu>
						<Tooltip>
							<TooltipTrigger asChild>
								<DropdownMenuTrigger
									aria-label={t({ message: "More actions" })}
									className={`${ACTION_CLASSNAME} data-[state=open]:bg-accent data-[state=open]:text-accent-foreground`}
								>
									<Ellipsis className="size-3.5" />
								</DropdownMenuTrigger>
							</TooltipTrigger>
							<TooltipContent>
								<Trans>More actions</Trans>
							</TooltipContent>
						</Tooltip>
						<DropdownMenuContent align="start" className="w-72">
							<DropdownMenuItem
								className="flex-col items-start gap-0.5"
								onSelect={() => onFork("workspace")}
							>
								<span className="text-xs">
									<Trans>Branch in this workspace</Trans>
								</span>
								<span className="text-[11px] text-muted-foreground">
									<Trans>
										The agent copies the conversation; the branch opens in a new
										tab
									</Trans>
								</span>
							</DropdownMenuItem>
							{canForkToWorktree && (
								<DropdownMenuItem
									className="flex-col items-start gap-0.5"
									onSelect={() => onFork("worktree")}
								>
									<span className="text-xs">
										<Trans>Branch in a new worktree</Trans>
									</span>
									<span className="text-[11px] text-muted-foreground">
										<Trans>
											A new workspace off this branch, with the conversation
											handed to a fresh agent
										</Trans>
									</span>
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</span>
		</div>
	);
}
