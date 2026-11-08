import {
	type BoxHost,
	type UseBoxHostsOptions,
	useBoxHosts,
} from "renderer/hooks/useBoxHosts";

/**
 * The box a host runs on, or null when the host is not a box. Read from the
 * host's stored wake command, which only counts when it parses as a box's,
 * plus, with `providerState`, what the box's provider reports when this
 * machine can read it.
 */
export function useBoxForHost(
	organizationId: string | null | undefined,
	hostId: string | null | undefined,
	options?: UseBoxHostsOptions,
): BoxHost | null {
	// With no host to look up, query nothing.
	const boxHosts = useBoxHosts(hostId ? organizationId : null, options);
	return hostId ? (boxHosts.get(hostId) ?? null) : null;
}
