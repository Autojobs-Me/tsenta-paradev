import * as p from "@clack/prompts";
import {
	boolean,
	CLIError,
	number,
	positional,
	string,
} from "@superset/cli-framework";
import { createApiClient } from "../../../lib/api-client";
import {
	boxKeyName,
	newIdentity,
	prepareBox,
	signInBox,
	signInGitHubOnBox,
	startHostOnBox,
	waitOnline,
} from "../../../lib/boxes/bootstrap";
import {
	LABELS,
	PROVIDERS,
	provider,
	wakeCommand,
} from "../../../lib/boxes/index";
import { command } from "../../../lib/command";
import { resolveOrganizationFromContext } from "../../../lib/resolve-org";
import { revokeKeysNamed } from "../../../lib/ssh-host-setup/host-key";
import { log } from "../../../lib/ssh-host-setup/log";
import setupProject from "../../projects/setup/command";

type SetupInput = Parameters<typeof setupProject.run>[0];

function reason(error: unknown): string {
	if (error instanceof CLIError && error.suggestion) {
		return `${error.message}. ${error.suggestion}`;
	}
	return error instanceof Error ? error.message : String(error);
}

export default command({
	sandbox: false,
	description:
		"Create a sandbox at Daytona, E2B or Blaxel and make it a host you can pick for new workspaces",
	args: [
		positional("name").desc(
			"Name for the box and its host; defaults to <provider>-<id>",
		),
	],
	options: {
		provider: string()
			.enum(...(PROVIDERS as [string, ...string[]]))
			.default("daytona")
			.desc("Where the box runs"),
		cpu: number().int().min(1).default(4).desc("vCPUs"),
		memory: number().int().min(1).default(8).desc("Memory in GiB"),
		disk: number().int().min(1).default(10).desc("Disk in GiB"),
		idle: number()
			.int()
			.min(0)
			.default(60)
			.desc(
				"Minutes without activity before the provider stops or pauses the box (0: never)",
			),
		region: string().desc("Provider region (Daytona: us, eu)"),
		image: string().desc(
			"Base image to use instead of the bundled box image (Daytona and Blaxel)",
		),
		org: string().desc("Organization (id, slug, or name); defaults to active"),
		github: boolean().desc(
			"Sign the box in to GitHub as you (copies this machine's gh login and git name and email)",
		),
		project: string()
			.variadic()
			.desc(
				"Project id to clone onto the box into ~/projects (repeatable; private repos need --github)",
			),
	},
	run: async ({ ctx, args, options, signal }) => {
		const organization = await resolveOrganizationFromContext(
			ctx.api,
			ctx.config.organizationId,
			options.org,
		);
		const api = createApiClient({
			bearer: ctx.bearer,
			organizationId: organization.id,
		});
		const client = await provider(options.provider);
		const { machineId, hostId } = newIdentity();
		const name =
			(args.name as string | undefined) ??
			`${client.name}-${hostId.slice(0, 6)}`;

		p.intro(`superset boxes create ${name}`);
		const spinner = p.spinner();
		spinner.start(
			`Creating ${name} at ${client.name} (${options.cpu} vCPU, ${options.memory} GiB, ${options.disk} GiB disk)`,
		);
		const box = await client.create({
			name,
			labels: {
				[LABELS.org]: organization.id,
				[LABELS.host]: hostId,
				[LABELS.machineId]: machineId,
			},
			cpu: options.cpu,
			memoryGb: options.memory,
			diskGb: options.disk,
			idleMinutes: options.idle,
			region: options.region,
			image: options.image,
		});
		spinner.stop(
			`Created ${client.name} box ${box.id}${box.region ? ` in ${box.region}` : ""}`,
		);

		try {
			const version = await prepareBox(client, box);
			log.info(
				`Paradev CLI ${version.match(/paradev-cli=(\S+)/)?.[1] ?? "unknown"} on the box`,
			);
			await signInBox({
				provider: client,
				box,
				api,
				organizationId: organization.id,
			});
			log.success(`Signed in with the API key "${boxKeyName(box)}"`);
			await startHostOnBox({
				provider: client,
				box,
				organizationId: organization.id,
				restart: false,
			});
			await client.keepAwake?.(box);
			spinner.start(`Waiting for ${name} to come online`);
			if (!(await waitOnline(api, organization.id, hostId, signal))) {
				spinner.stop("The host did not come online");
				throw new Error(
					`${name} did not come online; its log is ~/.paradev/host/${organization.id}/host-service.log on the box`,
				);
			}
			spinner.stop(`${name} is online`);
			await api.host.rename.mutate({ hostId, name });
			await api.host.setWakeCommand.mutate({
				organizationId: organization.id,
				machineId: hostId,
				wakeCommand: wakeCommand(box),
			});
		} catch (error) {
			// A box bills from the moment it exists: never leave a failed one behind.
			log.warn(`Setup failed, deleting ${client.name} box ${box.id}`);
			await client.remove(box.id).catch(() => {});
			await revokeKeysNamed(api, boxKeyName(box)).catch(() => {});
			throw error;
		}

		// Optional extras: a failure warns and the box stays.
		let github = false;
		if (options.github) {
			try {
				const who = await signInGitHubOnBox(client, box);
				github = true;
				log.success(
					`Signed the box in to GitHub${who.name ? ` (git commits as ${who.name})` : ""}`,
				);
			} catch (error) {
				log.warn(`GitHub sign-in on the box failed: ${reason(error)}`);
			}
		}
		const projects: string[] = [];
		const parentDir = `${client.homeDir}/projects`;
		for (const projectId of options.project ?? []) {
			spinner.start(`Setting up project ${projectId} on ${name}`);
			try {
				// The same path `superset projects setup <id> --host <box>
				// --parent-dir <dir>` takes, including its fallback to this
				// machine's own row when the box does not know the project.
				await setupProject.run({
					ctx: {
						...ctx,
						api,
						config: { ...ctx.config, organizationId: organization.id },
					},
					args: { id: projectId },
					options: { host: hostId, parentDir } as SetupInput["options"],
					signal,
				});
				projects.push(projectId);
				spinner.stop(`Set up project ${projectId} in ${parentDir}`);
			} catch (error) {
				spinner.stop(`Project ${projectId} was not set up`);
				log.warn(reason(error));
			}
		}

		log.warn(
			github
				? "Sign your agents in once, from a terminal in a workspace on the box: claude or codex."
				: "Sign the box in to GitHub and your agents once, from a terminal in a workspace on it: gh auth login, then claude or codex.",
		);
		log.outro(
			`${name} is ready. Pick it as the host when you create a workspace.`,
		);
		return {
			data: {
				provider: client.name,
				id: box.id,
				name,
				hostId,
				region: box.region ?? null,
				organizationId: organization.id,
				github,
				projects,
			},
			message: `${name} (${hostId}) is online`,
		};
	},
});
