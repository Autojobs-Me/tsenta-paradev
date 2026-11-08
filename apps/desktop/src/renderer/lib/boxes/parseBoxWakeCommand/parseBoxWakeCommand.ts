import type { Box, BoxProvider } from "../providers";

// `paradev-boxes` is the launcher Paradev Boxes writes into the home's bin/;
// `superset boxes` is what boxes created before it carry.
const BOX_WAKE_COMMAND =
	/^(?:paradev-boxes|superset boxes) start (daytona|e2b|blaxel):([A-Za-z0-9._-]+)$/;

/**
 * Reads the box behind a host from its stored wake command.
 *
 * The wake command is a string the server stores, so this is a security
 * boundary: only the two exact forms box creation has written are accepted
 * (`paradev-boxes start <provider>:<id>`, and the older
 * `superset boxes start <provider>:<id>`), with no surrounding whitespace,
 * extra arguments or shell syntax. Callers rebuild any command they run from
 * the parts returned here and never run the stored string itself.
 */
export function parseBoxWakeCommand(
	command: string | null | undefined,
): Box | null {
	if (typeof command !== "string") return null;
	const match = BOX_WAKE_COMMAND.exec(command);
	if (!match) return null;
	const provider = match[1] as BoxProvider;
	const id = match[2] as string;
	return { provider, id, ref: `${provider}:${id}` };
}
