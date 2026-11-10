import { describe, expect, test } from "bun:test";
import {
	type ConductorStatusInput,
	pickConductorStatus,
} from "./pickConductorStatus";

const idle: ConductorStatusInput = {
	workspaceStatus: null,
	isCreatePending: false,
	sandboxStatus: null,
	pullRequest: null,
	hasRemote: false,
	isSession: false,
};

const openPr = (
	pr: Partial<NonNullable<ConductorStatusInput["pullRequest"]>> = {},
): ConductorStatusInput["pullRequest"] => ({
	state: "open",
	reviewDecision: "pending",
	checksStatus: "pending",
	...pr,
});

describe("pickConductorStatus", () => {
	test("a dead or unborn sandbox outranks the agent and the PR", () => {
		expect(
			pickConductorStatus({
				...idle,
				sandboxStatus: "failed",
				workspaceStatus: "working",
				pullRequest: openPr(),
			}),
		).toBe("failed");
		expect(
			pickConductorStatus({
				...idle,
				sandboxStatus: "provisioning",
				pullRequest: openPr(),
			}),
		).toBe("setting-up");
		expect(pickConductorStatus({ ...idle, isCreatePending: true })).toBe(
			"setting-up",
		);
	});

	test("live agent state outranks the pull request", () => {
		const pullRequest = openPr({ state: "merged" });
		expect(
			pickConductorStatus({ ...idle, workspaceStatus: "working", pullRequest }),
		).toBe("working");
		expect(
			pickConductorStatus({ ...idle, workspaceStatus: "failed", pullRequest }),
		).toBe("failed");
		expect(
			pickConductorStatus({
				...idle,
				workspaceStatus: "permission",
				pullRequest,
			}),
		).toBe("needs-user-input");
	});

	test("ready for review shows the git state, not a glyph of its own", () => {
		expect(
			pickConductorStatus({
				...idle,
				workspaceStatus: "review",
				pullRequest: openPr({ state: "merged" }),
			}),
		).toBe("merged");
		expect(
			pickConductorStatus({
				...idle,
				workspaceStatus: "review",
				hasRemote: true,
			}),
		).toBe("branch");
	});

	test("pull requests follow Conductor's order", () => {
		const status = (pr: Parameters<typeof openPr>[0]) =>
			pickConductorStatus({ ...idle, pullRequest: openPr(pr) });
		expect(status({ state: "merged" })).toBe("merged");
		expect(status({ state: "queued" })).toBe("merge-queued");
		expect(status({ state: "closed" })).toBe("closed-pr");
		expect(
			status({ state: "draft", reviewDecision: null, checksStatus: "none" }),
		).toBe("draft-pr");
		expect(
			status({ reviewDecision: "approved", checksStatus: "success" }),
		).toBe("ready-to-merge");
		expect(status({ reviewDecision: null, checksStatus: "none" })).toBe(
			"ready-to-merge",
		);
		expect(
			status({ reviewDecision: "approved", checksStatus: "failure" }),
		).toBe("checks-failing");
		expect(status({ checksStatus: "pending" })).toBe("checks-pending");
		expect(
			status({ reviewDecision: "changes_requested", checksStatus: "success" }),
		).toBe("open-pr");
	});

	test("without a pull request: branch when pushed, else local", () => {
		expect(pickConductorStatus({ ...idle, hasRemote: true })).toBe("branch");
		expect(pickConductorStatus(idle)).toBe("local");
		expect(
			pickConductorStatus({ ...idle, isSession: true, hasRemote: true }),
		).toBe("session");
	});
});
