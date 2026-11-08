import { type Box, isBoxHostId, parseBoxWakeCommand } from "renderer/lib/boxes";
import type { ElectronRouterOutputs } from "renderer/lib/electron-trpc";

/** A box as its provider reports it, from the main process's `boxes.list`. */
export type BoxStatus = ElectronRouterOutputs["boxes"]["list"]["boxes"][number];

/**
 * A host that runs on a box. Which hosts are boxes comes only from their
 * stored wake commands; the provider fields are null until this machine has
 * read the box from its provider (not asked for, no keys here, provider down,
 * still loading).
 */
export interface BoxHost extends Box {
	hostId: string;
	/** The host's name, as the host list has it. */
	hostName: string | null;
	/** The provider's own state word (started, stopped, paused, standby...). */
	providerState: string | null;
	running: boolean | null;
	region: string | null;
}

interface HostWakeCommand {
	id: string;
	name?: string | null;
	wakeCommand: string | null | undefined;
}

function boxKey(box: { provider: string; id: string }): string {
	return `${box.provider}:${box.id}`;
}

export function hasBoxHost(
	hosts: readonly HostWakeCommand[] | undefined,
): boolean {
	return (
		hosts?.some((host) => parseBoxWakeCommand(host.wakeCommand) !== null) ??
		false
	);
}

/**
 * Box hosts by host id. A provider status joins the host whose wake command
 * names that same box (provider and id), so a stale `paradev-host` label on
 * some other box can never lend this host its state. A host is left out when
 * the box it names is labelled for another host (its wake command points at
 * someone else's box), or when its id could not go to `--expect-host`.
 */
export function buildBoxHosts(
	hosts: readonly HostWakeCommand[] | undefined,
	statuses: readonly BoxStatus[] | undefined,
): Map<string, BoxHost> {
	const statusByBox = new Map<string, BoxStatus>();
	for (const status of statuses ?? []) {
		statusByBox.set(boxKey(status), status);
	}
	const boxHosts = new Map<string, BoxHost>();
	for (const host of hosts ?? []) {
		const box = parseBoxWakeCommand(host.wakeCommand);
		if (!box || !isBoxHostId(host.id)) continue;
		const status = statusByBox.get(boxKey(box));
		if (status?.hostId && status.hostId !== host.id) continue;
		boxHosts.set(host.id, {
			...box,
			hostId: host.id,
			hostName: host.name ?? null,
			providerState: status?.state ?? null,
			running: status?.running ?? null,
			region: status?.region ?? null,
		});
	}
	return boxHosts;
}
