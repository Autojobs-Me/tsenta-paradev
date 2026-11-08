import { useCallback, useMemo } from "react";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { type BoxHost, buildBoxHosts, hasBoxHost } from "./useBoxHosts.utils";

// A box's wake command is written once, by `paradev-boxes create`, and the
// box dialogs invalidate the list themselves.
const WAKE_COMMAND_STALE_MS = 5 * 60_000;
// The main process caches the provider list for 15 s, so asking sooner gets
// the same answer back.
const PROVIDER_STATE_STALE_MS = 15_000;
const PROVIDER_STATE_POLL_MS = 30_000;

export interface UseBoxHostsOptions {
	/**
	 * Also read each box's state from its provider. That runs the bundled CLI,
	 * which calls every provider's API, every 30 s while mounted, so only the
	 * surfaces that show the state ask for it. Off by default.
	 */
	providerState?: boolean;
}

/**
 * Every host in the organization that runs on a box, by host id. Which hosts
 * are boxes comes from the hosts' stored wake commands. With `providerState`,
 * each is joined with what its provider reports, read on this machine with
 * the bundled CLI, and the provider is asked only while some host is a box.
 */
export function useBoxHosts(
	organizationId: string | null | undefined,
	{ providerState = false }: UseBoxHostsOptions = {},
): Map<string, BoxHost> {
	const { data: hosts } = cloudTrpc.host.list.useQuery(
		{ organizationId: organizationId ?? "" },
		{
			enabled: Boolean(organizationId),
			staleTime: WAKE_COMMAND_STALE_MS,
		},
	);
	const { data: providerList } = electronTrpc.boxes.list.useQuery(undefined, {
		enabled: providerState && hasBoxHost(hosts),
		staleTime: PROVIDER_STATE_STALE_MS,
		refetchInterval: PROVIDER_STATE_POLL_MS,
		refetchOnWindowFocus: true,
	});
	// A disabled query still returns what another surface cached; leave it
	// out so a caller that did not ask never sees provider state.
	const statuses = providerState ? providerList?.boxes : undefined;
	return useMemo(() => buildBoxHosts(hosts, statuses), [hosts, statuses]);
}

/**
 * Re-reads every box from its provider now, past the main process's cache,
 * for after a box command changed one. The answer replaces what the
 * provider-state surfaces show.
 */
export function useRefreshBoxStates(): () => void {
	const utils = electronTrpc.useUtils();
	return useCallback(() => {
		void electronTrpcClient.boxes.list
			.query({ fresh: true })
			.then((result) => utils.boxes.list.setData(undefined, result))
			.catch(() => utils.boxes.list.invalidate());
	}, [utils]);
}
