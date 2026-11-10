import { useLingui } from "@lingui/react/macro";
import type { Reasoning as ReasoningItem } from "@superset/chat/protocol";
import { ShimmerLabel } from "@superset/ui/ai-elements/shimmer-label";
import { Brain } from "lucide-react";
import { useMemo } from "react";
import { MarkdownView } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/MarkdownView";
// The file, not the ReasoningRow barrel: the barrel exports this module.
import { ReasoningRow as ParadevReasoningRow } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ReasoningRow/ReasoningRow";
import { thoughtSummary } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ReasoningRow/utils/thoughtSummary";
import { isConductorSkin } from "renderer/tsenta/skin";
import { ToolCard, useCardOpen } from "../ToolCard";

const THINKING_SWEEP_SECONDS = 1.6;

type ReasoningRowProps = { item: ReasoningItem; text: string };

/**
 * What the ReasoningRow barrel exports: Conductor's Thinking row under the
 * skin, Paradev's otherwise.
 */
export function ReasoningRow(props: ReasoningRowProps) {
	return isConductorSkin() ? (
		<TsentaReasoningRow {...props} />
	) : (
		<ParadevReasoningRow {...props} />
	);
}

/**
 * Conductor's Thinking row (`Dta`, workspace-chat spec §6.7): a tool card
 * with the brain glyph and "Thinking", the thought's first paragraph in a
 * sans chip while closed, and the whole thought as muted markdown with no
 * box when open. It opens by default, as in the reference screenshot, and
 * stays how the reader leaves it. The label sweeps while the thought
 * streams in.
 */
export function TsentaReasoningRow({ item, text }: ReasoningRowProps) {
	const { t } = useLingui();
	const [open, setOpen] = useCardOpen(item.id, true);
	const streaming = item.completedAtMs === undefined;
	const summary = useMemo(() => thoughtSummary(text), [text]);
	const label = t({ message: "Thinking" });
	if (!streaming && !text.trim()) return null;
	const hasBody = text.trim().length > 0;
	return (
		<div data-tsenta="thinking">
			<ToolCard
				bodyClassName="pb-1"
				icon={<Brain />}
				label={label}
				left={
					streaming ? (
						<ShimmerLabel
							className="font-normal"
							duration={THINKING_SWEEP_SECONDS}
						>
							{label}
						</ShimmerLabel>
					) : (
						<span>{label}</span>
					)
				}
				onOpenChange={setOpen}
				open={open}
				right={
					summary ? (
						<span
							className="block min-w-0 truncate rounded-md bg-muted px-1 py-0.5 font-sans text-muted-foreground text-xs"
							data-find-item={open ? undefined : item.id}
						>
							{summary}
						</span>
					) : undefined
				}
			>
				{hasBody ? (
					<MarkdownView
						className="text-muted-foreground"
						findItemId={open ? item.id : undefined}
						text={text}
					/>
				) : undefined}
			</ToolCard>
		</div>
	);
}
