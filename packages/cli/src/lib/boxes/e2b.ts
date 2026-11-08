import { CLIError } from "@superset/cli-framework";
import { credential, requireCredential } from "./credentials";
import { type Box, type BoxProvider, LABELS } from "./types";

/**
 * E2B over its REST API and envd's Connect protocol (the same calls the
 * `e2b` SDK 2.63 makes), so the compiled CLI carries no SDK. E2B sizes a box
 * by its template, so --cpu/--memory only apply to a template built with
 * them; a box's timeout is a TTL that pauses it (memory kept), and every
 * `boxes start` re-arms it.
 *
 * ponytail: untested against a live E2B account (no key yet); the wire
 * format is read from the SDK. Verify `boxes create --provider e2b` first.
 */
const ENVD_PORT = 49983;
const NAME = "paradev-name";
const IDLE = "paradev-idle-minutes";

interface SandboxDto {
	sandboxID: string;
	state?: string;
	metadata?: Record<string, string>;
	domain?: string | null;
	envdAccessToken?: string;
}

export async function e2b(): Promise<BoxProvider> {
	const key = await requireCredential(
		"E2B_API_KEY",
		"create one at https://e2b.dev/dashboard?tab=keys",
	);
	const domain = credential("E2B_DOMAIN") || "e2b.app";
	const api = `https://api.${domain}`;

	async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
		const response = await fetch(api + path, {
			...init,
			headers: {
				"X-API-KEY": key,
				"Content-Type": "application/json",
				...init.headers,
			},
		});
		const text = await response.text();
		if (!response.ok) {
			let message = text;
			try {
				message = JSON.parse(text).message ?? text;
			} catch {}
			throw new CLIError(`E2B: ${message} (HTTP ${response.status})`);
		}
		return (text ? JSON.parse(text) : undefined) as T;
	}

	const toBox = (dto: SandboxDto): Box => ({
		provider: "e2b",
		id: dto.sandboxID,
		name: dto.metadata?.[NAME] ?? dto.sandboxID,
		state: dto.state ?? "running",
		running: (dto.state ?? "running") === "running",
		region: domain === "e2b.app" ? undefined : domain,
		labels: dto.metadata ?? {},
	});

	/** Resumes the box if paused and re-arms its timeout; returns envd's address and token. */
	async function connect(id: string, timeoutSeconds?: number) {
		const box = await call<SandboxDto>(`/sandboxes/${id}`);
		const idle = Number(box.metadata?.[IDLE] ?? 60);
		const dto = await call<SandboxDto>(`/v2/sandboxes/${id}/connect`, {
			method: "POST",
			body: JSON.stringify({ timeout: timeoutSeconds ?? timeoutFor(idle) }),
		});
		return {
			url: `https://${ENVD_PORT}-${id}.${dto.domain || domain}`,
			token: dto.envdAccessToken,
		};
	}

	return {
		name: "e2b",

		async create(options) {
			const dto = await call<SandboxDto>("/v2/sandboxes", {
				method: "POST",
				body: JSON.stringify({
					templateID: options.image || credential("E2B_TEMPLATE") || "base",
					timeout: timeoutFor(options.idleMinutes),
					autoPause: true,
					autoPauseMemory: true,
					allow_internet_access: true,
					metadata: {
						...options.labels,
						[LABELS.box]: "1",
						[NAME]: options.name,
						[IDLE]: String(options.idleMinutes),
					},
				}),
			});
			return toBox({ ...dto, state: "running" });
		},

		async get(id) {
			try {
				return toBox(await call<SandboxDto>(`/sandboxes/${id}`));
			} catch (error) {
				if (error instanceof CLIError && /HTTP 404/.test(error.message)) {
					return null;
				}
				throw error;
			}
		},

		async list() {
			const query = new URLSearchParams({
				metadata: new URLSearchParams({ [LABELS.box]: "1" }).toString(),
				limit: "100",
			});
			query.append("state", "running");
			query.append("state", "paused");
			const rows = await call<SandboxDto[]>(`/v2/sandboxes?${query}`);
			return rows
				.filter((row) => row.metadata?.[LABELS.box] === "1")
				.map(toBox);
		},

		async exec(id, script, env) {
			const { url, token } = await connect(id);
			const response = await fetch(`${url}/process.Process/Start`, {
				method: "POST",
				headers: {
					"Content-Type": "application/connect+json",
					"Keepalive-Ping-Interval": "50",
					...(token ? { "X-Access-Token": token } : {}),
				},
				body: envelope({
					process: { cmd: "/bin/bash", args: ["-l", "-c", script], envs: env },
					stdin: false,
				}),
			});
			if (!response.ok || !response.body) {
				throw new CLIError(
					`E2B envd: HTTP ${response.status}`,
					(await response.text()).slice(0, 500),
				);
			}
			let output = "";
			let exitCode: number | null = null;
			for await (const frame of frames(response.body)) {
				if (frame.end) {
					if (frame.json?.error) {
						throw new CLIError(
							`E2B envd: ${frame.json.error.message ?? "error"}`,
						);
					}
					break;
				}
				const event = frame.json?.event ?? {};
				const data = event.data ?? {};
				for (const chunk of [data.stdout, data.stderr]) {
					if (chunk) output += Buffer.from(chunk, "base64").toString("utf8");
				}
				if (event.end) exitCode = event.end.exitCode ?? 0;
			}
			return { exitCode: exitCode ?? 1, output };
		},

		async start(id) {
			await connect(id);
		},

		async stop(id) {
			await call(`/sandboxes/${id}/pause`, { method: "POST" }).catch(
				(error: unknown) => {
					// Already paused is fine.
					if (!/HTTP 409/.test(String(error))) throw error;
				},
			);
		},

		async remove(id) {
			await call(`/sandboxes/${id}`, { method: "DELETE" });
		},
	};
}

/** E2B's timeout is a TTL, capped by plan (1 h Hobby, 24 h Pro); 0 asks for the Pro cap. */
function timeoutFor(idleMinutes: number): number {
	return idleMinutes > 0 ? Math.max(300, idleMinutes * 60) : 86_400;
}

/** One Connect envelope: a flags byte, a big-endian length, then JSON. */
function envelope(message: unknown): Uint8Array {
	const body = new TextEncoder().encode(JSON.stringify(message));
	const out = new Uint8Array(5 + body.length);
	new DataView(out.buffer).setUint32(1, body.length);
	out.set(body, 5);
	return out;
}

type Frame = { end: boolean; json: any };

async function* frames(
	stream: ReadableStream<Uint8Array>,
): AsyncGenerator<Frame> {
	let buffer = new Uint8Array(0);
	for await (const chunk of stream) {
		const next = new Uint8Array(buffer.length + chunk.length);
		next.set(buffer);
		next.set(chunk, buffer.length);
		buffer = next;
		while (buffer.length >= 5) {
			const view = new DataView(buffer.buffer, buffer.byteOffset);
			const length = view.getUint32(1);
			if (buffer.length < 5 + length) break;
			const flags = buffer[0] ?? 0;
			const payload = new TextDecoder().decode(buffer.subarray(5, 5 + length));
			buffer = buffer.subarray(5 + length);
			yield {
				end: (flags & 0b10) !== 0,
				json: payload ? JSON.parse(payload) : null,
			};
		}
	}
}

export const __test = { envelope, frames, timeoutFor };
