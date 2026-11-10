// tsenta:conductor (plan step 8): Conductor's chrome while the sidebar is hidden.
export { WindowChrome } from "renderer/tsenta/components/TsentaWindowChrome";
export {
	WINDOW_CHROME_BAND_CLASS,
	WINDOW_CONTROLS_ROW_HEIGHT,
	WINDOW_CONTROLS_ROW_TOP,
} from "./constants";
export { useCollapsedSidebarBand } from "./hooks/useCollapsedSidebarBand";
export { useWindowChromeVisible } from "./hooks/useWindowChromeVisible";
