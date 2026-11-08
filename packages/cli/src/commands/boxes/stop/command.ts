import { positional } from "@superset/cli-framework";
import { findBox } from "../../../lib/boxes/index";
import { command } from "../../../lib/command";

export default command({
	sandbox: false,
	description:
		"Stop a box so it stops billing compute; its disk stays, and `boxes start` or the app brings it back",
	args: [positional("box").required().desc("provider:id, id, or name")],
	run: async ({ args }) => {
		const { provider, box } = await findBox(args.box as string);
		await provider.stop(box.id);
		return {
			data: { ref: `${box.provider}:${box.id}` },
			message: `Stopped ${box.name}`,
		};
	},
});
