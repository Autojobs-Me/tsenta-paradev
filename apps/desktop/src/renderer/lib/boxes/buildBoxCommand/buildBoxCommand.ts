import { quoteShellToken } from "renderer/lib/argv";
import {
	BOX_ID_PATTERN,
	type Box,
	isBoxHostId,
	isBoxProvider,
} from "../providers";

export type BoxAction = "start" | "stop" | "delete";

/**
 * The launcher Paradev Boxes writes into the home's bin/ (first on PATH in
 * Paradev terminals). It runs this app's bundled CLI as `superset boxes`;
 * the shared `superset` shim may point at a Paradev build without boxes.
 */
export const BOXES_LAUNCHER = "paradev-boxes";

/**
 * Ends a box command at once, saying what to do, where the launcher was never
 * written (a dev run, or a failed write). 127 is the shell's "not found".
 * Two plain `||` lists rather than a `{ ...; }` group, which fish 3 cannot
 * parse (the dialogs run through the user's login shell).
 */
const MISSING_LAUNCHER = `command -v ${BOXES_LAUNCHER} >/dev/null 2>&1`;
const REQUIRE_LAUNCHER = `${MISSING_LAUNCHER} || echo "${BOXES_LAUNCHER} is not installed: open Paradev Boxes once so it can install its launcher." >&2; ${MISSING_LAUNCHER} || exit 127`;

/**
 * Prefixes a box command with a check for the launcher, then the sign-in the
 * app's other CLI dialogs use. SUPERSET_ORGANIZATION_ID lets the CLI act as
 * the app's account through the local host, the same way it does in a
 * workspace terminal; without a local host it signs in. Sign-in goes through
 * the stock `superset` CLI, which every Paradev build has and which shares
 * its sign-in with `paradev-boxes`.
 */
export function withBoxesPreamble(
	organizationId: string,
	command: string,
): string {
	const org = quoteShellToken(organizationId);
	return [
		REQUIRE_LAUNCHER,
		`export SUPERSET_ORGANIZATION_ID=${org}`,
		`superset auth whoami >/dev/null 2>&1 || superset auth login --organization ${org} || exit 1`,
		command,
	].join("; ");
}

/**
 * The shell command that wakes, stops or deletes a box. It is rebuilt from
 * the box's provider and id, never taken from a stored wake command, and
 * refuses parts that did not come from `parseBoxWakeCommand`'s alphabet.
 * `--expect-host` makes the CLI refuse a box labelled for another host, so a
 * wake command pointed at someone else's box cannot act on it.
 */
export function buildBoxCommand(
	action: BoxAction,
	box: Pick<Box, "provider" | "id"> & { hostId: string },
	organizationId: string,
): string {
	if (
		!isBoxProvider(box.provider) ||
		!BOX_ID_PATTERN.test(box.id) ||
		!isBoxHostId(box.hostId)
	) {
		throw new Error("Not a box reference");
	}
	const ref = quoteShellToken(`${box.provider}:${box.id}`);
	const host = quoteShellToken(box.hostId);
	const command = `${BOXES_LAUNCHER} ${action} ${ref} --expect-host ${host}`;
	return withBoxesPreamble(
		organizationId,
		action === "delete" ? `${command} --yes` : command,
	);
}
