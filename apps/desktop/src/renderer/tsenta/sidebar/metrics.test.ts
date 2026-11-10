import { afterEach, describe, expect, test } from "bun:test";
import { MIN_WORKSPACE_SIDEBAR_WIDTH } from "renderer/stores/workspace-sidebar-state";
import { capSidebarMaxWidth } from "./metrics";

afterEach(() => {
	delete document.documentElement.dataset.skin;
});

describe("capSidebarMaxWidth", () => {
	test("leaves Paradev's limit alone with the skin off", () => {
		expect(capSidebarMaxWidth(400, 900)).toBe(400);
	});

	test("holds the sidebar to 40% of the window under the skin", () => {
		document.documentElement.dataset.skin = "conductor";
		expect(capSidebarMaxWidth(478, 1000)).toBe(400);
	});

	test("keeps Paradev's limit when it is the tighter one", () => {
		document.documentElement.dataset.skin = "conductor";
		expect(capSidebarMaxWidth(480, 1728)).toBe(480);
	});

	test("never goes below the sidebar's minimum width", () => {
		document.documentElement.dataset.skin = "conductor";
		expect(capSidebarMaxWidth(400, 300)).toBe(MIN_WORKSPACE_SIDEBAR_WIDTH);
	});
});
