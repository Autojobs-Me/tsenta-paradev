import * as p from "@clack/prompts";
import { boolean, CLIError, positional } from "@superset/cli-framework";
import { createApiClient } from "../../../lib/api-client";
import { boxKeyName } from "../../../lib/boxes/bootstrap";
import { findBox, LABELS } from "../../../lib/boxes/index";
import { command } from "../../../lib/command";
import { revokeKeysNamed } from "../../../lib/ssh-host-setup/host-key";

export default command({
	sandbox: false,
	description:
		"Delete a box at its provider, revoke its API key and remove its host (its workspaces go with it)",
	args: [positional("box").required().desc("provider:id, id, or name")],
	options: {
		yes: boolean().desc("Delete without asking"),
	},
	run: async ({ ctx, args, options }) => {
		const { provider, box } = await findBox(args.box as string);
		if (!options.yes) {
			if (!process.stdin.isTTY) {
				throw new CLIError("Pass --yes to delete without a prompt.");
			}
			const ok = await p.confirm({
				message: `Delete ${box.name} at ${box.provider}, with everything on its disk?`,
			});
			if (p.isCancel(ok) || !ok) {
				return { data: { cancelled: true }, message: "Cancelled" };
			}
		}
		// Provider first: a box that still exists keeps billing, and a host
		// still running would re-register itself after host.delete.
		await provider.remove(box.id);
		const organizationId = box.labels[LABELS.org];
		const hostId = box.labels[LABELS.host];
		let revoked = 0;
		if (organizationId && hostId) {
			const api = createApiClient({ bearer: ctx.bearer, organizationId });
			revoked = await revokeKeysNamed(api, boxKeyName(box));
			await api.host.delete.mutate({ hostId }).catch((error: unknown) => {
				if (!/not found/i.test(String(error))) throw error;
			});
		}
		return {
			data: { ref: `${box.provider}:${box.id}`, hostId, revokedKeys: revoked },
			message: `Deleted ${box.name}`,
		};
	},
});
