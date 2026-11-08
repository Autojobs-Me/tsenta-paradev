import { CLIError } from "@superset/cli-framework";
import { contextWorkspace } from "./blaxel";
import { credential } from "./credentials";
import type { Box, BoxProvider, ProviderName } from "./types";
import { PROVIDERS } from "./types";

export * from "./types";

/** Which providers have credentials, without constructing a client. */
export function configuredProviders(): ProviderName[] {
	return PROVIDERS.filter((name) => {
		if (name === "daytona") return Boolean(credential("DAYTONA_API_KEY"));
		if (name === "e2b") return Boolean(credential("E2B_API_KEY"));
		// A `bl login` counts: the provider gets its token from the bl CLI.
		return Boolean(
			credential("BL_API_KEY") ||
				credential("BL_WORKSPACE") ||
				contextWorkspace(),
		);
	});
}

export async function provider(name: string): Promise<BoxProvider> {
	switch (name) {
		case "daytona":
			return (await import("./daytona")).daytona();
		case "e2b":
			return (await import("./e2b")).e2b();
		case "blaxel":
			return (await import("./blaxel")).blaxel();
		default:
			throw new CLIError(
				`Unknown provider: ${name}`,
				`Use one of: ${PROVIDERS.join(", ")}`,
			);
	}
}

/**
 * Finds a box by `provider:id`, by provider id, or by name, among the boxes
 * this harness created at every configured provider.
 */
export async function findBox(
	ref: string,
): Promise<{ provider: BoxProvider; box: Box }> {
	const colon = ref.indexOf(":");
	if (colon > 0) {
		const named = await provider(ref.slice(0, colon));
		const box = await named.get(ref.slice(colon + 1));
		if (!box || box.labels["paradev-box"] !== "1") {
			throw new CLIError(`No box ${ref}`, "Run: superset boxes list");
		}
		return { provider: named, box };
	}
	const matches: { provider: BoxProvider; box: Box }[] = [];
	for (const name of configuredProviders()) {
		const client = await provider(name);
		for (const box of await client.list()) {
			if (box.id === ref || box.name === ref) {
				matches.push({ provider: client, box });
			}
		}
	}
	const [match, ...rest] = matches;
	if (!match) throw new CLIError(`No box ${ref}`, "Run: superset boxes list");
	if (rest.length) {
		throw new CLIError(
			`More than one box is called ${ref}`,
			"Use provider:id (see: superset boxes list).",
		);
	}
	return match;
}

/** The command a box's host row stores, so `superset hosts wake` and the app can wake it. */
export function wakeCommand(box: Box): string {
	return `superset boxes start ${box.provider}:${box.id}`;
}

/** Inverse of wakeCommand; the app only ever runs wake commands this parses. */
export function parseWakeCommand(
	command: string | null | undefined,
): { provider: ProviderName; id: string } | null {
	const match = command
		?.trim()
		.match(/^superset boxes start (daytona|e2b|blaxel):([A-Za-z0-9._-]+)$/);
	return match
		? { provider: match[1] as ProviderName, id: match[2] as string }
		: null;
}
