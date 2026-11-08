import { Trans } from "@lingui/react/macro";
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@superset/ui/dropdown-menu";
import { HiOutlinePower } from "react-icons/hi2";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { useBoxHosts } from "renderer/hooks/useBoxHosts";
import { useBoxDialogStore } from "renderer/stores/box-dialog";

interface PickerHost {
	id: string;
	name: string;
	isOnline: boolean;
	isConnecting: boolean;
}

interface BoxWakeMenuItemsProps {
	hosts: readonly PickerHost[];
}

/**
 * Paradev Boxes (fork-owned). "Wake <host>" items, after a separator, for
 * each offline box among a menu's hosts; nothing when there is none. An item
 * only opens the app-wide Wake dialog: it does not pick the host, since the
 * menu it sits in may belong to a form (an automation's target host).
 */
export function BoxWakeMenuItems({ hosts }: BoxWakeMenuItemsProps) {
	const organizationId = useActiveOrganizationId();
	const boxHosts = useBoxHosts(organizationId);
	const openBoxDialog = useBoxDialogStore((state) => state.open);
	if (!organizationId) return null;
	const wakeable = hosts.flatMap((host) => {
		const box = boxHosts.get(host.id);
		return box && !host.isOnline && !host.isConnecting ? [{ host, box }] : [];
	});
	if (wakeable.length === 0) return null;

	return (
		<>
			<DropdownMenuSeparator />
			{wakeable.map(({ host, box }) => {
				const hostName = host.name;
				return (
					<DropdownMenuItem
						key={`wake-${host.id}`}
						onSelect={() =>
							openBoxDialog({ box, organizationId, hostName, action: "start" })
						}
					>
						<HiOutlinePower className="size-4" />
						<span className="min-w-0 truncate">
							<Trans>Wake {hostName}</Trans>
						</span>
					</DropdownMenuItem>
				);
			})}
		</>
	);
}
