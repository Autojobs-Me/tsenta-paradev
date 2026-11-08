import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hostIdFromMachineId } from "@superset/shared/host-info";
import { boxKeyName, newIdentity } from "./bootstrap";
import { __test as e2b } from "./e2b";
import { parseWakeCommand, wakeCommand } from "./index";

describe("wake commands", () => {
	test("round-trip", () => {
		const box = {
			provider: "daytona" as const,
			id: "ed3941fe-4700-4d13-ab9d-fe717989d25c",
			name: "x",
			state: "started",
			running: true,
			labels: {},
		};
		expect(parseWakeCommand(wakeCommand(box))).toEqual({
			provider: "daytona",
			id: box.id,
		});
	});

	test("anything else is refused", () => {
		for (const hostile of [
			"superset boxes start daytona:x; rm -rf ~",
			"superset boxes start daytona:x && curl evil",
			"superset boxes start daytona:$(id)",
			"superset boxes start fly:x",
			"vercel sandbox resume my-box",
			"",
			null,
		]) {
			expect(parseWakeCommand(hostile)).toBeNull();
		}
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
