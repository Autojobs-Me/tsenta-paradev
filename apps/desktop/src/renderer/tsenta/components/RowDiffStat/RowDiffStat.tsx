import { useSidebarWorkspaceStatus } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarWorkspaceStatusProvider";
import { formatCompactCount } from "./formatCompactCount";

/**
 * Lines added and removed, in a sidebar row's trailing slot (shell-sidebar
 * spec §4.7, trailing meta item 5): 11px mono, +N in git green and -N in git
 * red, nothing while the branch is clean.
 *
 * The counts come from the sidebar's status store, which fetches them for the
 * open workspace only: Paradev keeps no git watch on the other rows (each
 * one costs a recursive file watch on the host), so those rows show none.
 * That is also the one row whose counts Conductor colours by default.
 */
export function RowDiffStat({ workspaceId }: { workspaceId: string }) {
	const { diffStats } = useSidebarWorkspaceStatus(workspaceId);
	if (!diffStats || (diffStats.additions === 0 && diffStats.deletions === 0)) {
		return null;
	}
	return (
		<span className="flex shrink-0 items-center gap-1 px-1 py-0.5 font-medium font-mono text-2xs">
			{diffStats.additions > 0 && (
				<span className="text-git-green">
					+{formatCompactCount(diffStats.additions)}
				</span>
			)}
			{diffStats.deletions > 0 && (
				<span className="text-git-red">
					-{formatCompactCount(diffStats.deletions)}
				</span>
			)}
		</span>
	);
}
