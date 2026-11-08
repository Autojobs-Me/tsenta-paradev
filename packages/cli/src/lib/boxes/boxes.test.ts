import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hostIdFromMachineId } from "@superset/shared/host-info";
import {
	ACTIVE_SECONDS,
	boxKeyName,
	GITHUB_SH,
	IN_USE_SH,
	newIdentity,
} from "./bootstrap";
import { __test as e2b } from "./e2b";
import {
	assertExpectedHost,
	type Box,
	boxStatus,
	listBoxes,
	parseWakeCommand,
	wakeCommand,
} from "./index";

const daytonaBox: Box = {
	provider: "daytona",
	id: "ed3941fe-4700-4d13-ab9d-fe717989d25c",
	name: "x",
	state: "started",
	running: true,
	labels: {},
};

describe("wake commands", () => {
	test("emits the launcher form, and round-trips", () => {
		expect(wakeCommand(daytonaBox)).toBe(
			"paradev-boxes start daytona:ed3941fe-4700-4d13-ab9d-fe717989d25c",
		);
		expect(parseWakeCommand(wakeCommand(daytonaBox))).toEqual({
			provider: "daytona",
			id: daytonaBox.id,
		});
	});

	test("accepts the legacy superset form", () => {
		expect(
			parseWakeCommand("superset boxes start blaxel:pdb-a68e4977b8cf"),
		).toEqual({ provider: "blaxel", id: "pdb-a68e4977b8cf" });
		expect(parseWakeCommand("paradev-boxes start e2b:i.x_y-1")).toEqual({
			provider: "e2b",
			id: "i.x_y-1",
		});
	});

	test("anything else is refused", () => {
		for (const hostile of [
			"superset boxes start daytona:x; rm -rf ~",
			"superset boxes start daytona:x && curl evil",
			"superset boxes start daytona:$(id)",
			"superset boxes start fly:x",
			"paradev-boxes start daytona:x; rm -rf ~",
			"paradev-boxes start daytona:x|sh",
			"paradev-boxes start daytona:`id`",
			"paradev-boxes start daytona:x\nrm -rf ~",
			"paradev-boxes start daytona:x\n",
			" paradev-boxes start daytona:x",
			"paradev-boxes start daytona:x ",
			"paradev-boxes  start daytona:x",
			"paradev-boxes start daytona:",
			"paradev-boxes start daytona:x:y",
			"paradev-boxes start daytona:x/../y",
			"paradev-boxes stop daytona:x",
			"paradev-boxes boxes start daytona:x",
			"/tmp/paradev-boxes start daytona:x",
			"superset paradev-boxes start daytona:x",
			"pdev boxes start daytona:x",
			"PARADEV-BOXES start daytona:x",
			"paradev-boxes start Daytona:x",
			"paradev-boxes start daytona:ed3941fe\u00a0",
			"vercel sandbox resume my-box",
			"",
			null,
			undefined,
		]) {
			expect(parseWakeCommand(hostile)).toBeNull();
		}
	});
});

