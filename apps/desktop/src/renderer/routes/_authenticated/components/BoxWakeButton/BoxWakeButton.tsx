import { Trans } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { useWakeBox } from "renderer/hooks/useWakeBox";
import type { RemoteHostPresence } from "renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/utils/resolveRemoteHostPresence";

interface BoxWakeButtonProps {
	hostId: string | null | undefined;
	/** The host's presence where it is shown; only "offline" shows the button. */
	presence: RemoteHostPresence | null | undefined;
	/** Defaults to the host's name in the host list. */
	hostName?: string;
	/** The host's organization; this window's when left out. */
	organizationId?: string | null;
	/** "compact" fits the new-workspace composer, "sm" a settings row. */
	size?: "compact" | "sm";
}

/**
 * Paradev Boxes (fork-owned). A "Wake box" button for a host that is an
 * offline box, and nothing for any other host. It opens the app-wide Wake
 * dialog, so a surface only has to place the button.
 */
export function BoxWakeButton({
	hostId,
	presence,
	hostName,
	organizationId,
	size = "compact",
}: BoxWakeButtonProps) {
	const activeOrganizationId = useActiveOrganizationId();
	const wakeBox = useWakeBox(
		organizationId ?? activeOrganizationId,
		presence === "offline" ? hostId : null,
		hostName,
	);
	if (!wakeBox.open) return null;
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className={size === "compact" ? "h-6 px-2 text-[11px]" : undefined}
			onClick={wakeBox.open}
		>
			<Trans>Wake box</Trans>
		</Button>
	);
}
