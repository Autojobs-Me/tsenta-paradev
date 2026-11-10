import { useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import type { ComponentProps } from "react";
import { HotkeyLabel } from "renderer/hotkeys";
// The file, not the RightSidebarToggle barrel: the barrel exports this module.
import { RightSidebarToggle as ParadevRightSidebarToggle } from "renderer/routes/_authenticated/_dashboard/components/RightSidebarToggle/RightSidebarToggle";
import { LayoutSidebarRightIcon } from "renderer/tsenta/components/icons";
import { isConductorSkin } from "renderer/tsenta/skin";

type RightSidebarToggleProps = ComponentProps<typeof ParadevRightSidebarToggle>;

/**
 * What the RightSidebarToggle barrel exports: Conductor's toggle under the
 * skin, Paradev's otherwise.
 */
export function RightSidebarToggle(props: RightSidebarToggleProps) {
	return isConductorSkin() ? (
		<TsentaRightSidebarToggle {...props} />
	) : (
		<ParadevRightSidebarToggle {...props} />
	);
}

/**
 * Conductor's right panel toggle (right-panels spec §2.4): the codicon
 * layout-sidebar-right at 16px, the same glyph open or closed, muted and
 * brightening on hover with no wash, in a 24px hit area. Paradev's compact
 * size makes no difference here.
 */
export function TsentaRightSidebarToggle({
	onToggle,
}: RightSidebarToggleProps) {
	const { t } = useLingui();
	const label = t({ message: "Toggle right sidebar" });

	return (
		<Tooltip delayDuration={1000}>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					onClick={onToggle}
					className="no-drag flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					<LayoutSidebarRightIcon className="size-4" aria-hidden="true" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="left">
				<HotkeyLabel label={label} id="TOGGLE_SIDEBAR" />
			</TooltipContent>
		</Tooltip>
	);
}
