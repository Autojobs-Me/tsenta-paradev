import { describe, expect, test } from "bun:test";
import {
	BOXES_LIST_ARGS,
	BOXES_LIST_CACHE_MS,
	BOXES_LIST_TIMEOUT_MS,
	type BoxStatus,
	createBoxesLister,
	parseBoxesListOutput,
	type RunCli,
} from "./list-boxes";

const daytonaBox: BoxStatus = {
	provider: "daytona",
	id: "4f6c1b2a",
	ref: "daytona:4f6c1b2a",
	name: "byo-daytona-1",
	state: "started",
	running: true,
	region: "us",
	hostId: "host-1",
	organizationId: "org-1",
};

function execError(fields: Record<string, unknown>): Error {
	return Object.assign(new Error("Command failed"), fields);
}

function setup(run: RunCli, cliPath: string | null = "/app/bin/superset") {
	let clock = 1_000;
	const calls: Array<{ file: string; args: readonly string[] }> = [];
	const lister = createBoxesLister({
		resolveCliPath: () => cliPath,
		getEnv: async () => ({ PATH: "/usr/bin", HOME: "/home/me" }),
		run: (file, args, options) => {
			calls.push({ file, args });
			return run(file, args, options);
		},
		now: () => clock,
	});
	return {
		lister,
		calls,
		advance: (ms: number) => {
			clock += ms;
		},
	};
}

describe("parseBoxesListOutput", () => {
	test("reads the CLI's JSON array", () => {
		expect(parseBoxesListOutput(JSON.stringify([daytonaBox]))).toEqual([
			daytonaBox,
		]);
		expect(parseBoxesListOutput("[]")).toEqual([]);
	});

	test("fills missing nullable fields with null and drops extra ones", () => {
		const { region, hostId, organizationId, ...rest } = daytonaBox;
		expect(
			parseBoxesListOutput(JSON.stringify([{ ...rest, labels: { a: "b" } }])),
		).toEqual([{ ...rest, region: null, hostId: null, organizationId: null }]);
	});

	test("drops malformed entries but keeps the rest", () => {
		const output = JSON.stringify([
			daytonaBox,
			{ ...daytonaBox, provider: "modal" },
			{ ...daytonaBox, running: "yes" },
			{ ...daytonaBox, id: "" },
			null,
			"daytona:x",
		]);
		expect(parseBoxesListOutput(output)).toEqual([daytonaBox]);
	});

	test("refuses output that is not a JSON array", () => {
		expect(parseBoxesListOutput("")).toBeNull();
		expect(parseBoxesListOutput("NAME PROVIDER")).toBeNull();
		expect(parseBoxesListOutput('{"boxes": []}')).toBeNull();
	});
});

