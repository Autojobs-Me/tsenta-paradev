import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CLIError } from "@superset/cli-framework";
import { credential } from "./credentials";
import { type Box, type BoxProvider, LABELS } from "./types";

/**
 * Blaxel over its REST API (api.blaxel.ai/v0 and each sandbox's own
 * sandbox-api, the same calls @blaxel/core makes). Auth is BL_API_KEY with
 * BL_WORKSPACE, or else the `bl` CLI's login (`bl token`).
 *
 * Blaxel differs from the others in three ways this file absorbs:
 * - A box goes to standby about 20 s after its last inbound connection, with
 *   processes frozen. Paradev's traffic is outbound (the relay tunnel), so a
 *   keeper holds a keepAlive process while someone is connected or an agent
 *   runs. There is no stop API: stop drops the keeper, standby follows.
 * - The image must carry Blaxel's sandbox-api as its entrypoint and be glibc;
 *   the hub images are Alpine. `bl push` builds box.Dockerfile plus that
 *   layer (README); BLAXEL_IMAGE or --image names it.
 * - The root filesystem is RAM-backed (about half of memory), so --disk is
 *   ignored and memory is the size knob; vCPUs follow memory.
 */
const API = "https://api.blaxel.ai/v0";
const KEEPER = "paradev-keeper";
const BL_TOKEN_TIMEOUT_MS = 15_000;

const BOX_HOME = "/home/ubuntu";

/** Holds a keepAlive process through the box's own sandbox-api while it is in use. */
function keeperScript(idleSeconds: number): string {
	return `started=$(date +%s); last=$started; next=0
while :; do
	now=$(date +%s)
	if [ "$(sh ${BOX_HOME}/.paradev-box/in-use.sh "$started")" = 1 ]; then last=$now; fi
	if [ $((now - last)) -lt ${idleSeconds} ] && [ "$now" -ge "$next" ]; then
		curl -fsS -X POST http://127.0.0.1:8080/process -H 'Content-Type: application/json' \\
			-d '{"command":"sleep 60","keepAlive":true,"timeout":60}' >/dev/null 2>&1 || true
		next=$((now + 45))
	fi
	sleep 10
done`;
}

interface SandboxDto {
	metadata: {
		name: string;
		url?: string;
		labels?: Record<string, string>;
	};
	spec?: { region?: string; runtime?: { memory?: number } };
	status?: string;
}

interface ProcessDto {
	status: "failed" | "killed" | "stopped" | "running" | "completed";
	exitCode?: number;
	stdout?: string;
	stderr?: string;
	logs?: string;
}

/** The workspace `bl login` made current, read from ~/.blaxel/config.yaml. */
export function contextWorkspace(): string | undefined {
	try {
		const config = readFileSync(
			join(homedir(), ".blaxel", "config.yaml"),
			"utf8",
		);
		return config.match(/^context:\s*\n\s+workspace:\s*(\S+)/m)?.[1];
	} catch {
		return undefined;
	}
}

