import { describe, expect, test } from "bun:test";
import { parseBoxWakeCommand } from "../parseBoxWakeCommand";
import type { Box } from "../providers";
import { buildBoxCommand, withBoxesPreamble } from "./buildBoxCommand";

const ORG = "5b0f3c8e-2f7a-4a7e-9d61-3f1c2b4a5d6e";
const HOST = "a68e4977b8cf41d2";
const REQUIRE_LAUNCHER = `command -v paradev-boxes >/dev/null 2>&1 || echo "paradev-boxes is not installed: open Paradev Boxes once so it can install its launcher." >&2; command -v paradev-boxes >/dev/null 2>&1 || exit 127`;
const PREAMBLE = `${REQUIRE_LAUNCHER}; export SUPERSET_ORGANIZATION_ID=${ORG}; superset auth whoami >/dev/null 2>&1 || superset auth login --organization ${ORG} || exit 1; `;

describe("buildBoxCommand", () => {
	const box = {
		...(parseBoxWakeCommand(
			"paradev-boxes start daytona:4f6c1b2a-90de",
		) as Box),
		hostId: HOST,
	};

	test("wakes, stops and deletes only the host's own box, after signing in to the org", () => {
		expect(buildBoxCommand("start", box, ORG)).toBe(
			`${PREAMBLE}paradev-boxes start daytona:4f6c1b2a-90de --expect-host ${HOST}`,
		);
		expect(buildBoxCommand("stop", box, ORG)).toBe(
			`${PREAMBLE}paradev-boxes stop daytona:4f6c1b2a-90de --expect-host ${HOST}`,
		);
		expect(buildBoxCommand("delete", box, ORG)).toBe(
			`${PREAMBLE}paradev-boxes delete daytona:4f6c1b2a-90de --expect-host ${HOST} --yes`,
		);
	});

	test("uses the launcher for a box stored in the older form too", () => {
		const legacy = {
			...(parseBoxWakeCommand(
				"superset boxes start blaxel:pdb-a68e4977b8cf",
			) as Box),
			hostId: HOST,
		};
		expect(buildBoxCommand("start", legacy, ORG)).toBe(
			`${PREAMBLE}paradev-boxes start blaxel:pdb-a68e4977b8cf --expect-host ${HOST}`,
		);
	});

	test("rebuilds the ref from provider and id, ignoring any ref it is given", () => {
		const tampered = { ...box, ref: "daytona:x; rm -rf ~" };
		expect(buildBoxCommand("start", tampered, ORG)).toEndWith(
			`; paradev-boxes start daytona:4f6c1b2a-90de --expect-host ${HOST}`,
		);
	});

	test("refuses a provider or id that a wake command could not carry", () => {
		const ref = { hostId: HOST };
		expect(() =>
			buildBoxCommand(
				"start",
				{ ...ref, provider: "daytona", id: "x; rm -rf ~" },
				ORG,
			),
		).toThrow();
		expect(() =>
			buildBoxCommand("start", { ...ref, provider: "daytona", id: "" }, ORG),
		).toThrow();
		expect(() =>
			buildBoxCommand("start", { ...ref, provider: "daytona", id: "x\n" }, ORG),
		).toThrow();
		expect(() =>
			buildBoxCommand(
				"delete",
				{ ...ref, provider: "modal" as Box["provider"], id: "x" },
				ORG,
			),
		).toThrow();
	});

	test("refuses a host id that could read as an option or shell syntax", () => {
		for (const hostId of ["", "--yes", "-x", "a b", "a;b", "a\nb", "$(id)"]) {
			expect(() =>
				buildBoxCommand("stop", { provider: "daytona", id: "x", hostId }, ORG),
			).toThrow();
		}
	});
});

describe("withBoxesPreamble", () => {
	test("checks for the launcher, then signs in with the stock CLI and quotes the organization id", () => {
		expect(withBoxesPreamble("org 1", "paradev-boxes list")).toBe(
			`${REQUIRE_LAUNCHER}; export SUPERSET_ORGANIZATION_ID='org 1'; superset auth whoami >/dev/null 2>&1 || superset auth login --organization 'org 1' || exit 1; paradev-boxes list`,
		);
	});
});