describe("createBoxesLister", () => {
	test("runs the bundled CLI with the providers-only list", async () => {
		let seen: Parameters<RunCli> | null = null;
		const { lister } = setup(async (...args) => {
			seen = args;
			return { stdout: JSON.stringify([daytonaBox]), stderr: "" };
		});
		expect(await lister()).toEqual({ boxes: [daytonaBox], error: null });
		expect(seen).not.toBeNull();
		const [file, args, options] = seen as unknown as Parameters<RunCli>;
		expect(file).toBe("/app/bin/superset");
		expect(args).toEqual([...BOXES_LIST_ARGS]);
		expect(args).toEqual(["boxes", "list", "--json", "--providers-only"]);
		expect(options.timeout).toBe(BOXES_LIST_TIMEOUT_MS);
		expect(options.env).toEqual({ PATH: "/usr/bin", HOME: "/home/me" });
	});

	test("keeps the boxes when a provider warns on stderr", async () => {
		const { lister } = setup(async () => ({
			stdout: JSON.stringify([daytonaBox]),
			stderr: "Warning: e2b: E2B_API_KEY is not set\n",
		}));
		expect(await lister()).toEqual({ boxes: [daytonaBox], error: null });
	});

	test("caches an answer for the cache window, then runs again", async () => {
		const { lister, calls, advance } = setup(async () => ({
			stdout: "[]",
			stderr: "",
		}));
		await lister();
		advance(BOXES_LIST_CACHE_MS - 1);
		await lister();
		expect(calls).toHaveLength(1);
		advance(1);
		await lister();
		expect(calls).toHaveLength(2);
	});

	test("shares one run between concurrent callers", async () => {
		let finish: (value: { stdout: string; stderr: string }) => void = () => {};
		const { lister, calls } = setup(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const first = lister();
		const second = lister();
		await Promise.resolve();
		finish({ stdout: JSON.stringify([daytonaBox]), stderr: "" });
		expect(await first).toEqual({ boxes: [daytonaBox], error: null });
		expect(await second).toBe(await first);
		expect(calls).toHaveLength(1);
	});

	test("a fresh call skips the cache", async () => {
		const { lister, calls } = setup(async () => ({ stdout: "[]", stderr: "" }));
		await lister();
		await lister();
		expect(calls).toHaveLength(1);
		await lister({ fresh: true });
		expect(calls).toHaveLength(2);
		// Its answer refreshes the cache for everyone else.
		await lister();
		await lister({});
		expect(calls).toHaveLength(2);
	});

	test("a fresh call waits for a run that started after it, and fresh callers share that run", async () => {
		const pending: Array<(value: { stdout: string; stderr: string }) => void> =
			[];
		const { lister, calls } = setup(
			() =>
				new Promise((resolve) => {
					pending.push(resolve);
				}),
		);
		const tick = async () => {
			for (let i = 0; i < 10; i++) await Promise.resolve();
		};
		const old = lister();
		await tick();
		const fresh = lister({ fresh: true });
		const alsoFresh = lister({ fresh: true });
		const plain = lister();
		await tick();
		// Runs never overlap: the fresh run waits for the old one.
		expect(calls).toHaveLength(1);
		pending[0]?.({ stdout: "[]", stderr: "" });
		expect(await old).toEqual({ boxes: [], error: null });
		expect(await plain).toBe(await old);
		await tick();
		expect(calls).toHaveLength(2);
		pending[1]?.({ stdout: JSON.stringify([daytonaBox]), stderr: "" });
		expect(await fresh).toEqual({ boxes: [daytonaBox], error: null });
		expect(await alsoFresh).toBe(await fresh);
		expect(calls).toHaveLength(2);
		// The newer answer is the one cached.
		expect(await lister()).toBe(await fresh);
		expect(calls).toHaveLength(2);
	});

	test("a fresh call never shares a run that started before it", async () => {
		const { lister, calls } = setup(async () => ({ stdout: "[]", stderr: "" }));
		// The second call comes after the first one's run started.
		await Promise.all([lister({ fresh: true }), lister({ fresh: true })]);
		expect(calls).toHaveLength(2);
	});

	test("reports a missing CLI without running anything", async () => {
		const { lister, calls } = setup(async () => {
			throw new Error("should not run");
		}, null);
		expect(await lister()).toEqual({
			boxes: [],
			error: "The bundled Paradev CLI is missing",
		});
		expect(calls).toHaveLength(0);
	});

	test("turns failures into a short error and never rejects", async () => {
		const cases: Array<[unknown, string]> = [
			[
				execError({ code: 1, stderr: "Error: Daytona said 401\nHint: x\n" }),
				"Daytona said 401",
			],
			[
				execError({ code: 2, stderr: "" }),
				"Listing boxes failed with exit code 2",
			],
			[
				execError({ killed: true, signal: "SIGTERM", code: null }),
				"Listing boxes timed out after 30 s",
			],
			[execError({ code: "ENOENT" }), "The bundled Paradev CLI is missing"],
			[
				execError({ code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER", killed: true }),
				"Listing boxes returned too much output",
			],
			["not even an Error", "Listing boxes failed"],
		];
		for (const [failure, message] of cases) {
			const { lister } = setup(async () => {
				throw failure;
			});
			expect(await lister()).toEqual({ boxes: [], error: message });
		}
	});

	test("reports unreadable output", async () => {
		const { lister } = setup(async () => ({
			stdout: "NAME PROVIDER STATE",
			stderr: "",
		}));
		expect(await lister()).toEqual({
			boxes: [],
			error: "Listing boxes returned unreadable output",
		});
	});

	test("caps a long CLI error", async () => {
		const { lister } = setup(async () => {
			throw execError({ code: 1, stderr: `Error: ${"x".repeat(500)}` });
		});
		const { error } = await lister();
		expect(error).toHaveLength(200);
	});
});
