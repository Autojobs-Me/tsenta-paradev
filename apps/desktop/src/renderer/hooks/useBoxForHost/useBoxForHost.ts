import { useMemo } from "react";
import { type Box, parseBoxWakeCommand } from "renderer/lib/boxes";
import { cloudTrpc } from "renderer/lib/cloud-trpc";

// A box's wake command is written once, by `superset boxes create`, and the
// box dialogs invalidate the list themselves.
const WAKE_COMMAND_STALE_MS = 5 * 60_000;

/**
 * The box a host runs on, or null when the host is not a box. Read from the
 * host's stored wake command, which only counts when it parses as a box's.
 */
export function useBoxForHost(
	organizationId: string | null | undefined,
	hostId: string | null | undefined,
): Box | null {
	const { data } = cloudTrpc.host.list.useQuery(
		{ organizationId: organizationId ?? "" },
		{
			enabled: Boolean(organizationId && hostId),
			staleTime: WAKE_COMMAND_STALE_MS,
		},
	);
	const wakeCommand = data?.find((host) => host.id === hostId)?.wakeCommand;
	return useMemo(() => parseBoxWakeCommand(wakeCommand), [wakeCommand]);
}
