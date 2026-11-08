import { describe, expect, test } from "bun:test";
import { boxStateLabel } from "./boxStateLabel";

function label(state: string | null | undefined): string | undefined {
	return boxStateLabel(state)?.message;
}

describe("boxStateLabel", () => {
	test("maps each provider's words to the app's labels", () => {
		expect(label("started")).toBe("Running");
		expect(label("running")).toBe("Running");
		expect(label("DEPLOYED")).toBe("Running");
		expect(label("stopped")).toBe("Stopped");
		expect(label("paused")).toBe("Sleeping");
		expect(label("standby")).toBe("Sleeping");
		expect(label("resuming")).toBe("Starting");
		expect(label("archived")).toBe("Archived");
	});

	test("never shows a raw word", () => {
		expect(label("build_failed")).toBe("Unknown");
		expect(label("constructor")).toBe("Unknown");
		expect(label("__proto__")).toBe("Unknown");
	});

	test("is null when the provider was not read", () => {
		expect(boxStateLabel(null)).toBeNull();
		expect(boxStateLabel(undefined)).toBeNull();
		expect(boxStateLabel("")).toBeNull();
	});
});
