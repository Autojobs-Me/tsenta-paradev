import { cn } from "@superset/ui/utils";
import type { ReactNode } from "react";
import { useWindowChromeVisible } from "renderer/routes/_authenticated/_dashboard/components/WindowChrome";
import { V2OpenInMenuButton } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/V2OpenInMenuButton";
import { useWorkspaceOpenInTarget } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/useWorkspaceOpenInTarget";
import { useWorkspaceRightSidebarOpen } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/useWorkspaceRightPane/hooks/useWorkspaceRightSidebarOpen";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";
import { BaseBranchMenu } from "./components/BaseBranchMenu";
import { HeaderPrControls } from "./components/HeaderPrControls";
import { WorkspaceTaskChip } from "./components/WorkspaceTaskChip";
import { WorkspaceTitle } from "./components/WorkspaceTitle";

interface TsentaWorkspaceHeaderProps {
	/** What led Paradev's tab bar: the window chrome while the sidebar is hidden. */
	leading?: ReactNode;
	/** What trailed Paradev's tab bar: share, activity, more and the panel toggle. */
	trailing?: ReactNode;
}

/**
 * Conductor's workspace header (plan step 9; workspace-chat spec §1,
 * shell-sidebar spec §1.3): a 40px row on the chrome above the content
 * sheet, holding the window chrome while the sidebar is hidden, the
 * workspace's status and name with its id, and on the right the branch,
 * the open-in button, the pull request pill and git action (while the right
 * panel is closed), then the controls Paradev kept at the end of its tab
 * bar. The whole row drags the window.
 */
export function TsentaWorkspaceHeader({
	leading,
	trailing,
}: TsentaWorkspaceHeaderProps) {
	const { workspace } = useWorkspace();
	const isChromeVisible = useWindowChromeVisible();
	const openInTarget = useWorkspaceOpenInTarget(workspace.id);
	const { isOpen: isRightPaneOpen } = useWorkspaceRightSidebarOpen();
	const name = workspace.name || workspace.branch;

	return (
		<div
			data-tsenta="workspace-header"
			className={cn(
				"sheet-canvas drag relative flex h-10 shrink-0 items-center justify-between gap-3 pr-3",
				isChromeVisible ? "pl-0" : "pl-2",
			)}
		>
			<div className="flex min-w-0 shrink items-center gap-1 overflow-hidden">
				{leading && (
					<div className="no-drag flex h-full shrink-0 items-center">
						{leading}
					</div>
				)}
				<WorkspaceTitle />
				<WorkspaceTaskChip />
				<BaseBranchMenu />
			</div>
			<div
				data-tsenta="workspace-header-actions"
				className="no-drag flex min-w-0 shrink-0 items-center gap-3"
			>
				{workspace.branch && workspace.branch !== name && (
					<span
						className="drag block min-w-0 max-w-40 shrink truncate text-xs text-muted-foreground"
						title={workspace.branch}
					>
						{workspace.branch}
					</span>
				)}
				{/* No hotkeys: the more menu already binds open-in to this path. */}
				{openInTarget && (
					<V2OpenInMenuButton
						path={openInTarget.worktreePath}
						projectId={openInTarget.projectId}
						hotkeys={false}
					/>
				)}
				{/* With the right panel open, its own header holds these. */}
				{!isRightPaneOpen && <HeaderPrControls />}
				<div data-tsenta="workspace-header-trailing" className="contents">
					{trailing}
				</div>
			</div>
		</div>
	);
}
