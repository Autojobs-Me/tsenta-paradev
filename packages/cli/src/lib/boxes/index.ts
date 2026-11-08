import { CLIError } from "@superset/cli-framework";
import { contextWorkspace } from "./blaxel";
import { credential } from "./credentials";
import type { Box, BoxProvider, BoxStatus, ProviderName } from "./types";
import { LABELS, PROVIDERS } from "./types";

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

/**
 * Refuses a box whose host label is not the host the caller acted on. The app
 * passes the host a wake command belongs to, so a host whose stored command
 * names someone else's box (box ids are derived from host ids, which are
 * visible) cannot start, stop or delete that box.
 */
export function assertExpectedHost(
	box: Pick<Box, "provider" | "id" | "labels">,
	expectedHostId: string | undefined,
): void {
	if (expectedHostId === undefined) return;
	const hostId = box.labels[LABELS.host];
	if (hostId !== expectedHostId) {
		throw new CLIError(
			`Box ${box.provider}:${box.id} belongs to host ${hostId ?? "(none)"}, not ${expectedHostId || "(none)"}`,
			"Nothing was changed. Check the host's wake command.",
		);
	}
}

/** How long one provider's list may take before it is skipped. */
export const PROVIDER_LIST_TIMEOUT_MS = 10_000;

/**
 * One provider's list, given up on after timeoutMs. The signal aborts the
 * provider's requests then, so nothing it started keeps the CLI from exiting.
 */
async function listWithin(
	client: Pick<BoxProvider, "list">,
	timeoutMs: number,
): Promise<Box[]> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			reject(new Error(`no answer within ${timeoutMs / 1000} s`));
			controller.abort();
		}, timeoutMs);
	});
	try {
		return await Promise.race([client.list(controller.signal), timeout]);
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Lists the boxes at each named provider. A provider that fails (no key, an
 * outage) or takes longer than timeoutMs is skipped and reported through
 * warn, so one bad provider never hides the others.
 */
export async function listBoxes(
	names: string[],
	{
		warn,
		load = provider,
		timeoutMs = PROVIDER_LIST_TIMEOUT_MS,
	}: {
		warn: (message: string) => void;
		load?: (name: string) => Promise<Pick<BoxProvider, "list">>;
		timeoutMs?: number;
	},
): Promise<Box[]> {
	// Only list() is timed: loading a provider may ask for its key in a terminal.
	const results = await Promise.allSettled(
		names.map(async (name) => listWithin(await load(name), timeoutMs)),
	);
	return results.flatMap((result, index) => {
		if (result.status === "fulfilled") return result.value;
		const reason = result.reason;
		warn(
			`${names[index]}: ${reason instanceof Error ? reason.message : String(reason)}`,
		);
		return [];
	});
}

/** A box as `boxes list --providers-only` prints it. */
export function boxStatus(box: Box): BoxStatus {
	return {
		provider: box.provider,
		id: box.id,
		ref: `${box.provider}:${box.id}`,
		name: box.name,
		state: box.state,
		running: box.running,
		region: box.region ?? null,
		hostId: box.labels[LABELS.host] ?? null,
		organizationId: box.labels[LABELS.org] ?? null,
	};
}

/**
 * The command a box's host row stores, so `superset hosts wake` and the app
 * can wake it. `paradev-boxes` is the launcher the Paradev Boxes app writes
 * into ~/.paradev/bin (apps/desktop/fork/main.cjs): that home is shared with
 * Paradev, whose own `superset` shim there has no boxes command.
 */
export function wakeCommand(box: Pick<Box, "provider" | "id">): string {
	return `paradev-boxes start ${box.provider}:${box.id}`;
}

/**
 * Inverse of wakeCommand, also accepting the `superset boxes start` form
 * boxes made before the launcher stored. Exact match only, no surrounding
 * whitespace; callers rebuild what they run from the parts, never run the
 * stored string.
 */
export function parseWakeCommand(
	command: string | null | undefined,
): { provider: ProviderName; id: string } | null {
	const match = command?.match(
		/^(?:paradev-boxes|superset boxes) start (daytona|e2b|blaxel):([A-Za-z0-9._-]+)$/,
	);
	return match
		? { provider: match[1] as ProviderName, id: match[2] as string }
		: null;
}
