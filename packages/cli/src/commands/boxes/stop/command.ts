import { positional, string } from "@superset/cli-framework";
import { assertExpectedHost, findBox } from "../../../lib/boxes/index";
import { command } from "../../../lib/command";

export default command({
	sandbox: false,
	description:
		"Stop a box so it stops billing compute; its disk stays, and `boxes start` or the app brings it back",
	args: [positional("box").required().desc("provider:id, id, or name")],
	options: {
		expectHost: string().desc(
			"Refuse unless the box belongs to this host id (the app passes the host it acts on)",
		),
	},
	run: async ({ args, options }) => {
		const { provider, box } = await findBox(args.box as string);
		assertExpectedHost(box, options.expectHost);
		await provider.stop(box.id);
		return {
			data: { ref: `${box.provider}:${box.id}` },
			message: `Stopped ${box.name}`,
		};
	},
});
