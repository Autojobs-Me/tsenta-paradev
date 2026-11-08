import { CLIError, positional, string } from "@superset/cli-framework";
import { createApiClient } from "../../../lib/api-client";
import { startHostOnBox, waitOnline } from "../../../lib/boxes/bootstrap";
import { assertExpectedHost, findBox, LABELS } from "../../../lib/boxes/index";
import { command } from "../../../lib/command";

export default command({
	sandbox: false,
	description:
		"Start (or resume) a box and its host; this is the wake command a box's host carries",
	args: [positional("box").required().desc("provider:id, id, or name")],
	options: {
		expectHost: string().desc(
			"Refuse unless the box belongs to this host id (the app passes the host it acts on)",
		),
	},
	run: async ({ ctx, args, options, signal }) => {
		const { provider, box } = await findBox(args.box as string);
		assertExpectedHost(box, options.expectHost);
		const organizationId = box.labels[LABELS.org];
		const hostId = box.labels[LABELS.host];
		if (!organizationId || !hostId) {
			throw new CLIError(`Box ${box.name} is missing its Paradev labels`);
		}
		const api = createApiClient({ bearer: ctx.bearer, organizationId });
		const started = Date.now();
		await provider.start(box.id);
		await startHostOnBox({
			provider,
			box,
			organizationId,
			restart: !box.running,
		});
		await provider.keepAwake?.(box);
		if (!(await waitOnline(api, organizationId, hostId, signal))) {
			throw new CLIError(
				`${box.name} started but its host did not come online`,
			);
		}
		const seconds = ((Date.now() - started) / 1000).toFixed(1);
		return {
			data: {
				ref: `${box.provider}:${box.id}`,
				hostId,
				seconds: Number(seconds),
			},
			message: `${box.name} (${hostId}) is online after ${seconds}s`,
		};
	},
});
