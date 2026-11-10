import { useLingui } from "@lingui/react/macro";
import type { ToolCall } from "@superset/chat/protocol";
import { ClipboardList } from "lucide-react";
import { CopyButton } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/CopyButton";
import { MarkdownView } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/MarkdownView";
import { ToolCard, useCardOpen } from "../../../ToolCard";

/** The plan an ExitPlanMode call proposes: its input, else its result text. */
export function proposedPlan(item: ToolCall): string | null {
	const raw = item.rawInput;
	if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
		const plan = (raw as Record<string, unknown>).plan;
		if (typeof plan === "string" && plan.trim()) return plan;
	}
	const text = item.content
		.flatMap((part) => (part.type === "text" ? [part.text] : []))
		.join("\n\n")
		.trim();
	return text || null;
}

/**
 * Conductor's plan proposal (`Mta`, workspace-chat spec §6.9): "Propose
 * plan" with the clipboard glyph, open by default, the plan as markdown
 * with no box, and a copy button that stays on the right.
 */
export function PlanProposalCard({
	item,
	plan,
}: {
	item: ToolCall;
	plan: string;
}) {
	const { t } = useLingui();
	const [open, setOpen] = useCardOpen(item.id, true);
	const label = t({ message: "Propose plan" });
	return (
		<ToolCard
			alwaysShowRight
			bodyClassName="pb-1"
			findItemId={item.id}
			icon={<ClipboardList />}
			label={label}
			left={<span>{label}</span>}
			onOpenChange={setOpen}
			open={open}
			right={
				<span className="pointer-events-auto inline-flex">
					<CopyButton
						className="inline-flex size-5 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
						label={t({ message: "Copy" })}
						text={plan}
					/>
				</span>
			}
		>
			<MarkdownView text={plan} />
		</ToolCard>
	);
}
