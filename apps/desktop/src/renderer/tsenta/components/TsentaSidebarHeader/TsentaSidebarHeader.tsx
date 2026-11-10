import { Trans, useLingui } from "@lingui/react/macro";
import { draftText } from "@superset/chat-ui/PromptInput";
import { FEATURE_FLAGS } from "@superset/shared/constants";
import {
	ClipboardList,
	Clock,
	FileText,
	Gauge,
	GitPullRequest,
	House,
	Pencil,
	Plus,
	Puzzle,
	Search,
} from "lucide-react";
import { useFeatureFlagEnabled } from "posthog-js/react";
import { ZoomStable } from "renderer/components/ZoomStable";
import { env } from "renderer/env.renderer";
import { useZoomFactor } from "renderer/hooks/useZoomFactor";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { AppMenuButton } from "renderer/routes/_authenticated/_dashboard/components/AppMenuButton";
import { useCommandPaletteToggle } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useCommandPaletteToggle";
import { NavigationControls } from "renderer/routes/_authenticated/_dashboard/components/NavigationControls";
import { OfflineBadge } from "renderer/routes/_authenticated/_dashboard/components/OfflineBadge";
import { PortsDropdown } from "renderer/routes/_authenticated/_dashboard/components/PortsDropdown";
import { SidebarToggle } from "renderer/routes/_authenticated/_dashboard/components/SidebarToggle";
import {
	WINDOW_CONTROLS_ROW_HEIGHT,
	WINDOW_CONTROLS_ROW_TOP,
} from "renderer/routes/_authenticated/_dashboard/components/WindowChrome";
import { useDashboardNavigation } from "renderer/routes/_authenticated/_dashboard/hooks/useDashboardNavigation";
import { useFailedAutomations } from "renderer/routes/_authenticated/_dashboard/hooks/useFailedAutomations";
import { useOpenNewWorkspaceInViewedProject } from "renderer/routes/_authenticated/_dashboard/hooks/useOpenNewWorkspaceInViewedProject";
import { useNewWorkspaceDraftStore } from "renderer/stores/new-workspace-draft";
import { COLLAPSED_WORKSPACE_SIDEBAR_WIDTH } from "renderer/stores/workspace-sidebar-state";
import { SidebarNavRow } from "./components/SidebarNavRow";

/**
 * Where the first control sits on macOS, clear of the window buttons:
 * Conductor's 1rem + 66px traffic-light clearance + 4px (shell-sidebar spec
 * §3.2).
 */
const TRAFFIC_LIGHTS_CLEARANCE = 86;

/**
 * Conductor's sidebar header (shell-sidebar spec §3.2, §3.3), in place of
 * DashboardSidebarHeader's expanded branch under the Conductor skin:
 *
 * - Row 1: the sidebar toggle past the window buttons, and on the right the
 *   offline badge, the ports pill and back and forward.
 * - One nav block of identical rows: Home, Create (with a pencil while a
 *   new-workspace draft waits) and Search, then Paradev's other
 *   destinations in the same row look.
 *
 * The row keeps Paradev's macOS metrics (WindowChrome constants and
 * ZoomStable), so the controls stay centred on the native window buttons
 * under page zoom. The icon rail (collapsed) stays Paradev's.
 */
