import { describe, expect, test } from "bun:test";
import {
	type BoxesCreateOptions,
	buildBoxesCreateCommand,
	isValidBoxName,
	isValidProjectId,
	parseWholeNumber,
} from "./buildBoxesCreateCommand";

const ORG = "5b0f3c8e-2f7a-4a7e-9d61-3f1c2b4a5d6e";
const REQUIRE_LAUNCHER = `command -v paradev-boxes >/dev/null 2>&1 || echo "paradev-boxes is not installed: open Paradev Boxes once so it can install its launcher." >&2; command -v paradev-boxes >/dev/null 2>&1 || exit 127`;
const DEFAULTS: BoxesCreateOptions = {
	provider: "daytona",
	cpu: 4,
	memoryGb: 8,
	diskGb: 10,
	idleMinutes: 60,
};

describe("buildBoxesCreateCommand", () => {
	test("checks for the launcher, signs in to the org, then creates the box with every flag", () => {
		expect(buildBoxesCreateCommand(DEFAULTS, ORG)).toBe(
			`${REQUIRE_LAUNCHER}; export SUPERSET_ORGANIZATION_ID=${ORG}; superset auth whoami >/dev/null 2>&1 || superset auth login --organization ${ORG} || exit 1; paradev-boxes create --provider daytona --cpu 4 --memory 8 --disk 10 --idle 60 --org ${ORG}`,
		);
	});

	test("passes the optional name and region, and 0 idle minutes for never", () => {
		expect(
			buildBoxesCreateCommand(
				{
					...DEFAULTS,
					provider: "e2b",
					name: "devbox-1",
					idleMinutes: 0,
					region: "eu",
				},
				ORG,
			),
		).toEndWith(
			`; paradev-boxes create devbox-1 --provider e2b --cpu 4 --memory 8 --disk 10 --idle 0 --region eu --org ${ORG}`,
		);
	});

	test("sets up each project once and signs the box in to GitHub when asked", () => {
		const projectA = "0f8fad5b-d9cb-469f-a165-70867728950e";
		const projectB = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
		expect(
			buildBoxesCreateCommand(
				{
					...DEFAULTS,
					projectIds: [projectA, projectB, projectA],
					github: true,
				},
				ORG,
			),
		).toEndWith(
			`; paradev-boxes create --provider daytona --cpu 4 --memory 8 --disk 10 --idle 60 --org ${ORG} --project ${projectA} --project ${projectB} --github`,
		);
	});

	test("adds no project or GitHub flags unless asked", () => {
		for (const extras of [
			{},
			{ projectIds: [] },
			{ github: false },
			{ projectIds: [], github: false },
		]) {
			const command = buildBoxesCreateCommand({ ...DEFAULTS, ...extras }, ORG);
			expect(command).not.toContain("--project");
			expect(command).not.toContain("--github");
		}
		expect(
			buildBoxesCreateCommand({ ...DEFAULTS, github: true }, ORG),
		).toEndWith(`--org ${ORG} --github`);
	});

	test("quotes the organization id", () => {
		expect(buildBoxesCreateCommand(DEFAULTS, "org; rm -rf ~")).toEndWith(
			"--org 'org; rm -rf ~'",
		);
	});

	test("refuses values that are not whole numbers in range", () => {
		for (const bad of [
			{ cpu: 0 },
			{ cpu: 2.5 },
			{ memoryGb: -8 },
			{ diskGb: Number.NaN },
			{ diskGb: Number.POSITIVE_INFINITY },
			{ idleMinutes: -1 },
		]) {
			expect(() =>
				buildBoxesCreateCommand({ ...DEFAULTS, ...bad }, ORG),
			).toThrow();
		}
	});

	test("refuses names, regions and providers that could smuggle shell or flags", () => {
		for (const bad of [
			{ name: "box; rm -rf ~" },
			{ name: "--provider=evil" },
			{ name: "my box" },
			{ name: "" },
			{ region: "eu $(id)" },
			{ region: "-x" },
			{ provider: "modal" as BoxesCreateOptions["provider"] },
			{ projectIds: ["--github"] },
			{ projectIds: ["-p"] },
			{ projectIds: ["p; rm -rf ~"] },
			{ projectIds: ["$(id)"] },
			{ projectIds: ["a b"] },
			{ projectIds: [""] },
			{ projectIds: ["ok-1", "x\nrm -rf ~"] },
		]) {
			expect(() =>
				buildBoxesCreateCommand({ ...DEFAULTS, ...bad }, ORG),
			).toThrow();
		}
	});
});

describe("parseWholeNumber", () => {
	test("reads whole numbers at or above the minimum", () => {
		expect(parseWholeNumber("10", 1)).toBe(10);
		expect(parseWholeNumber(" 60 ", 0)).toBe(60);
		expect(parseWholeNumber("0", 0)).toBe(0);
	});

	test("refuses everything else", () => {
		for (const bad of [
			"",
			"0",
			"-1",
			"1.5",
			"1e3",
			"0x10",
			"ten",
			"10 GiB",
			"9".repeat(20),
		]) {
			expect(parseWholeNumber(bad, 1)).toBeNull();
		}
	});
});

describe("isValidProjectId", () => {
	test("accepts ids and refuses anything that reads as an option or shell", () => {
		expect(isValidProjectId("0f8fad5b-d9cb-469f-a165-70867728950e")).toBe(true);
		expect(isValidProjectId("proj_1.a")).toBe(true);
		expect(isValidProjectId("-x")).toBe(false);
		expect(isValidProjectId("a'b")).toBe(false);
		expect(isValidProjectId("x".repeat(129))).toBe(false);
	});
});

describe("isValidBoxName", () => {
	test("accepts provider-safe names only", () => {
		expect(isValidBoxName("devbox")).toBe(true);
		expect(isValidBoxName("dev_box.2-eu")).toBe(true);
		expect(isValidBoxName("-devbox")).toBe(false);
		expect(isValidBoxName("dev box")).toBe(false);
		expect(isValidBoxName("x".repeat(64))).toBe(false);
	});
});
