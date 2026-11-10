import { MIN_WORKSPACE_SIDEBAR_WIDTH } from "renderer/stores/workspace-sidebar-state";
import { isConductorSkin } from "renderer/tsenta/skin";

/*
 * Conductor's left sidebar size (shell-sidebar spec §1.1, §3.1, §3.6): 256px
 * by default, 192 to 480px, and never more than 40% of the window. Under the
 * skin, stores/workspace-sidebar-state.ts takes the first three in place of
 * Paradev's 280 / 225 / 400; the share is applied here.
 */

/** The share of the window the sidebar may take (Conductor's max-w-[40%]). */
export const CONDUCTOR_SIDEBAR_MAX_SHARE = 0.4;

/**
 * The widest the sidebar may be: Paradev's limit for this window
 * (getWorkspaceSidebarMaxWidth), and under the skin also 40% of the window.
 * Like Paradev's, it never drops below the sidebar's minimum width.
 */
export function capSidebarMaxWidth(
	maxWidth: number,
	windowWidth: number,
): number {
	if (!isConductorSkin()) return maxWidth;
	return Math.max(
		MIN_WORKSPACE_SIDEBAR_WIDTH,
		Math.min(maxWidth, Math.floor(windowWidth * CONDUCTOR_SIDEBAR_MAX_SHARE)),
	);
}
