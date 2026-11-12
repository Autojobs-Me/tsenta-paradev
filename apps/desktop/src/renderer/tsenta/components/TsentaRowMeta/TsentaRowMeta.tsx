import { AvatarStack } from "@superset/ui/atoms/AvatarStack";
import type { ReactNode } from "react";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { authClient } from "renderer/lib/auth-client";
import { useSandboxIsConnecting } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem/components/DashboardSidebarExpandedWorkspaceRow/components/DashboardSidebarOpenCloudHostGlyph/hooks/useSandboxIsConnecting";
import { DashboardSidebarWorkspaceHostGlyph } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem/components/DashboardSidebarExpandedWorkspaceRow/components/DashboardSidebarWorkspaceHostGlyph";
import { useSidebarWorkspaceStatus } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarWorkspaceStatusProvider";
import type { DashboardSidebarWorkspace } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { useCloudWorkspacePresence } from "renderer/routes/_authenticated/_dashboard/hooks/useCloudWorkspacePresence";
import { RowDiffStat } from "renderer/tsenta/components/RowDiffStat";
import { useMinuteClock } from "./hooks/useMinuteClock";
import { formatRowTime } from "./utils/formatRowTime";

interface TsentaRowMetaProps {
	workspace: DashboardSidebarWorkspace;
	/** The open workspace: only its cloud sandbox may be asked if it is connecting. */
	isActive?: boolean;
}

/**
 * A sidebar row's trailing meta under the Conductor skin (shell-sidebar
 * spec §4.7, item 5): the lines the branch changed when there are any
 * (Paradev fetches them for the open workspace), else the time since the
 * workspace's last agent activity ("2m", "now"), else Conductor's 12px
 * placeholder. Paradev's row hides it, with the rest of the slot, while
 * the archive button shows.
 *
 * It takes the place of the row's host glyph: sidebar.css hides what
 * follows it, and the hover card still names the host. The glyph comes back
 * ahead of the time only while it warns, as Conductor puts its small status
 * icons before the time: a remote device that is offline, or the open cloud
 * workspace's sandbox while it connects. Conductor's draft pencil is left
 * out: Paradev keeps composer drafts per chat session, not per workspace.
 */
export function TsentaRowMeta({
	workspace,
	isActive = false,
}: TsentaRowMetaProps) {
	if (workspace.hostType === "cloud" && isActive) {
		return <OpenCloudRowMeta workspace={workspace} />;
	}
	const isHostOffline =
		workspace.hostType === "remote-device" && workspace.hostIsOnline === false;
	return (
		<RowMeta
			workspace={workspace}
			hostWarning={
				isHostOffline ? (
					<DashboardSidebarWorkspaceHostGlyph
						hostType="remote-device"
						hostIsOnline={false}
					/>
				) : null
			}
		/>
	);
}

/** Paradev's hook opens the sandbox's socket: the open workspace's row only. */
function OpenCloudRowMeta({
	workspace,
}: {
	workspace: DashboardSidebarWorkspace;
}) {
	const isConnecting = useSandboxIsConnecting(workspace.id);
	return (
		<RowMeta
			workspace={workspace}
			hostWarning={
				isConnecting ? (
					<DashboardSidebarWorkspaceHostGlyph
						hostType="cloud"
						hostIsOnline={null}
						cloudState="connecting"
					/>
				) : null
			}
		/>
	);
}

function RowMeta({
	workspace,
	hostWarning,
}: {
	workspace: DashboardSidebarWorkspace;
	hostWarning: ReactNode;
}) {
	const { diffStats } = useSidebarWorkspaceStatus(workspace.id);
	const now = useMinuteClock();
	const hasDiff =
		diffStats !== null && (diffStats.additions > 0 || diffStats.deletions > 0);
	const activityAt =
		workspace.lastActivityAt ?? workspace.updatedAt?.getTime() ?? null;

	return (
		<span data-tsenta="ws-row-meta" className="flex shrink-0 items-center">
			{workspace.hostType === "cloud" && (
				<RowPresence workspaceId={workspace.id} />
			)}
			{hostWarning}
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

/**
 * Teammates in a cloud workspace right now, as small avatars before the time.
 * Watches the header's presence room in observe mode, so the sidebar never
 * counts as a visit; you are left out.
 * ponytail: one realtime socket per cloud row; an org-wide feed if rows get many.
 */
function RowPresence({ workspaceId }: { workspaceId: string }) {
	const organizationId = useActiveOrganizationId() ?? undefined;
	const { data: session } = authClient.useSession();
	const visitors = useCloudWorkspacePresence(workspaceId, {
		organizationId,
		observe: true,
	});
	const here = visitors.filter(
		(visitor) => visitor.active && visitor.userId !== session?.user?.id,
	);
	if (here.length === 0) return null;
	return (
		<span
			data-tsenta="ws-row-presence"
			title={here.map((visitor) => visitor.name).join(", ")}
		>
			<AvatarStack
				people={here.map((visitor) => ({
					id: visitor.userId,
					name: visitor.name,
					image: visitor.image,
				}))}
				size={14}
				max={2}
				className="px-0.5"
			/>
		</span>
	);
}
