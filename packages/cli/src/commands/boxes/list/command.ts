import { boolean, string, table } from "@superset/cli-framework";
import {
	boxStatus,
	configuredProviders,
	LABELS,
	listBoxes,
	PROVIDERS,
} from "../../../lib/boxes/index";
import { command } from "../../../lib/command";
import { resolveAuth } from "../../../lib/resolve-auth";
import { resolveOrganizationFromContext } from "../../../lib/resolve-org";

const warn = (message: string) => console.error(`Warning: ${message}`);

export default command({
	sandbox: false,
	// The root middleware signs in before any command runs, and the
	// framework cannot skip it per invocation. --providers-only must work
	// signed out (the app polls it), so this command signs in itself below,
	// the way the middleware does, only when it needs Paradev's API.
	skipMiddleware: true,
	description:
		"List your boxes at every provider with credentials, and whether each host is online",
	options: {
		provider: string()
			.enum(...(PROVIDERS as [string, ...string[]]))
			.desc("Only this provider"),
		org: string().desc(
			"Organization (id, slug, or name); defaults to active. With --providers-only, an id, and every organization when omitted",
		),
		providersOnly: boolean().desc(
			"Ask only the providers: no Paradev sign-in, no ONLINE column",
		),
	},
	display: (data) =>
		table(
			data as Record<string, unknown>[],
			["name", "provider", "state", "online", "region", "ref"],
			["NAME", "PROVIDER", "STATE", "ONLINE", "REGION", "REF"],
		),
	run: async ({ options }) => {
		const names = options.provider ? [options.provider] : configuredProviders();
		if (options.providersOnly) {
			return (await listBoxes(names, { warn }))
				.map(boxStatus)
				.filter((box) => !options.org || box.organizationId === options.org);
		}

		const apiKey = (options as Record<string, unknown>).apiKey;
		const ctx = await resolveAuth(
			typeof apiKey === "string" ? apiKey : undefined,
		);
		const { id: organizationId } = await resolveOrganizationFromContext(
			ctx.api,
			ctx.config.organizationId,
			options.org,
		);
		const [hosts, boxes] = await Promise.all([
			ctx.api.host.list.query({ organizationId }),
			listBoxes(names, { warn }),
		]);
		const online = new Map(hosts.map((host) => [host.id, host.online]));
		return boxes
			.filter((box) => box.labels[LABELS.org] === organizationId)
			.map((box) => {
				const status = boxStatus(box);
				return {
					...status,
					online: online.get(status.hostId ?? "") ? "yes" : "no",
				};
			});
	},
});
