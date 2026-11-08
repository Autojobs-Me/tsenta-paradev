import { quoteShellToken } from "renderer/lib/argv";
import { BOX_ID_PATTERN, type Box, isBoxProvider } from "../providers";

export type BoxAction = "start" | "stop" | "delete";

/**
 * Prefixes a `superset` command with the sign-in the app's other CLI dialogs
 * use. SUPERSET_ORGANIZATION_ID lets the bundled CLI act as the app's account
 * through the local host, the same way it does in a workspace terminal;
 * without a local host it signs in.
 */
export function withOrganizationSignIn(
	organizationId: string,
	command: string,
): string {
	const org = quoteShellToken(organizationId);
	return [
		`export SUPERSET_ORGANIZATION_ID=${org}`,
		`superset auth whoami >/dev/null 2>&1 || superset auth login --organization ${org} || exit 1`,
		command,
	].join("; ");
}

/**
 * The shell command that wakes, stops or deletes a box. It is rebuilt from
 * the box's provider and id, never taken from a stored wake command, and
 * refuses parts that did not come from `parseBoxWakeCommand`'s alphabet.
 */
export function buildBoxCommand(
	action: BoxAction,
	box: Pick<Box, "provider" | "id">,
	organizationId: string,
): string {
	if (!isBoxProvider(box.provider) || !BOX_ID_PATTERN.test(box.id)) {
		throw new Error("Not a box reference");
	}
	const ref = quoteShellToken(`${box.provider}:${box.id}`);
	const command =
		action === "delete"
			? `superset boxes delete ${ref} --yes`
			: `superset boxes ${action} ${ref}`;
	return withOrganizationSignIn(organizationId, command);
}
