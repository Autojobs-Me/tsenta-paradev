import { useLingui } from "@lingui/react/macro";
import type {
	Item,
	Reasoning as ReasoningItem,
	ToolCall,
} from "@superset/chat/protocol";
import { Shimmer } from "@superset/ui/ai-elements/shimmer";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@superset/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { type ComponentProps, memo } from "react";
import { NestedToolCallRow } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/NestedToolCallRow";
import { ReasoningRow } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ReasoningRow";
import { ToolCallRow } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ToolCallRow";
import { RailStep } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/TurnGroupSection/components/RailStep";
// The file, not the ToolRunRow barrel: the barrel exports this module.
import { ToolRunRow as ParadevToolRunRow } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/TurnGroupSection/components/ToolRunRow/ToolRunRow";
import { stepSummary } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/utils/stepSummary";
import { isNestedTool } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/utils/subagentLines";
import { isConductorSkin } from "renderer/tsenta/skin";
import { runIcons } from "./utils/runIcons";

type ToolRunRowProps = ComponentProps<typeof ParadevToolRunRow>;

/** Conductor folds only runs of three or more (workspace-chat spec §9). */
const MIN_FOLDED_STEPS = 3;
const SUMMARY_SWEEP_SECONDS = 1.6;

function sameChildLists(
	previous: ToolRunRowProps["childLists"],
	next: ToolRunRowProps["childLists"],
): boolean {
	if (previous === next) return true;
	if (!previous || !next || previous.length !== next.length) return false;
	return previous.every((list, index) => list === next[index]);
}

/** Paradev's comparison for its run (ToolRunRow.tsx): the rows rebuild on every update. */
function sameRun(previous: ToolRunRowProps, next: ToolRunRowProps): boolean {
	return (
		previous.rowKey === next.rowKey &&
		previous.collapsed === next.collapsed &&
		previous.active === next.active &&
		previous.onToggle === next.onToggle &&
		previous.steps.length === next.steps.length &&
		previous.steps.every((step, index) => step === next.steps[index]) &&
		previous.stepTexts.every((text, index) => text === next.stepTexts[index]) &&
		sameChildLists(previous.childLists, next.childLists)
	);
}

/**
 * What the ToolRunRow barrel exports: Conductor's run under the skin,
 * Paradev's otherwise.
 */
export const ToolRunRow = memo(function ToolRunRow(props: ToolRunRowProps) {
	return isConductorSkin() ? (
		<TsentaToolRunRow {...props} />
	) : (
		<ParadevToolRunRow {...props} />
	);
}, sameRun);

/**
 * A run of tool calls the way Conductor shows a turn's work (workspace-chat
 * spec §9): while the agent is still in the run, and for a run of fewer
 * than three steps, every call is its own card, flat in the column. A
 * finished longer run folds under one quiet line, the chevron, what the run
 * did (Paradev's own summary, "ran 6 commands, read 2 files") and each of
 * its tools' glyphs once. It opens and closes through the transcript's own
 * state, as Paradev's run does, so find can still open it.
 */
function TsentaToolRunRow({
	active = false,
	childLists,
	collapsed,
	items,
	onToggle,
	rowKey,
	steps,
	stepTexts,
}: ToolRunRowProps) {
	const { t } = useLingui();
	const renderStep = (step: Item) => (
		<RailStep key={step.id}>
			{step.kind === "reasoning" ? (
				<ReasoningRow
					item={step as ReasoningItem}
					text={stepTexts[steps.indexOf(step)] ?? ""}
				/>
			) : isNestedTool(
					step as ToolCall,
					childLists?.[items.indexOf(step as ToolCall)],
				) ? (
				<NestedToolCallRow item={step as ToolCall} />
			) : (
				<ToolCallRow item={step as ToolCall} />
			)}
		</RailStep>
	);
	if (active || steps.length < MIN_FOLDED_STEPS) {
		return <div className="flex flex-col">{steps.map(renderStep)}</div>;
	}

	const done = items.filter((tool) => tool.status !== "running");
	const live = done.length === 0;
	const summary = stepSummary(live ? items : done);
	const icons = runIcons(items);
	const expanded = !collapsed;
	const Chevron = expanded ? ChevronDown : ChevronRight;
	return (
		<Collapsible
			onOpenChange={(open) => onToggle(rowKey, !open)}
			open={expanded}
		>
			<CollapsibleTrigger
				aria-label={
					expanded ? t({ message: "Collapse" }) : t({ message: "Expand" })
				}
				className="group flex w-full min-w-0 items-center py-1 text-left text-muted-foreground transition-colors hover:text-foreground"
			>
				<Chevron aria-hidden className="mr-1 size-3 shrink-0" />
				<span className="flex min-w-0 items-center gap-2">
					{live ? (
						<Shimmer
							className="ml-0.5 min-w-0 truncate text-sm first-letter:uppercase"
							duration={SUMMARY_SWEEP_SECONDS}
							variant="text"
						>
							{summary}
						</Shimmer>
					) : (
						<span className="ml-0.5 min-w-0 truncate text-sm first-letter:uppercase">
							{summary}
						</span>
					)}
					<span aria-hidden className="flex shrink-0 items-center gap-1">
						{icons.map((Icon) => (
							<Icon
								className="size-3 text-muted-foreground group-hover:text-foreground"
								key={Icon.displayName ?? String(icons.indexOf(Icon))}
							/>
						))}
					</span>
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="mt-1 flex flex-col">{steps.map(renderStep)}</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