describe("providers-only listing", () => {
	const labelled: Box = {
		provider: "blaxel",
		id: "pdb-a68e4977b8cf",
		name: "byo-blaxel-1",
		state: "standby",
		running: false,
		region: "us-pdx-1",
		labels: {
			"paradev-box": "1",
			"paradev-org": "org-1",
			"paradev-host": "a68e4977b8cfec0a1c7285b2b70dff44",
		},
	};

	test("BoxStatus has exactly the contract's fields", () => {
		expect(boxStatus(labelled)).toEqual({
			provider: "blaxel",
			id: "pdb-a68e4977b8cf",
			ref: "blaxel:pdb-a68e4977b8cf",
			name: "byo-blaxel-1",
			state: "standby",
			running: false,
			region: "us-pdx-1",
			hostId: "a68e4977b8cfec0a1c7285b2b70dff44",
			organizationId: "org-1",
		});
		// Missing region and labels are null, never undefined (JSON drops those).
		const status = boxStatus(daytonaBox);
		expect(JSON.parse(JSON.stringify(status))).toEqual({
			provider: "daytona",
			id: daytonaBox.id,
			ref: `daytona:${daytonaBox.id}`,
			name: "x",
			state: "started",
			running: true,
			region: null,
			hostId: null,
			organizationId: null,
		});
	});

	test("a provider that fails is skipped with a warning", async () => {
		const warnings: string[] = [];
		const boxes = await listBoxes(["daytona", "e2b", "blaxel"], {
			warn: (message) => warnings.push(message),
			load: async (name) => {
				if (name === "daytona") return { list: async () => [daytonaBox] };
				if (name === "e2b") throw new Error("E2B_API_KEY is not set");
				return {
					list: async () => {
						throw new Error("Blaxel: unauthorized (HTTP 401)");
					},
				};
			},
		});
		expect(boxes).toEqual([daytonaBox]);
		expect(warnings).toEqual([
			"e2b: E2B_API_KEY is not set",
			"blaxel: Blaxel: unauthorized (HTTP 401)",
		]);
	});

	test("no providers lists nothing", async () => {
		expect(await listBoxes([], { warn: () => {} })).toEqual([]);
	});

	test("a provider that hangs is skipped, and its requests aborted", async () => {
		const warnings: string[] = [];
		let hungSignal: AbortSignal | undefined;
		const boxes = await listBoxes(["daytona", "blaxel"], {
			warn: (message) => warnings.push(message),
			timeoutMs: 30,
			load: async (name) => ({
				list: (signal) => {
					if (name === "daytona") return Promise.resolve([daytonaBox]);
					hungSignal = signal;
					return new Promise<Box[]>(() => {});
				},
			}),
		});
		expect(boxes).toEqual([daytonaBox]);
		expect(warnings).toEqual(["blaxel: no answer within 0.03 s"]);
		expect(hungSignal?.aborted).toBe(true);
	});
});

describe("expected host", () => {
	const box: Box = {
		...daytonaBox,
		labels: { "paradev-box": "1", "paradev-host": "host-a" },
	};

	test("no --expect-host checks nothing", () => {
		expect(() => assertExpectedHost(box, undefined)).not.toThrow();
		expect(() =>
			assertExpectedHost({ ...box, labels: {} }, undefined),
		).not.toThrow();
	});

	test("the box's own host passes", () => {
		expect(() => assertExpectedHost(box, "host-a")).not.toThrow();
	});

	test("another host, or a box without a host label, is refused", () => {
		expect(() => assertExpectedHost(box, "host-b")).toThrow(
			`Box daytona:${daytonaBox.id} belongs to host host-a, not host-b`,
		);
		expect(() => assertExpectedHost({ ...box, labels: {} }, "host-a")).toThrow(
			"belongs to host (none), not host-a",
		);
		expect(() => assertExpectedHost(box, "")).toThrow();
	});
});

describe("in-use script", () => {
	// $0 is the script's path, as the keepers run it: sh <home>/.paradev-box/in-use.sh.
	const inUse = (pts: string, started?: number, home = empty()) =>
		spawnSync(
			"sh",
			[
				"-c",
				IN_USE_SH.replaceAll("/dev/pts", pts),
				join(home, ".paradev-box", "in-use.sh"),
				...(started === undefined ? [] : [String(started)]),
			],
			{ encoding: "utf8" },
		).stdout.trim();
	const now = () => Math.floor(Date.now() / 1000);
	const empty = () => mkdtempSync(join(tmpdir(), "pts-"));

	test("a keeper that just started counts as in use", () => {
		expect(inUse(empty(), now())).toBe("1");
		expect(inUse(empty(), now() - ACTIVE_SECONDS + 5)).toBe("1");
	});

	test("an old keeper and no terminals is idle", () => {
		expect(inUse(empty(), now() - ACTIVE_SECONDS - 5)).toBe("0");
		expect(inUse(empty())).toBe("0");
	});

	// stat -c is GNU coreutils, which boxes run; macOS has BSD stat.
	test.skipIf(process.platform !== "linux")(
		"terminal input or output in the last 2 minutes is in use",
		() => {
			const pts = empty();
			const old = now() - ACTIVE_SECONDS - 60;
			writeFileSync(join(pts, "0"), "");
			utimesSync(join(pts, "0"), old, old);
			writeFileSync(join(pts, "ptmx"), "");
			expect(inUse(pts, old)).toBe("0");
			writeFileSync(join(pts, "1"), "");
			utimesSync(join(pts, "1"), now() - 10, old);
			expect(inUse(pts, old)).toBe("1");
			utimesSync(join(pts, "1"), old, now() - 10);
			expect(inUse(pts, old)).toBe("1");
		},
	);

	test("a chat write in the last 2 minutes is in use", () => {
		const home = empty();
		const old = now() - ACTIVE_SECONDS - 60;
		const org = join(home, ".paradev", "host", "org-1");
		mkdirSync(org, { recursive: true });
		writeFileSync(join(org, "host.db"), "");
		writeFileSync(join(org, "chat.db"), "");
		writeFileSync(join(org, "chat.db-wal"), "");
		utimesSync(join(org, "chat.db"), old, old);
		utimesSync(join(org, "chat.db-wal"), old, old);
		// host.db (just written) moves for reasons other than someone working.
		expect(inUse(empty(), old, home)).toBe("0");
		utimesSync(join(org, "chat.db-wal"), old, now() - 10);
		expect(inUse(empty(), old, home)).toBe("1");
	});

	test("a home without chats is idle", () => {
		const home = empty();
		mkdirSync(join(home, ".paradev", "host", "org-1"), { recursive: true });
		expect(inUse(empty(), now() - ACTIVE_SECONDS - 5, home)).toBe("0");
	});
});

