import { Trans, useLingui } from "@lingui/react/macro";
import { subagentOutcome } from "@superset/chat/core";
import type { ToolCall } from "@superset/chat/protocol";
import { ShimmerLabel } from "@superset/ui/ai-elements/shimmer-label";
import { cn } from "@superset/ui/utils";
import { Bot, CircleAlert } from "lucide-react";
// The file, not the SubagentEventLine barrel: the barrel exports this module.
import { SubagentEventLine as ParadevSubagentEventLine } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/SubagentEventLine/SubagentEventLine";
import { useNestedItems } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/providers/NestedItemsProvider";
import { TsentaWorkspaceStatusMatrix } from "renderer/tsenta/components/TsentaWorkspaceStatusMatrix";
import { isConductorSkin } from "renderer/tsenta/skin";

const LABEL_SWEEP_SECONDS = 1.6;

/**
 * What the SubagentEventLine barrel exports: Conductor's sub-agent row under
 * the skin, Paradev's line otherwise.
 */
export function SubagentEventLine({ item }: { item: ToolCall }) {
	return isConductorSkin() ? (
		<TsentaSubagentEventLine item={item} />
	) : (
		<ParadevSubagentEventLine item={item} />
	);
}

function agentType(item: ToolCall): string | null {
	const raw = item.rawInput;
	if (typeof raw !== "object" || raw === null || Array.isArray(raw))
		return null;
	const type = (raw as Record<string, unknown>).subagent_type;
	return typeof type === "string" && type.trim() ? type.trim() : null;
}

/**
 * A sub-agent as Conductor's sub-agent row (`JYi`, workspace-chat spec
 * §6.10): its state as the glyph (the working matrix while it runs, a bot
 * once done, red when it failed), its name, and its agent type in mono.
 * As in Paradev it opens the sub-agent's own transcript, and a running one
 * can still move to the background.
 */
export function TsentaSubagentEventLine({ item }: { item: ToolCall }) {
	const { t } = useLingui();
	const { openSubagent, moveToBackground } = useNestedItems();
	const name = item.title || t({ message: "Subagent" });
	const outcome = subagentOutcome(item);
	const running = outcome === "running";
	const failed = outcome === "failed";
	const label = running
		? t({ message: `${name} started working` })
		: failed
			? t({ message: `${name} failed` })
			: outcome === "stopped"
				? t({ message: `${name} stopped` })
				: t({ message: `${name} finished` });
	const type = agentType(item);
	return (
		<div className="flex min-w-0 max-w-full items-center gap-2">
			<button
				aria-label={label}
				className="-mx-2 inline-flex min-w-0 max-w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
				data-find-item={item.id}
				onClick={() => openSubagent(item.id)}
				title={label}
				type="button"
			>
				<span className="flex size-3 shrink-0 items-center justify-center">
					{running ? (
						<TsentaWorkspaceStatusMatrix
							className="size-3"
							hasUnread={false}
							label={label}
							status="working"
						/>
					) : failed ? (
						<CircleAlert className="size-3 text-destructive" />
					) : (
						<Bot className="size-3 text-muted-foreground" />
					)}
				</span>
				<span className="flex min-w-0 flex-1 items-baseline gap-2">
					<span
						className={cn(
							"min-w-0 truncate text-sm",
							failed ? "text-destructive" : "text-foreground",
						)}
					>
						<ShimmerLabel
							className="font-normal"
							duration={LABEL_SWEEP_SECONDS}
							isShimmering={running}
						>
							{name}
						</ShimmerLabel>
					</span>
					{type && (
						<span className="max-w-[400px] shrink-0 truncate font-medium font-mono text-muted-foreground text-xs">
							{type}
						</span>
					)}
				</span>
			</button>
			{running && item.canBackground && moveToBackground && (
				<button
					aria-label={t({ message: `Move ${name} to background` })}
					className="shrink-0 rounded px-1 font-sans text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
					onClick={() => moveToBackground(item.id)}
					type="button"
				>
					<Trans>Move to background</Trans>
				</button>
			)}
		</div>
	);
}
