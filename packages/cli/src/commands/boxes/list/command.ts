import { string, table } from "@superset/cli-framework";
import {
	configuredProviders,
	LABELS,
	provider,
} from "../../../lib/boxes/index";
import { command } from "../../../lib/command";
import { resolveOrganizationFromContext } from "../../../lib/resolve-org";

export default command({
	sandbox: false,
	description:
		"List your boxes at every provider with credentials, and whether each host is online",
	options: {
		provider: string().desc("Only this provider"),
		org: string().desc("Organization (id, slug, or name); defaults to active"),
	},
	display: (data) =>
		table(
			data as Record<string, unknown>[],
			["name", "provider", "state", "online", "region", "ref"],
			["NAME", "PROVIDER", "STATE", "ONLINE", "REGION", "REF"],
		),
	run: async ({ ctx, options }) => {
		const { id: organizationId } = await resolveOrganizationFromContext(
			ctx.api,
			ctx.config.organizationId,
			options.org,
		);
		const names = options.provider ? [options.provider] : configuredProviders();
		const [hosts, ...perProvider] = await Promise.all([
			ctx.api.host.list.query({ organizationId }),
			...names.map(async (name) => (await provider(name)).list()),
		]);
		const online = new Map(hosts.map((host) => [host.id, host.online]));
		return perProvider
			.flat()
			.filter((box) => box.labels[LABELS.org] === organizationId)
			.map((box) => ({
				name: box.name,
				provider: box.provider,
				state: box.state,
				online: online.get(box.labels[LABELS.host] ?? "") ? "yes" : "no",
				region: box.region ?? "",
				ref: `${box.provider}:${box.id}`,
				hostId: box.labels[LABELS.host] ?? null,
			}));
	},
});
