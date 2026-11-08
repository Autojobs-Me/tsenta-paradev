import { randomBytes } from "node:crypto";
import { CLIError } from "@superset/cli-framework";
import { hostIdFromMachineId } from "@superset/shared/host-info";
import type { ApiClient } from "../api-client";
import { revokeKeysNamed } from "../ssh-host-setup/host-key";
import { type Box, type BoxProvider, LABELS } from "./types";

const ONLINE_TIMEOUT_MS = 120_000;
const BIN = '"$HOME/superset/bin/superset"';

/**
 * A box's identity is chosen here, before the box exists: its machine id is
 * written into the box and its host id (an HMAC of that id) is stored in the
 * box's labels, so every box gets a distinct host and list/delete can find
 * the host without waking the box.
 */
export function newIdentity(): { machineId: string; hostId: string } {
	const machineId = randomBytes(16).toString("hex");
	return { machineId, hostId: hostIdFromMachineId(machineId) };
}

/** The API key a box signs in with; delete revokes it by this name. */
export function boxKeyName(box: Pick<Box, "provider" | "labels">): string {
	const hostId = box.labels[LABELS.host] ?? "unknown";
	return `Box ${hostId.slice(0, 8)} ${box.provider}`.slice(0, 32);
}

/**
 * Pins the machine id, records the cgroup's limits for login shells (a
 * container's /proc shows the whole server), and installs the Paradev CLI
 * if the image did not. Idempotent: safe on every create.
 */
const PREPARE = `set -e
cd "$HOME"
SUDO=""; [ "$(id -u)" = 0 ] || SUDO="sudo -n"
if [ "$(cat /etc/machine-id 2>/dev/null)" != "$PARADEV_MACHINE_ID" ]; then
	printf '%s\\n' "$PARADEV_MACHINE_ID" | $SUDO tee /etc/machine-id >/dev/null 2>&1
fi
mem=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || echo max)
if [ "$mem" = max ]; then mem=$(awk '/MemTotal/ {print $2 * 1024}' /proc/meminfo); fi
cpus=$(awk -v n="$(nproc)" '{ if ($1 == "max") print n; else print int(($1 + $2 - 1) / $2) }' /sys/fs/cgroup/cpu.max 2>/dev/null || nproc)
$SUDO mkdir -p /etc/paradev-box 2>/dev/null
printf 'export SUPERSET_SANDBOX_MEMORY_MB=%s SUPERSET_SANDBOX_VCPUS=%s\\n' "$((mem / 1048576))" "$cpus" | $SUDO tee /etc/paradev-box/resources.env >/dev/null 2>&1
if [ ! -x "$HOME/superset/bin/superset-host" ]; then
	curl -fsSL https://paradev.com/cli/install.sh -o /tmp/paradev-install.sh
	SUPERSET_HOME="$HOME/superset" SUPERSET_VERSION=latest sh /tmp/paradev-install.sh --no-next-steps >/dev/null
	rm -f /tmp/paradev-install.sh
fi
echo "paradev-cli=$(${BIN} --version)"`;

/**
 * Prints 1 while the box is in use, else 0, for the providers' keepers.
 * ponytail: "in use" is host-service holding more than one outbound TLS
 * connection, or an agent CLI running. The relay control socket is the
 * baseline and API sockets close within seconds; every Paradev app that lists
 * the host holds an events socket through the relay, each open terminal one
 * more. So a box stays awake while an app is open on it or an agent works.
 * Upgrade path: ask host-service for its client count once it exposes one.
 */
export const IN_USE_SH = `hs=$(pgrep -f 'lib/host-service.js' | head -n 1)
clients=0; [ -n "$hs" ] && clients=$(ss -Htnp state established '( dport = :443 )' 2>/dev/null | grep -c "pid=$hs,")
agents=$(pgrep -fc '(^|/)(claude|codex|pdev)( |$)' 2>/dev/null | head -n 1)
if [ "$clients" -gt 1 ] || [ "\${agents:-0}" -gt 0 ]; then echo 1; else echo 0; fi`;

const SIGN_IN = `printf '%s\\n' "$PARADEV_BOX_KEY" | ${BIN} auth login --api-key=- --organization "$PARADEV_ORG" --json >/dev/null`;

/**
 * A box that was stopped has no processes; one that was paused kept them,
 * but its relay socket died with the pause and host-service would only
 * notice after 75 s of silence. Restarting host-service fixes both; terminals
 * live in pty-daemon, which \`stop\` leaves running.
 */
function startScript(restart: boolean): string {
	return `cd "$HOME"
mkdir -p "$HOME/.paradev-box" && printf '%s\\n' "$PARADEV_IN_USE" > "$HOME/.paradev-box/in-use.sh"
${restart ? `${BIN} stop --org "$PARADEV_ORG" >/dev/null 2>&1 || true` : ""}
${BIN} start --daemon --auto-update --org "$PARADEV_ORG" --json`;
}

async function run(
	provider: BoxProvider,
	box: Box,
	step: string,
	script: string,
	env: Record<string, string>,
): Promise<string> {
	const result = await provider.exec(box.id, script, env);
	if (result.exitCode !== 0) {
		throw new CLIError(
			`${step} on ${provider.name} box ${box.name} failed (exit ${result.exitCode})`,
			result.output.trim().slice(-1500) || undefined,
		);
	}
	return result.output.trim();
}

export async function prepareBox(provider: BoxProvider, box: Box) {
	const machineId = box.labels[LABELS.machineId];
	if (!machineId) throw new CLIError(`Box ${box.name} has no machine id label`);
	return run(provider, box, "Preparing", PREPARE, {
		PARADEV_MACHINE_ID: machineId,
	});
}

/** Mints a per-box API key and signs the box's CLI in with it (over env, never argv). */
export async function signInBox({
	provider,
	box,
	api,
	organizationId,
}: {
	provider: BoxProvider;
	box: Box;
	api: ApiClient;
	organizationId: string;
}): Promise<void> {
	const keyName = boxKeyName(box);
	await revokeKeysNamed(api, keyName);
	const { key } = await api.apiKey.create.mutate({ name: keyName });
	try {
		await run(provider, box, "Signing in", SIGN_IN, {
			PARADEV_BOX_KEY: key,
			PARADEV_ORG: organizationId,
		});
	} catch (error) {
		await revokeKeysNamed(api, keyName).catch(() => {});
		throw error;
	}
}

export async function startHostOnBox({
	provider,
	box,
	organizationId,
	restart,
}: {
	provider: BoxProvider;
	box: Box;
	organizationId: string;
	restart: boolean;
}): Promise<void> {
	await run(provider, box, "Starting the host", startScript(restart), {
		PARADEV_ORG: organizationId,
		PARADEV_IN_USE: IN_USE_SH,
	});
}

export async function waitOnline(
	api: ApiClient,
	organizationId: string,
	hostId: string,
	signal?: AbortSignal,
): Promise<boolean> {
	const deadline = Date.now() + ONLINE_TIMEOUT_MS;
	while (Date.now() < deadline && !signal?.aborted) {
		const hosts = await api.host.list.query({ organizationId }).catch(() => []);
		if (hosts.find((row) => row.id === hostId)?.online) return true;
		await Bun.sleep(1_000);
	}
	return false;
}
