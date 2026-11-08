import { CLIError } from "@superset/cli-framework";
import dockerfile from "./box.Dockerfile" with { type: "text" };
import { credential, requireCredential } from "./credentials";
import { type Box, type BoxProvider, LABELS } from "./types";

/**
 * Daytona over its REST API (https://app.daytona.io/api, the same calls
 * @daytonaio/sdk makes), so the compiled CLI carries no SDK. A box is a
 * sandbox built from box.Dockerfile with the requested resources; Daytona
 * caches the build by content, so only the first create pays for it.
 */
const READY = new Set(["started"]);
const KEEPER_PORT = 4880;

/**
 * Daytona's auto-stop counts toolbox calls, SSH and an inbound websocket
 * through its preview proxy, but not the relay tunnel a host's traffic rides
 * (measured: outbound websockets, busy CPU and inbound preview HTTP do not
 * move lastActivityAt; an inbound preview websocket does, every ~50 s). So
 * while the box is in use, this keeper holds a websocket to the box's own
 * preview URL; once it is idle, auto-stop runs out after --idle minutes.
 * Needs only the box's own preview token, never a Daytona API key.
 */
const KEEPER_JS = `const inUse = process.env.HOME + "/.paradev-box/in-use.sh";
Bun.serve({ port: ${KEEPER_PORT}, hostname: "0.0.0.0", fetch: (req, srv) => (srv.upgrade(req) ? undefined : new Response("ok")), websocket: { message: (ws, m) => ws.send(m) } });
let ws = null;
setInterval(() => {
	const busy = Bun.spawnSync(["sh", inUse]).stdout.toString().trim() === "1";
	if (busy && !ws) {
		ws = new WebSocket(process.env.PREVIEW_URL.replace(/^http/, "ws"), { headers: { "x-daytona-preview-token": process.env.PREVIEW_TOKEN } });
		ws.onclose = () => { ws = null; };
	} else if (!busy && ws) {
		ws.close();
		ws = null;
	} else if (ws && ws.readyState === WebSocket.OPEN) {
		ws.send("ping");
	}
}, 15000);
`;
const FAILED = new Set(["error", "build_failed", "destroyed"]);

interface SandboxDto {
	id: string;
	name: string;
	state: string;
	target?: string;
	labels?: Record<string, string>;
	toolboxProxyUrl?: string;
	errorReason?: string;
}

