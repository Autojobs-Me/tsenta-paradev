import { useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { HotkeyLabel } from "renderer/hotkeys";
import { useWorkspaceSidebarStore } from "renderer/stores/workspace-sidebar-state";
import { LayoutSidebarLeftIcon } from "renderer/tsenta/components/icons";

/**
 * Conductor's left sidebar toggle (shell-sidebar spec §1.3, §3.2): the
 * codicon layout-sidebar-left at 16px, the same glyph open or closed, muted
 * and brightening on hover with no wash. Conductor's button is the bare
 * icon; this one keeps a 24px hit area around it. It sits in the sidebar
 * header, and in the window chrome while the sidebar is hidden.
 */
export function TsentaSidebarToggle() {
	const { t } = useLingui();
	const toggleCollapsed = useWorkspaceSidebarStore((s) => s.toggleCollapsed);
	const label = t({ message: "Toggle left sidebar" });

	return (
		<Tooltip delayDuration={1000}>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					onClick={toggleCollapsed}
					className="no-drag flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					<LayoutSidebarLeftIcon className="size-4" aria-hidden="true" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="right">
				<HotkeyLabel label={label} id="TOGGLE_WORKSPACE_SIDEBAR" />
			</TooltipContent>
		</Tooltip>
	);
}
