import { describe, expect, test } from "bun:test";
import {
	type BoxesCreateOptions,
	buildBoxesCreateCommand,
	isValidBoxName,
	parseWholeNumber,
} from "./buildBoxesCreateCommand";

const ORG = "5b0f3c8e-2f7a-4a7e-9d61-3f1c2b4a5d6e";
const DEFAULTS: BoxesCreateOptions = {
	provider: "daytona",
	cpu: 4,
	memoryGb: 8,
	diskGb: 10,
	idleMinutes: 60,
};

describe("buildBoxesCreateCommand", () => {
	test("signs in to the org, then creates the box with every flag", () => {
		expect(buildBoxesCreateCommand(DEFAULTS, ORG)).toBe(
			`export SUPERSET_ORGANIZATION_ID=${ORG}; superset auth whoami >/dev/null 2>&1 || superset auth login --organization ${ORG} || exit 1; superset boxes create --provider daytona --cpu 4 --memory 8 --disk 10 --idle 60 --org ${ORG}`,
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
			`; superset boxes create devbox-1 --provider e2b --cpu 4 --memory 8 --disk 10 --idle 0 --region eu --org ${ORG}`,
		);
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

describe("isValidBoxName", () => {
	test("accepts provider-safe names only", () => {
		expect(isValidBoxName("devbox")).toBe(true);
		expect(isValidBoxName("dev_box.2-eu")).toBe(true);
		expect(isValidBoxName("-devbox")).toBe(false);
		expect(isValidBoxName("dev box")).toBe(false);
		expect(isValidBoxName("x".repeat(64))).toBe(false);
	});
});