export async function daytona(): Promise<BoxProvider> {
	const key = await requireCredential(
		"DAYTONA_API_KEY",
		"create one at https://app.daytona.io/dashboard/keys",
	);
	const base = (
		credential("DAYTONA_API_URL") || "https://app.daytona.io/api"
	).replace(/\/+$/, "");
	const headers = {
		Authorization: `Bearer ${key}`,
		"Content-Type": "application/json",
	};

	async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
		const response = await fetch(url.startsWith("http") ? url : base + url, {
			...init,
			headers: { ...headers, ...init.headers },
		});
		const text = await response.text();
		if (!response.ok) {
			let message = text;
			try {
				message = JSON.parse(text).message ?? text;
			} catch {}
			throw new CLIError(`Daytona: ${message} (HTTP ${response.status})`);
		}
		return (text ? JSON.parse(text) : undefined) as T;
	}

	const toBox = (dto: SandboxDto): Box => ({
		provider: "daytona",
		id: dto.id,
		name: dto.name,
		state: dto.state,
		running: READY.has(dto.state),
		region: dto.target,
		labels: dto.labels ?? {},
	});

	async function waitFor(id: string, want: Set<string>): Promise<SandboxDto> {
		const deadline = Date.now() + 15 * 60_000;
		for (;;) {
			const dto = await call<SandboxDto>(`/sandbox/${id}`);
			if (want.has(dto.state)) return dto;
			if (FAILED.has(dto.state)) {
				throw new CLIError(
					`Daytona box ${dto.name} is ${dto.state}`,
					dto.errorReason,
				);
			}
			if (Date.now() > deadline) {
				throw new CLIError(`Daytona box ${dto.name} stuck in ${dto.state}`);
			}
			await Bun.sleep(1_000);
		}
	}

	const toolbox = new Map<string, string>();
	async function toolboxUrl(id: string): Promise<string> {
		const cached = toolbox.get(id);
		if (cached) return cached;
		const dto = await call<SandboxDto>(`/sandbox/${id}`);
		const url =
			dto.toolboxProxyUrl ??
			(await call<{ url: string }>(`/sandbox/${id}/toolbox-proxy-url`)).url;
		const full = `${url.replace(/\/+$/, "")}/${id}`;
		toolbox.set(id, full);
		return full;
	}

	const client: BoxProvider = {
		name: "daytona",

		async create(options) {
			const body: Record<string, unknown> = {
				name: options.name,
				user: "ubuntu",
				labels: { ...options.labels, [LABELS.box]: "1" },
				cpu: options.cpu,
				memory: options.memoryGb,
				disk: options.diskGb,
				autoStopInterval: options.idleMinutes,
				target: options.region,
				buildInfo: {
					dockerfileContent: options.image
						? `FROM ${options.image}\n`
						: dockerfile,
				},
			};
			const dto = await call<SandboxDto>("/sandbox", {
				method: "POST",
				body: JSON.stringify(body),
			});
			return toBox(await waitFor(dto.id, READY));
		},

		async get(id) {
			try {
				return toBox(await call<SandboxDto>(`/sandbox/${id}`));
			} catch (error) {
				if (error instanceof CLIError && /HTTP 404/.test(error.message)) {
					return null;
				}
				throw error;
			}
		},

		async list() {
			const boxes: Box[] = [];
			let cursor: string | undefined;
			do {
				const query = new URLSearchParams({
					limit: "100",
					labels: JSON.stringify({ [LABELS.box]: "1" }),
				});
				if (cursor) query.set("cursor", cursor);
				const page = await call<{ items: SandboxDto[]; nextCursor?: string }>(
					`/sandbox?${query}`,
				);
				// The label filter is the server's; check it again here so a
				// sandbox this harness did not create is never shown or touched.
				for (const dto of page.items) {
					if (dto.labels?.[LABELS.box] === "1") boxes.push(toBox(dto));
				}
				cursor = page.nextCursor || undefined;
			} while (cursor);
			return boxes;
		},

		async exec(id, script, env) {
			// The toolbox splits `command` like a shell would; hand it a
			// base64 payload so quoting and newlines survive.
			const payload = Buffer.from(script).toString("base64");
			const result = await call<{ exitCode?: number; result: string }>(
				`${await toolboxUrl(id)}/process/execute`,
				{
					method: "POST",
					body: JSON.stringify({
						command: `sh -c "echo ${payload} | base64 -d | sh"`,
						envs: env,
						timeout: 900,
					}),
				},
			);
			return { exitCode: result.exitCode ?? 0, output: result.result ?? "" };
		},

		async keepAwake(box) {
			// The preview token changes on every stop/start, so the keeper is
			// restarted with a fresh one each time; it lives only in its env.
			const preview = await call<{ url: string; token: string }>(
				`/sandbox/${box.id}/ports/${KEEPER_PORT}/preview-url`,
			);
			const result = await client.exec(
				box.id,
				`mkdir -p "$HOME/.paradev-box"
printf '%s' "$KEEPER_JS" > "$HOME/.paradev-box/keeper.js"
pkill -f '.paradev-box/keeper.js' 2>/dev/null || true
cd "$HOME" && setsid nohup "$HOME/.bun/bin/bun" "$HOME/.paradev-box/keeper.js" > "$HOME/.paradev-box/keeper.log" 2>&1 < /dev/null &
echo kept`,
				{
					KEEPER_JS,
					PREVIEW_URL: preview.url,
					PREVIEW_TOKEN: preview.token,
				},
			);
			if (result.exitCode !== 0) {
				throw new CLIError(
					`Starting the keeper on ${box.name} failed`,
					result.output,
				);
			}
		},

		async start(id) {
			const dto = await call<SandboxDto>(`/sandbox/${id}`);
			if (!READY.has(dto.state)) {
				if (dto.state !== "starting" && dto.state !== "resuming") {
					await call(`/sandbox/${id}/start`, { method: "POST" });
				}
				await waitFor(id, READY);
			}
			toolbox.delete(id);
		},

		async stop(id) {
			const dto = await call<SandboxDto>(`/sandbox/${id}`);
			if (dto.state === "stopped" || dto.state === "archived") return;
			await call(`/sandbox/${id}/stop`, { method: "POST" });
			await waitFor(id, new Set(["stopped"]));
		},

		async remove(id) {
			await call(`/sandbox/${id}`, { method: "DELETE" });
		},
	};
	return client;
}