export function TsentaSidebarHeader() {
	const { t } = useLingui();
	const navigation = useDashboardNavigation();
	const openNewWorkspace = useOpenNewWorkspaceInViewedProject();
	const paletteToggle = useCommandPaletteToggle();
	// Conductor marks Create with a pencil while the new-workspace composer
	// holds an unsent prompt or attachment.
	const hasNewWorkspaceDraft = useNewWorkspaceDraftStore(
		(state) =>
			draftText(state.promptDraft).trim() !== "" ||
			state.promptAttachments.length > 0,
	);
	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	// Mac while loading, so the row never briefly covers the window buttons.
	const isMac = platform === undefined || platform === "darwin";
	const zoomFactor = useZoomFactor();
	// Same gates as DashboardSidebarHeader.
	const isPluginsEnabled =
		(useFeatureFlagEnabled(FEATURE_FLAGS.PLUGINS) ?? false) ||
		env.NODE_ENV === "development";
	const { myFailedCount } = useFailedAutomations();
	const { data: isUsageInSidebarEnabled } =
		electronTrpc.settings.getShowUsageInSidebar.useQuery();

	return (
		<div
			data-tsenta="sidebar-header"
			className="relative flex shrink-0 flex-col"
			style={{
				paddingTop: `${WINDOW_CONTROLS_ROW_TOP / (isMac ? zoomFactor : 1)}px`,
			}}
		>
			{/* Drag regions are the spacer and the filler only: a no-drag
			    carve-out under a drag ancestor is lost inside ZoomStable. */}
			<div
				className="flex h-8 w-full items-center pr-3.5"
				style={
					isMac
						? { height: `${WINDOW_CONTROLS_ROW_HEIGHT / zoomFactor}px` }
						: undefined
				}
			>
				{isMac ? (
					<div
						className="drag h-full shrink-0"
						style={{ width: `${TRAFFIC_LIGHTS_CLEARANCE / zoomFactor}px` }}
					/>
				) : (
					<div
						className="flex h-full shrink-0 items-center justify-center"
						style={{ width: COLLAPSED_WORKSPACE_SIDEBAR_WIDTH }}
					>
						<AppMenuButton />
					</div>
				)}
				<ZoomStable enabled={isMac} className="flex items-center">
					<div data-tsenta="sidebar-toggle" className="flex items-center">
						<SidebarToggle />
					</div>
				</ZoomStable>
				<div className="drag h-full min-w-0 flex-1" />
				<ZoomStable enabled={isMac} className="flex items-center">
					<div
						data-tsenta="sidebar-header-controls"
						className="flex items-center gap-2"
					>
						<OfflineBadge />
						{/* Here (persistent chrome) rather than the workspace tab bar,
						    which remounts on every navigation. */}
						<PortsDropdown align="end" />
						<NavigationControls />
					</div>
				</ZoomStable>
			</div>

			<nav
				aria-label={t({ message: "Navigation" })}
				className="flex w-full min-w-0 flex-col gap-0.5 border-b border-sidebar-border px-1.5 py-1.5"
			>
				<SidebarNavRow
					icon={House}
					label={<Trans>Home</Trans>}
					isActive={navigation.isWorkspacesOpen}
					onClick={navigation.openWorkspaces}
				/>
				<SidebarNavRow
					icon={Plus}
					label={<Trans>Create</Trans>}
					hotkey="NEW_WORKSPACE"
					restIndicator={
						hasNewWorkspaceDraft ? (
							<Pencil
								aria-hidden="true"
								className="size-3 text-sidebar-muted-foreground"
							/>
						) : undefined
					}
					onClick={() => openNewWorkspace()}
				/>
				<SidebarNavRow
					icon={Search}
					label={<Trans>Search</Trans>}
					hotkey="OPEN_COMMAND_PALETTE"
					onPointerDown={paletteToggle.onPointerDown}
					onClick={paletteToggle.onClick}
				/>
				<div className="relative">
					<SidebarNavRow
						icon={Clock}
						label={<Trans>Automations</Trans>}
						isActive={navigation.isAutomationsOpen}
						onClick={navigation.openAutomations}
					/>
					{myFailedCount > 0 && (
						<button
							type="button"
							onClick={navigation.openFailedAutomations}
							title={t({
								message: `${myFailedCount} of your automations failed their last run`,
							})}
							className="absolute top-1/2 right-1.5 flex h-4 min-w-4 -translate-y-1/2 items-center justify-center rounded-full bg-red-500/15 px-1 text-[10px] font-medium tabular-nums text-red-600 transition-colors hover:bg-red-500/25 dark:text-red-400"
						>
							{myFailedCount > 9 ? "9+" : myFailedCount}
						</button>
					)}
				</div>
				<SidebarNavRow
					icon={ClipboardList}
					label={<Trans>Tasks</Trans>}
					isActive={navigation.isTasksOpen}
					onClick={navigation.openTasks}
				/>
				<SidebarNavRow
					icon={GitPullRequest}
					label={<Trans>Pull requests</Trans>}
					isActive={navigation.isPullRequestsOpen}
					onClick={navigation.openPullRequests}
				/>
				<SidebarNavRow
					icon={FileText}
					label={<Trans>Pages</Trans>}
					isActive={navigation.isPagesOpen}
					onClick={navigation.openPages}
				/>
				{isUsageInSidebarEnabled && (
					<SidebarNavRow
						icon={Gauge}
						label={<Trans>Usage</Trans>}
						onClick={navigation.openUsage}
					/>
				)}
				{isPluginsEnabled && (
					<SidebarNavRow
						icon={Puzzle}
						label={<Trans>Plugins</Trans>}
						isActive={navigation.isPluginsOpen}
						onClick={navigation.openPlugins}
					/>
				)}
			</nav>
		</div>
	);
}
