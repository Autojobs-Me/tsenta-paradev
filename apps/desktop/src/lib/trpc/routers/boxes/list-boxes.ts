import log from "electron-log/main";
import { z } from "zod";

/**
 * A box as its provider reports it, from
 * `superset boxes list --json --providers-only`. Fork-owned (Paradev Boxes).
 */
export interface BoxStatus {
	provider: "daytona" | "e2b" | "blaxel";
	id: string;
	ref: string;
	name: string;
	/** The provider's own state word (started, stopped, paused, standby...). */
	state: string;
	running: boolean;
	region: string | null;
	hostId: string | null;
	organizationId: string | null;
}

export interface BoxesListResult {
	boxes: BoxStatus[];
	/** A short reason the list could not be read; null when it was. */
	error: string | null;
}

export const BOXES_LIST_ARGS = [
	"boxes",
	"list",
	"--json",
	"--providers-only",
] as const;
export const BOXES_LIST_TIMEOUT_MS = 30_000;
export const BOXES_LIST_CACHE_MS = 15_000;
const MAX_STDOUT_BYTES = 4 * 1024 * 1024;
const MAX_ERROR_LENGTH = 200;
const CLI_MISSING = "The bundled Paradev CLI is missing";

const nullableString = z
	.string()
	.nullish()
	.transform((value) => value ?? null);

const boxStatusSchema = z.object({
	provider: z.enum(["daytona", "e2b", "blaxel"]),
	id: z.string().min(1),
	ref: z.string(),
	name: z.string(),
	state: z.string(),
	running: z.boolean(),
	region: nullableString,
	hostId: nullableString,
	organizationId: nullableString,
});

/**
 * Reads the CLI's JSON. Null when it is not a JSON array; entries that do not
 * match BoxStatus are dropped rather than failing the whole list.
 */
export function parseBoxesListOutput(stdout: string): BoxStatus[] | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout);
	} catch {
		return null;
	}
	if (!Array.isArray(parsed)) return null;
	const boxes: BoxStatus[] = [];
	let dropped = 0;
	for (const entry of parsed) {
		const result = boxStatusSchema.safeParse(entry);
		if (result.success) boxes.push(result.data);
		else dropped++;
	}
	if (dropped > 0) {
		log.warn(`[boxes] dropped ${dropped} malformed entries from boxes list`);
	}
	return boxes;
}

/** The CLI prints `Error: <message>` on failure; fall back to its first line. */
function cliErrorMessage(stderr: string): string | null {
	const lines = stderr
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const errorLine = lines.find((line) => line.startsWith("Error: "));
	const message = errorLine?.slice("Error: ".length) ?? lines[0];
	return message ? message.slice(0, MAX_ERROR_LENGTH) : null;
}

interface ExecFailure {
	code?: unknown;
	killed?: boolean;
	stderr?: unknown;
}

function describeFailure(error: unknown): string {
	const failure = (error ?? {}) as ExecFailure;
	if (failure.code === "ENOENT") return CLI_MISSING;
	if (failure.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
		return "Listing boxes returned too much output";
	}
	// execFile kills the child on timeout and marks the error killed.
	if (failure.killed) {
		return `Listing boxes timed out after ${BOXES_LIST_TIMEOUT_MS / 1000} s`;
	}
	const fromStderr =
		typeof failure.stderr === "string" ? cliErrorMessage(failure.stderr) : null;
	if (fromStderr) return fromStderr;
	if (typeof failure.code === "number") {
		return `Listing boxes failed with exit code ${failure.code}`;
	}
	return "Listing boxes failed";
}

export type RunCli = (
	file: string,
	args: readonly string[],
	options: {
		env: NodeJS.ProcessEnv;
		timeout: number;
		maxBuffer: number;
		windowsHide: boolean;
	},
) => Promise<{ stdout: string; stderr: string }>;

export interface BoxesListerDeps {
	resolveCliPath: () => string | null;
	getEnv: () => Promise<NodeJS.ProcessEnv>;
	run: RunCli;
	now?: () => number;
}

async function readBoxes(deps: BoxesListerDeps): Promise<BoxesListResult> {
	try {
		const cliPath = deps.resolveCliPath();
		if (!cliPath) return { boxes: [], error: CLI_MISSING };
		const { stdout, stderr } = await deps.run(cliPath, BOXES_LIST_ARGS, {
			env: await deps.getEnv(),
			timeout: BOXES_LIST_TIMEOUT_MS,
			maxBuffer: MAX_STDOUT_BYTES,
			windowsHide: true,
		});
		// A provider that fails is skipped with a warning; the rest still list.
		if (stderr.trim()) log.warn(`[boxes] boxes list: ${stderr.trim()}`);
		const boxes = parseBoxesListOutput(stdout);
		if (!boxes) {
			return { boxes: [], error: "Listing boxes returned unreadable output" };
		}
		return { boxes, error: null };
	} catch (error) {
		const message = describeFailure(error);
		log.warn(`[boxes] boxes list failed: ${message}`);
		return { boxes: [], error: message };
	}
}

export interface BoxesListOptions {
	/**
	 * Skip the cache and any run already in flight: the answer comes from a
	 * run that started after this call (after a wake or stop finished, say).
	 * Fresh calls made while that run is pending share it.
	 */
	fresh?: boolean;
}

/**
 * Lists boxes through the bundled CLI. Never rejects. Each answer, a failure
 * included, is reused for BOXES_LIST_CACHE_MS, and calls made while one run
 * is in flight share it, so however many windows poll, the CLI runs at most
 * once per BOXES_LIST_CACHE_MS. A fresh call waits for the run in flight, if
 * any, then starts one more; runs never overlap, so a slower old run can
 * never overwrite a newer answer.
 */
export function createBoxesLister(
	deps: BoxesListerDeps,
): (options?: BoxesListOptions) => Promise<BoxesListResult> {
	const now = deps.now ?? Date.now;
	let cached: { at: number; result: BoxesListResult } | null = null;
	let current: Promise<BoxesListResult> | null = null;
	/** The run queued behind `current` for fresh callers; not started yet. */
	let queued: Promise<BoxesListResult> | null = null;

	const start = (): Promise<BoxesListResult> => {
		const run: Promise<BoxesListResult> = readBoxes(deps)
			.then((result) => {
				cached = { at: now(), result };
				return result;
			})
			.finally(() => {
				if (current === run) current = null;
			});
		current = run;
		return run;
	};

	return ({ fresh = false } = {}) => {
		if (!fresh && cached && now() - cached.at < BOXES_LIST_CACHE_MS) {
			return Promise.resolve(cached.result);
		}
		if (!current) return start();
		if (!fresh) return current;
		// The run in flight started before this call; queue one after it.
		queued ??= current.then(() => {
			queued = null;
			return start();
		});
		return queued;
	};
}
