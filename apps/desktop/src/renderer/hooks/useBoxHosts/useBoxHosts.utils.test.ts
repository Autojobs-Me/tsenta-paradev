import { describe, expect, test } from "bun:test";
import { type BoxStatus, buildBoxHosts, hasBoxHost } from "./useBoxHosts.utils";

function status(overrides: Partial<BoxStatus>): BoxStatus {
	return {
		provider: "daytona",
		id: "dt-1",
		ref: "daytona:dt-1",
		name: "byo-daytona-1",
		state: "started",
		running: true,
		region: "us",
		hostId: "host-daytona",
		organizationId: "org-1",
		...overrides,
	};
}

const hosts = [
	{
		id: "host-daytona",
		name: "daytona-1",
		wakeCommand: "paradev-boxes start daytona:dt-1",
	},
	// Boxes created before the launcher carry the older form.
	{ id: "host-blaxel", wakeCommand: "superset boxes start blaxel:bx-1" },
	{ id: "laptop", wakeCommand: null },
	{ id: "ssh-host", wakeCommand: "ssh devbox 'systemctl start paradev'" },
	{ id: "hostile", wakeCommand: "paradev-boxes start e2b:x; rm -rf ~" },
	{ id: "hostile-legacy", wakeCommand: "superset boxes start e2b:x; rm -rf ~" },
];

describe("buildBoxHosts", () => {
	test("keeps only hosts whose wake command names a box, in either form", () => {
		const boxHosts = buildBoxHosts(hosts, undefined);
		expect([...boxHosts.keys()]).toEqual(["host-daytona", "host-blaxel"]);
		expect(boxHosts.get("host-daytona")).toEqual({
			provider: "daytona",
			id: "dt-1",
			ref: "daytona:dt-1",
			hostId: "host-daytona",
			hostName: "daytona-1",
			providerState: null,
			running: null,
			region: null,
		});
		expect(boxHosts.get("host-blaxel")).toEqual({
			provider: "blaxel",
			id: "bx-1",
			ref: "blaxel:bx-1",
			hostId: "host-blaxel",
			hostName: null,
			providerState: null,
			running: null,
			region: null,
		});
	});

	test("adds what the provider reports for the same box", () => {
		const boxHosts = buildBoxHosts(hosts, [
			status({}),
			status({
				provider: "blaxel",
				id: "bx-1",
				ref: "blaxel:bx-1",
				state: "STANDBY",
				running: false,
				region: null,
				hostId: "host-blaxel",
			}),
		]);
		expect(boxHosts.get("host-daytona")).toMatchObject({
			providerState: "started",
			running: true,
			region: "us",
		});
		expect(boxHosts.get("host-blaxel")).toMatchObject({
			providerState: "STANDBY",
			running: false,
			region: null,
		});
	});

	test("joins on the box, not the host label", () => {
		const boxHosts = buildBoxHosts(hosts, [
			// Labelled with this host but a different box: not this host's state.
			status({ id: "dt-other", ref: "daytona:dt-other" }),
			// Same box with no host label: still this host's box.
			status({
				provider: "blaxel",
				id: "bx-1",
				ref: "blaxel:bx-1",
				state: "DEPLOYED",
				hostId: null,
			}),
		]);
		expect(boxHosts.get("host-daytona")?.providerState).toBeNull();
		expect(boxHosts.get("host-blaxel")?.providerState).toBe("DEPLOYED");
	});

	test("leaves out a host whose wake command names another host's box", () => {
		const boxHosts = buildBoxHosts(
			[
				...hosts,
				// A shared host pointed at the box behind host-daytona.
				{ id: "borrowed", wakeCommand: "paradev-boxes start daytona:dt-1" },
			],
			[status({})],
		);
		expect(boxHosts.has("borrowed")).toBe(false);
		expect(boxHosts.get("host-daytona")?.providerState).toBe("started");
	});

	test("leaves out a host whose id could not go to --expect-host", () => {
		const boxHosts = buildBoxHosts(
			[
				{ id: "--yes", wakeCommand: "paradev-boxes start daytona:dt-9" },
				{ id: "a b", wakeCommand: "paradev-boxes start daytona:dt-8" },
			],
			undefined,
		);
		expect(boxHosts.size).toBe(0);
	});

	test("never adds a host for a box no host points at", () => {
		const boxHosts = buildBoxHosts(
			[],
			[status({ hostId: "host-daytona" }), status({ hostId: null })],
		);
		expect(boxHosts.size).toBe(0);
	});

	test("handles nothing loaded yet", () => {
		expect(buildBoxHosts(undefined, undefined).size).toBe(0);
		expect(buildBoxHosts(undefined, [status({})]).size).toBe(0);
	});
});

describe("hasBoxHost", () => {
	test("is true only when some host's wake command names a box", () => {
		expect(hasBoxHost(undefined)).toBe(false);
		expect(hasBoxHost([])).toBe(false);
		expect(hasBoxHost(hosts.slice(2))).toBe(false);
		expect(hasBoxHost(hosts)).toBe(true);
		expect(hasBoxHost(hosts.slice(0, 1))).toBe(true);
		expect(hasBoxHost(hosts.slice(1, 2))).toBe(true);
	});
});
