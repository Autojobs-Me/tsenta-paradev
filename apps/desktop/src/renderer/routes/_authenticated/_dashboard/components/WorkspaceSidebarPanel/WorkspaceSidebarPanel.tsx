import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import { SidebarSlide } from "renderer/routes/_authenticated/_dashboard/components/SidebarSlide";
import { ResizablePanel } from "renderer/screens/main/components/ResizablePanel";
import {
	COLLAPSED_WORKSPACE_SIDEBAR_WIDTH,
	DEFAULT_WORKSPACE_SIDEBAR_WIDTH,
	useWorkspaceSidebarStore,
} from "renderer/stores/workspace-sidebar-state";
// tsenta:conductor (plan step 8): Conductor's 40% cap on the sidebar width.
import { capSidebarMaxWidth } from "renderer/tsenta/sidebar/metrics";
import { WORKSPACE_SIDEBAR_ATTRIBUTE } from "./constants";
import { useAutoCollapseInNarrowWindow } from "./hooks/useAutoCollapseInNarrowWindow";
import { closeFocusedMenu } from "./utils/closeFocusedMenu";
import { getWorkspaceSidebarMaxWidth } from "./utils/getWorkspaceSidebarMaxWidth";

const subscribeToResize = (onChange: () => void) => {
	window.addEventListener("resize", onChange);
	return () => window.removeEventListener("resize", onChange);
};
const getMaxWidth = () =>
	// tsenta:conductor (plan step 8): at most 40% of the window under the skin.
	capSidebarMaxWidth(
		getWorkspaceSidebarMaxWidth(window.innerWidth),
		window.innerWidth,
	);

export function WorkspaceSidebarPanel({
	className,
	/** What the panel shows while collapsed: its own icon rail, or nothing beside a separate one. */
	collapsedWidth = COLLAPSED_WORKSPACE_SIDEBAR_WIDTH,
	slides = false,
	onLayoutFrame,
	children,
}: {
	className?: string;
	collapsedWidth?: number;
	slides?: boolean;
	onLayoutFrame?: () => void;
	children: ReactNode;
}) {
	const width = useWorkspaceSidebarStore((s) => s.width);
	const lastExpandedWidth = useWorkspaceSidebarStore(
		(s) => s.lastExpandedWidth,
	);
	const setWidth = useWorkspaceSidebarStore((s) => s.setWidth);
	const maxWidth = useSyncExternalStore(subscribeToResize, getMaxWidth);
	useAutoCollapseInNarrowWindow();
	const isCollapsed = width === COLLAPSED_WORKSPACE_SIDEBAR_WIDTH;
	const expandedWidth = Math.min(
		isCollapsed ? lastExpandedWidth : width,
		maxWidth,
	);
	const wasCollapsedRef = useRef(isCollapsed);
	useEffect(() => {
		if (wasCollapsedRef.current === isCollapsed) return;
		wasCollapsedRef.current = isCollapsed;
		if (slides) closeFocusedMenu();
	}, [slides, isCollapsed]);

	const renderPanel = (shownWidth: number) => (
		<ResizablePanel
			width={shownWidth}
			onWidthChange={(next) => setWidth(Math.min(next, maxWidth))}
			minWidth={collapsedWidth}
			maxWidth={maxWidth}
			handleSide="right"
			clampWidth={false}
			className={className}
			onDoubleClickHandle={() => setWidth(DEFAULT_WORKSPACE_SIDEBAR_WIDTH)}
		>
			{children}
		</ResizablePanel>
	);

	return (
		<div
			{...{ [WORKSPACE_SIDEBAR_ATTRIBUTE]: "" }}
			// tsenta:conductor (plan step 8): lets the skin's content sheet follow the sidebar.
			data-sidebar-state={isCollapsed ? "collapsed" : "expanded"}
			className="contents"
		>
			{slides ? (
				<SidebarSlide
					mode={isCollapsed ? "closed" : "open"}
					width={expandedWidth}
					edge="left"
					alwaysMounted
					onLayoutFrame={onLayoutFrame}
				>
					{() => renderPanel(expandedWidth)}
				</SidebarSlide>
			) : (
				renderPanel(isCollapsed ? collapsedWidth : expandedWidth)
			)}
		</div>
	);
}
