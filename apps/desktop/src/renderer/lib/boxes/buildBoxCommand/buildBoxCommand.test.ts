import { describe, expect, test } from "bun:test";
import { parseBoxWakeCommand } from "../parseBoxWakeCommand";
import type { Box } from "../providers";
import { buildBoxCommand, withOrganizationSignIn } from "./buildBoxCommand";

const ORG = "5b0f3c8e-2f7a-4a7e-9d61-3f1c2b4a5d6e";
const PREAMBLE = `export SUPERSET_ORGANIZATION_ID=${ORG}; superset auth whoami >/dev/null 2>&1 || superset auth login --organization ${ORG} || exit 1; `;

describe("buildBoxCommand", () => {
	const box = parseBoxWakeCommand(
		"superset boxes start daytona:4f6c1b2a-90de",
	) as Box;

	test("wakes, stops and deletes the box, after signing in to the org", () => {
		expect(buildBoxCommand("start", box, ORG)).toBe(
			`${PREAMBLE}superset boxes start daytona:4f6c1b2a-90de`,
		);
		expect(buildBoxCommand("stop", box, ORG)).toBe(
			`${PREAMBLE}superset boxes stop daytona:4f6c1b2a-90de`,
		);
		expect(buildBoxCommand("delete", box, ORG)).toBe(
			`${PREAMBLE}superset boxes delete daytona:4f6c1b2a-90de --yes`,
		);
	});

	test("rebuilds the ref from provider and id, ignoring any ref it is given", () => {
		const tampered = { ...box, ref: "daytona:x; rm -rf ~" };
		expect(buildBoxCommand("start", tampered, ORG)).toEndWith(
			"; superset boxes start daytona:4f6c1b2a-90de",
		);
	});

	test("refuses a provider or id that a wake command could not carry", () => {
		expect(() =>
			buildBoxCommand("start", { provider: "daytona", id: "x; rm -rf ~" }, ORG),
		).toThrow();
		expect(() =>
			buildBoxCommand("start", { provider: "daytona", id: "" }, ORG),
		).toThrow();
		expect(() =>
			buildBoxCommand(
				"delete",
				{ provider: "modal" as Box["provider"], id: "x" },
				ORG,
			),
		).toThrow();
	});
});

describe("withOrganizationSignIn", () => {
	test("quotes the organization id", () => {
		expect(withOrganizationSignIn("org 1", "superset boxes list")).toBe(
			"export SUPERSET_ORGANIZATION_ID='org 1'; superset auth whoami >/dev/null 2>&1 || superset auth login --organization 'org 1' || exit 1; superset boxes list",
		);
	});
});
