import type { ComponentProps } from "react";
// The file, not the OptionButtons barrel: the barrel exports this module.
import { OptionButtons as ParadevOptionButtons } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ApprovalRow/components/OptionButtons/OptionButtons";
import {
	type OptionRole,
	optionRole,
} from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ApprovalRow/utils/optionRole";
import { conductorButtonVariants } from "renderer/tsenta/components/ui/button-variants";
import { isConductorSkin } from "renderer/tsenta/skin";

type OptionButtonsProps = ComponentProps<typeof ParadevOptionButtons>;

/** Conductor lists yes first, the wider grant next, and no last (spec §6.12). */
const RANK: Record<OptionRole, number> = {
	allow_once: 0,
	allow: 1,
	allow_always: 2,
	reject: 3,
};

/**
 * What the OptionButtons barrel exports: Conductor's stacked answers under
 * the skin, Paradev's row of buttons otherwise.
 */
export function OptionButtons(props: OptionButtonsProps) {
	return isConductorSkin() ? (
		<TsentaOptionButtons {...props} />
	) : (
		<ParadevOptionButtons {...props} />
	);
}

/**
 * The agent's options as Conductor's tool approval answers (`vna`,
 * workspace-chat spec §6.12): full-width 36px outline buttons, stacked,
 * the narrowest yes first and no last.
 */
export function TsentaOptionButtons({ item, onRespond }: OptionButtonsProps) {
	const ranked = item.options
		.map((option, index) => ({ option, index, rank: RANK[optionRole(option)] }))
		.sort((a, b) => a.rank - b.rank || a.index - b.index);
	return (
		<div className="flex flex-col items-stretch gap-2">
			{ranked.map(({ option }) => (
				<button
					className={conductorButtonVariants({
						variant: "outline",
						size: "sm",
						className: "h-9 w-full min-w-0 justify-between px-4 text-sm",
					})}
					key={option.optionId}
					onClick={() =>
						onRespond(item.id, { type: "option", optionId: option.optionId })
					}
					title={option.label}
					type="button"
				>
					<span className="min-w-0 truncate">{option.label}</span>
				</button>
			))}
		</div>
	);
}