describe("GitHub sign-in script", () => {
	test("secrets come from the env, never from the script text", () => {
		expect(GITHUB_SH).toContain('"$PARADEV_GH_TOKEN" | gh auth login');
		expect(GITHUB_SH).toContain("--with-token");
		expect(GITHUB_SH).toContain("gh auth setup-git");
		// GH_TOKEN would make gh refuse to store a login.
		expect(GITHUB_SH).not.toMatch(/\$GH_TOKEN|\$GITHUB_TOKEN/);
	});
});

describe("identity", () => {
	test("host id is the upstream HMAC of the machine id", () => {
		const { machineId, hostId } = newIdentity();
		expect(machineId).toMatch(/^[0-9a-f]{32}$/);
		expect(hostId).toBe(hostIdFromMachineId(machineId));
		expect(newIdentity().machineId).not.toBe(machineId);
	});

	test("key names fit better-auth's 32 characters and are per box", () => {
		const name = boxKeyName({
			provider: "blaxel",
			labels: { "paradev-host": "a68e4977b8cfec0a1c7285b2b70dff44" },
		});
		expect(name).toBe("Box a68e4977 blaxel");
		expect(name.length).toBeLessThanOrEqual(32);
	});
});

describe("e2b connect framing", () => {
	test("frames split across chunks decode, end-stream flagged", async () => {
		const a = e2b.envelope({ event: { data: { stdout: btoa("hi") } } });
		const b = e2b.envelope({ event: { end: { exitCode: 3 } } });
		const end = e2b.envelope({});
		end[0] = 0b10;
		const all = new Uint8Array([...a, ...b, ...end]);
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(all.subarray(0, 7));
				controller.enqueue(all.subarray(7, a.length + 3));
				controller.enqueue(all.subarray(a.length + 3));
				controller.close();
			},
		});
		const frames = [];
		for await (const frame of e2b.frames(stream)) frames.push(frame);
		expect(frames.map((f) => f.end)).toEqual([false, false, true]);
		expect(atob(frames[0]?.json.event.data.stdout)).toBe("hi");
		expect(frames[1]?.json.event.end.exitCode).toBe(3);
	});

	test("timeouts: at least 5 minutes, 0 means the 24 h Pro cap", () => {
		expect(e2b.timeoutFor(1)).toBe(300);
		expect(e2b.timeoutFor(60)).toBe(3600);
		expect(e2b.timeoutFor(0)).toBe(86_400);
	});
});

describe("credentials file", () => {
	test("dotenv lines, quotes and export prefixes", async () => {
		const dir = mkdtempSync(join(tmpdir(), "boxes-"));
		const file = join(dir, "providers.env");
		writeFileSync(
			file,
			'# comment\nexport DAYTONA_API_KEY="dtn_1"\nE2B_API_KEY=e2b_2\n',
		);
		process.env.PARADEV_BOXES_ENV = file;
		delete process.env.DAYTONA_API_KEY;
		delete process.env.E2B_API_KEY;
		const { credential } = await import(`./credentials?${Date.now()}`);
		expect(credential("DAYTONA_API_KEY")).toBe("dtn_1");
		expect(credential("E2B_API_KEY")).toBe("e2b_2");
		expect(credential("BL_API_KEY")).toBeUndefined();
	});
});
