import { cn } from "@superset/ui/utils";
import type { ComponentProps } from "react";
import { ZoomStable } from "renderer/components/ZoomStable";
import { useZoomFactor } from "renderer/hooks/useZoomFactor";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { AppMenuButton } from "renderer/routes/_authenticated/_dashboard/components/AppMenuButton";
import { NavigationControls } from "renderer/routes/_authenticated/_dashboard/components/NavigationControls";
import { OfflineBadge } from "renderer/routes/_authenticated/_dashboard/components/OfflineBadge";
import { PortsDropdown } from "renderer/routes/_authenticated/_dashboard/components/PortsDropdown";
import { SidebarToggle } from "renderer/routes/_authenticated/_dashboard/components/SidebarToggle";
// The files, not the WindowChrome barrel: the barrel exports this module.
import {
	WINDOW_CONTROLS_ROW_HEIGHT,
	WINDOW_CONTROLS_ROW_TOP,
} from "renderer/routes/_authenticated/_dashboard/components/WindowChrome/constants";
import { useWindowChromeVisible } from "renderer/routes/_authenticated/_dashboard/components/WindowChrome/hooks/useWindowChromeVisible";
import { WindowChrome as ParadevWindowChrome } from "renderer/routes/_authenticated/_dashboard/components/WindowChrome/WindowChrome";
import { COLLAPSED_WORKSPACE_SIDEBAR_WIDTH } from "renderer/stores/workspace-sidebar-state";
import { TRAFFIC_LIGHTS_CLEARANCE } from "renderer/tsenta/sidebar/metrics";
import { isConductorSkin } from "renderer/tsenta/skin";

type WindowChromeProps = ComponentProps<typeof ParadevWindowChrome>;

/**
 * What the WindowChrome barrel exports: Conductor's chrome under the skin,
 * Paradev's otherwise.
 */
export function WindowChrome(props: WindowChromeProps) {
	return isConductorSkin() ? (
		<TsentaWindowChrome {...props} />
	) : (
		<ParadevWindowChrome {...props} />
	);
}

/**
 * The window controls while the sidebar is hidden (plan step 8; shell-sidebar
 * spec §1.3, §3.7). Conductor folds its sidebar away completely and floats
 * the sidebar toggle in the content's top bar, where Paradev's WindowChrome
 * already sits. Paradev's chrome steps over a 52px icon rail that is no longer
 * there, so this one lays out from the window's edge, as the sidebar header
 * does: the toggle lands where the header's toggle was, and back, forward,
 * ports and offline follow it in the header's look. On Windows and Linux the
 * app menu, which lived on the rail, leads the row.
 *
 * In the workspace view the chrome sits inside the content sheet, which steps
 * 12px in from the window while the sidebar is hidden; shell.css hands that
 * inset down as --tsenta-window-chrome-inset and the spacer gives it back.
 */
export function TsentaWindowChrome({ className }: WindowChromeProps) {
	const isVisible = useWindowChromeVisible();
	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	// Mac while loading, so the row never briefly covers the window buttons.
	const isMac = platform === undefined || platform === "darwin";
	const zoomFactor = useZoomFactor();

	if (!isVisible) return null;
	return (
		<div
			data-tsenta="window-chrome"
			className={cn("flex h-full shrink-0 self-start", className)}
		>
			{isMac ? (
				<div
					className="drag h-full shrink-0"
					style={{
						width: `calc(${TRAFFIC_LIGHTS_CLEARANCE / zoomFactor}px - var(--tsenta-window-chrome-inset, 0px))`,
					}}
				/>
			) : (
				<div
					className="flex shrink-0 items-center justify-center"
					style={{
						width: COLLAPSED_WORKSPACE_SIDEBAR_WIDTH,
						marginTop: WINDOW_CONTROLS_ROW_TOP,
						height: WINDOW_CONTROLS_ROW_HEIGHT,
					}}
				>
					<AppMenuButton />
				</div>
			)}
			<div
				className="flex shrink-0 items-center pr-2"
				style={{
					marginTop: `${WINDOW_CONTROLS_ROW_TOP / (isMac ? zoomFactor : 1)}px`,
					height: `${WINDOW_CONTROLS_ROW_HEIGHT / (isMac ? zoomFactor : 1)}px`,
				}}
			>
				<ZoomStable enabled={isMac} className="flex items-center gap-2">
					<div data-tsenta="sidebar-toggle" className="flex items-center">
						<SidebarToggle />
					</div>
					<div
						data-tsenta="sidebar-header-controls"
						className="flex items-center gap-2"
					>
						<NavigationControls />
						<PortsDropdown align="start" />
						<OfflineBadge />
					</div>
				</ZoomStable>
			</div>
		</div>
	);
}
