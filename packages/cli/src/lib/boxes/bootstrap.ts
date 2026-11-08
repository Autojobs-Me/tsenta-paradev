import { execFile } from "node:child_process";
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

/** Seconds without terminal or chat activity before a box counts as idle. */
export const ACTIVE_SECONDS = 120;

/**
 * Prints 1 while the box is in use, else 0, for both keepers (Daytona's
 * preview websocket, Blaxel's keepAlive), which run it every 10-15 s as
 * `sh <home>/.paradev-box/in-use.sh <start>`, passing their own start time
 * (epoch seconds) as $1.
 * ponytail: "in use" is terminal I/O or a chat write in the last 2 minutes.
 * The kernel stamps a pty's atime when its program reads input and its mtime
 * when it writes output (at most every 8 s), so a recent /dev/pts/N means
 * someone typed or something printed, which covers an agent that is working
 * in a terminal. A chat agent runs inside host-service with no pty; every
 * event of a chat turn is journalled to host-service's chat.db (WAL mode, so
 * chat.db-wal moves on each write), so a recently written chat.db* under
 * ~/.paradev/host counts too. The box user's home comes from the script's
 * own path, since Blaxel's keeper runs as root. An open app, an idle shell or
 * an agent waiting at its prompt touch nothing, so they no longer hold a box
 * awake (the old rule counted relay sockets, and every app that lists a host
 * holds one). A keeper's start counts as activity too, so a fresh wake reads
 * as busy; the keeper, or the provider's own timer, then gives the full
 * --idle window before the box stops. Upgrade path: ask host-service for its
 * running sessions once it exposes them.
 */
export const IN_USE_SH = `now=$(date +%s)
if [ -n "$1" ] && [ $((now - $1)) -lt ${ACTIVE_SECONDS} ]; then echo 1; exit 0; fi
for t in $(stat -c '%X %Y' /dev/pts/[0-9]* 2>/dev/null); do
	if [ $((now - t)) -lt ${ACTIVE_SECONDS} ]; then echo 1; exit 0; fi
done
chats="\${0%/.paradev-box/in-use.sh}/.paradev/host"
if [ -n "$(find "$chats" -maxdepth 2 -name 'chat.db*' -newermt "-${ACTIVE_SECONDS} seconds" 2>/dev/null | head -n 1)" ]; then echo 1; exit 0; fi
echo 0`;

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

/**
 * Signs the box's gh in with this machine's GitHub token and makes it git's
 * credential helper (which host-service clones with), then copies the git
 * identity. The token travels in the exec's env and gh reads it from stdin;
 * it is never in argv on either machine.
 */
export const GITHUB_SH = `set -e
command -v gh >/dev/null 2>&1 || { echo "gh is not installed on the box"; exit 127; }
printf '%s\\n' "$PARADEV_GH_TOKEN" | gh auth login --hostname github.com --with-token
gh auth setup-git --hostname github.com
if [ -n "$PARADEV_GIT_NAME" ]; then git config --global user.name "$PARADEV_GIT_NAME"; fi
if [ -n "$PARADEV_GIT_EMAIL" ]; then git config --global user.email "$PARADEV_GIT_EMAIL"; fi`;

/** stdout of a local command, or "" if it is missing or fails. */
function readLocal(file: string, args: string[]): Promise<string> {
	return new Promise((resolve) =>
		execFile(file, args, { timeout: 15_000 }, (error, stdout) =>
			resolve(error ? "" : stdout.trim()),
		),
	);
}

export async function signInGitHubOnBox(
	provider: BoxProvider,
	box: Box,
): Promise<{ name: string; email: string }> {
	const [token, name, email] = await Promise.all([
		// github.com's token even when GH_HOST names an Enterprise host: the
		// box signs in to github.com with it.
		readLocal("gh", ["auth", "token", "--hostname", "github.com"]),
		readLocal("git", ["config", "--global", "--get", "user.name"]),
		readLocal("git", ["config", "--global", "--get", "user.email"]),
	]);
	if (!token) {
		throw new CLIError(
			"This machine has no GitHub login to copy",
			"Run: gh auth login",
		);
	}
	await run(provider, box, "Signing in to GitHub", GITHUB_SH, {
		PARADEV_GH_TOKEN: token,
		PARADEV_GIT_NAME: name,
		PARADEV_GIT_EMAIL: email,
	});
	return { name, email };
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
