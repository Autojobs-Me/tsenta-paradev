/*
 * Conductor's glyphs that Paradev already ships. Conductor draws its sidebar
 * toggles with VS Code's codicons through react-icons; the path data it uses
 * (shell-sidebar spec §3.2, right-panels spec §2.4) is react-icons' Vsc*Off
 * outlines, so these are those icons under the names Conductor's spec uses.
 */
export {
	/** codicon layout-sidebar-left: the left sidebar toggle, open or closed. */
	VscLayoutSidebarLeftOff as LayoutSidebarLeftIcon,
	/** codicon layout-sidebar-right: the right panel toggle, open or closed. */
	VscLayoutSidebarRightOff as LayoutSidebarRightIcon,
} from "react-icons/vsc";
