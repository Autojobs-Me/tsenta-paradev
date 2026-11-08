import { useLingui } from "@lingui/react/macro";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { useBoxHosts } from "renderer/hooks/useBoxHosts";
import { boxStateLabel } from "renderer/lib/boxes";

interface BoxHostStateProps {
	hostId: string;
	isOnline: boolean;
}

/**
 * Paradev Boxes (fork-owned). In a host picker row, what the provider says
 * about an offline host's box ("Stopped", "Sleeping"...), and nothing for a
 * host that is online or not a box. The provider is asked only while some
 * offline row shows.
 */
export function BoxHostState({ hostId, isOnline }: BoxHostStateProps) {
	const { i18n } = useLingui();
	const organizationId = useActiveOrganizationId();
	const boxHosts = useBoxHosts(isOnline ? null : organizationId, {
		providerState: true,
	});
	const label = isOnline
		? null
		: boxStateLabel(boxHosts.get(hostId)?.providerState);
	if (!label) return null;
	return (
		<span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
			{i18n._(label)}
		</span>
	);
}