export async function blaxel(): Promise<BoxProvider> {
	const workspace = credential("BL_WORKSPACE") || contextWorkspace();
	if (!workspace) {
		throw new CLIError(
			"No Blaxel workspace",
			"Run `bl login <workspace>`, or set BL_WORKSPACE and BL_API_KEY.",
		);
	}
	const apiKey = credential("BL_API_KEY");
	let token = apiKey;
	const bearer = async (signal?: AbortSignal | null): Promise<string> => {
		if (token) return token;
		// A `bl token` stuck on a refresh is killed rather than left behind:
		// after 15 s, or when the caller gives up (listBoxes' timeout).
		const stdout = await new Promise<string>((resolve, reject) =>
			execFile(
				"bl",
				["token", workspace],
				{
					timeout: BL_TOKEN_TIMEOUT_MS,
					killSignal: "SIGKILL",
					signal: signal ?? undefined,
				},
				(error, out) => (error ? reject(error) : resolve(out)),
			),
		).catch(() => "");
		token = stdout.trim().split("\n").pop();
		if (!token) {
			throw new CLIError(
				"Could not get a Blaxel token",
				"Set BL_API_KEY, or install the bl CLI and run `bl login`.",
			);
		}
		return token;
	};

	async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
		const response = await fetch(url.startsWith("http") ? url : API + url, {
			...init,
			headers: {
				Authorization: `Bearer ${await bearer(init.signal)}`,
				"X-Blaxel-Workspace": workspace as string,
				"Content-Type": "application/json",
				...init.headers,
			},
		});
		const text = await response.text();
		if (!response.ok) {
			let message = text;
			try {
				message = JSON.parse(text).error ?? JSON.parse(text).message ?? text;
			} catch {}
			throw new CLIError(`Blaxel: ${message} (HTTP ${response.status})`);
		}
		return (text ? JSON.parse(text) : undefined) as T;
	}

	const toBox = (dto: SandboxDto): Box => ({
		provider: "blaxel",
		id: dto.metadata.name,
		name: dto.metadata.labels?.["paradev-name"] ?? dto.metadata.name,
		state: (dto.status ?? "unknown").toLowerCase(),
		running: dto.status === "DEPLOYED",
		region: dto.spec?.region,
		labels: dto.metadata.labels ?? {},
	});

	async function sandbox(id: string): Promise<SandboxDto> {
		return call<SandboxDto>(`/sandboxes/${encodeURIComponent(id)}`);
	}

	async function waitDeployed(id: string): Promise<SandboxDto> {
		const deadline = Date.now() + 10 * 60_000;
		for (;;) {
			const dto = await sandbox(id);
			if (dto.status === "DEPLOYED" && dto.metadata.url) return dto;
			if (dto.status === "FAILED" || dto.status === "TERMINATED") {
				throw new CLIError(`Blaxel box ${id} is ${dto.status}`);
			}
			if (Date.now() > deadline)
				throw new CLIError(`Blaxel box ${id} did not deploy`);
			await Bun.sleep(1_000);
		}
	}

	/** Starts a process through the box's sandbox-api (this also wakes it from standby). */
	async function processStart(
		id: string,
		body: Record<string, unknown>,
	): Promise<{ url: string; name: string }> {
		const { metadata } = await waitDeployed(id);
		const url = metadata.url as string;
		const name =
			(body.name as string) ?? `paradev-${crypto.randomUUID().slice(0, 8)}`;
		await call(`${url}/process`, {
			method: "POST",
			body: JSON.stringify({ ...body, name, waitForCompletion: false }),
		});
		return { url, name };
	}

	/**
	 * Kills every keeper and every keep-alive process on the box (sandbox-api
	 * runs them as root, so only its own kill endpoint reaches them). With
	 * none left, the box goes to standby about 20 s later. Throws if one
	 * survives, because a box that will not sleep keeps billing.
	 */
	async function stopKeepers(id: string): Promise<void> {
		const { metadata } = await waitDeployed(id);
		const processes = await call<
			{ name: string; status: string; keepAlive?: boolean }[]
		>(`${metadata.url}/process`);
		const holding = processes.filter(
			(process) =>
				process.status === "running" &&
				(process.name.startsWith(KEEPER) || process.keepAlive),
		);
		const failed: string[] = [];
		for (const process of holding) {
			await call(`${metadata.url}/process/${process.name}/kill`, {
				method: "DELETE",
			}).catch(() => failed.push(process.name));
		}
		if (failed.length) {
			throw new CLIError(
				`Could not stop ${failed.join(", ")} on Blaxel box ${id}`,
				"It stays awake (and billed) until they end.",
			);
		}
	}

	const client: BoxProvider = {
		name: "blaxel",
		homeDir: BOX_HOME,

		async create(options) {
			const name = `pdb-${options.labels[LABELS.host]?.slice(0, 12) ?? crypto.randomUUID().slice(0, 12)}`;
			const image =
				options.image ||
				credential("BLAXEL_IMAGE") ||
				"sandbox/paradev-box:latest";
			await call("/sandboxes", {
				method: "POST",
				body: JSON.stringify({
					metadata: {
						name,
						labels: {
							...options.labels,
							[LABELS.box]: "1",
							"paradev-name": options.name,
							"paradev-idle-minutes": String(options.idleMinutes),
						},
					},
					spec: {
						runtime: { image, memory: options.memoryGb * 1024 },
						...(options.region ? { region: options.region } : {}),
					},
				}),
			});
			return toBox(await waitDeployed(name));
		},

		async get(id) {
			try {
				return toBox(await sandbox(id));
			} catch (error) {
				if (error instanceof CLIError && /HTTP 404/.test(error.message)) {
					return null;
				}
				throw error;
			}
		},

		async list(signal) {
			const rows = await call<SandboxDto[]>("/sandboxes", { signal });
			return rows
				.filter((row) => row.metadata.labels?.[LABELS.box] === "1")
				.map(toBox);
		},

		async exec(id, script, env = {}) {
			// sandbox-api runs as root; run the script as the image's `ubuntu`
			// user like the other providers, without the PORT=80/HOST the
			// platform injects (host-service picks its own port).
			const payload = Buffer.from(script).toString("base64");
			const { url, name } = await processStart(id, {
				command: `cd /home/ubuntu && exec env -u PORT -u HOST setpriv --reuid=ubuntu --regid=ubuntu --init-groups env HOME=/home/ubuntu USER=ubuntu LOGNAME=ubuntu sh -c "echo ${payload} | base64 -d | sh"`,
				env,
				timeout: 900,
			});
			const deadline = Date.now() + 15 * 60_000;
			for (;;) {
				const process = await call<ProcessDto>(`${url}/process/${name}`);
				if (process.status !== "running") {
					const output =
						`${process.stdout ?? ""}${process.stderr ?? ""}` ||
						(process.logs ?? "");
					return {
						exitCode:
							process.status === "completed"
								? (process.exitCode ?? 0)
								: process.exitCode || 1,
						output,
					};
				}
				if (Date.now() > deadline)
					throw new CLIError(`Blaxel exec on ${id} timed out`);
				await Bun.sleep(500);
			}
		},

		async start(id) {
			// Any request to sandbox-api resumes a box from standby.
			await client.exec(id, "true");
		},

		async keepAwake(box) {
			const idle =
				Math.max(2, Number(box.labels["paradev-idle-minutes"] ?? 2)) * 60;
			// One keeper, the current script: stop any running one, start fresh.
			await stopKeepers(box.id);
			await processStart(box.id, {
				name: `${KEEPER}-${Date.now().toString(36)}`,
				command: keeperScript(idle),
				// No restartOnFailure: stop kills it, and a restart would undo that.
				timeout: 0,
			});
		},

		async stop(id) {
			await stopKeepers(id);
		},

		async remove(id) {
			// The first delete can leave a TERMINATED record for minutes; a second one clears it.
			for (let attempt = 0; attempt < 2; attempt++) {
				await call(`/sandboxes/${encodeURIComponent(id)}`, {
					method: "DELETE",
				}).catch((error: unknown) => {
					if (!/HTTP 404/.test(String(error))) throw error;
				});
			}
		},
	};
	return client;
}
