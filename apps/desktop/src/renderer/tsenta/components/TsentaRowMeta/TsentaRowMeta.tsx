import { useSidebarWorkspaceStatus } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarWorkspaceStatusProvider";
import type { DashboardSidebarWorkspace } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { RowDiffStat } from "renderer/tsenta/components/RowDiffStat";
import { useMinuteClock } from "./hooks/useMinuteClock";
import { formatRowTime } from "./utils/formatRowTime";

/**
 * A sidebar row's trailing meta under the Conductor skin (shell-sidebar
 * spec §4.7, item 5): the lines the branch changed when there are any
 * (Paradev fetches them for the open workspace), else the time since the
 * workspace's last agent activity ("2m", "now"), else Conductor's 12px
 * placeholder. Paradev's row hides it, with the rest of the slot, while
 * the archive button shows.
 *
 * It takes the place of the row's host glyph: sidebar.css hides what
 * follows it, and the hover card still names the host. Conductor's draft
 * pencil is left out: Paradev keeps composer drafts per chat session, not
 * per workspace.
 */
export function TsentaRowMeta({
	workspace,
}: {
	workspace: DashboardSidebarWorkspace;
}) {
	const { diffStats } = useSidebarWorkspaceStatus(workspace.id);
	const now = useMinuteClock();
	const hasDiff =
		diffStats !== null && (diffStats.additions > 0 || diffStats.deletions > 0);
	const activityAt =
		workspace.lastActivityAt ?? workspace.updatedAt?.getTime() ?? null;

	return (
		<span data-tsenta="ws-row-meta" className="flex shrink-0 items-center">
			{hasDiff ? (
				<RowDiffStat workspaceId={workspace.id} />
			) : activityAt !== null && Number.isFinite(activityAt) ? (
				<span className="whitespace-nowrap px-1 py-0.5 text-3xs text-sidebar-muted-foreground/70">
					{formatRowTime(activityAt, now)}
				</span>
			) : (
				<span aria-hidden="true" className="size-3" />
			)}
		</span>
	);
}
