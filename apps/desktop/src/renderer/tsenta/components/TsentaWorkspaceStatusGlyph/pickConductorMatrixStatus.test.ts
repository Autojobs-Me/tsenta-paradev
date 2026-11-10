import { describe, expect, test } from "bun:test";
import { pickConductorMatrixStatus } from "./pickConductorMatrixStatus";
import type { ConductorStatusInput } from "./pickConductorStatus";

const base: ConductorStatusInput = {
	workspaceStatus: null,
	isCreatePending: false,
	sandboxStatus: null,
	pullRequest: null,
	hasRemote: true,
	isSession: false,
};
const pr = (
	overrides: Partial<NonNullable<ConductorStatusInput["pullRequest"]>> = {},
): ConductorStatusInput["pullRequest"] => ({
	state: "open",
	reviewDecision: "pending",
	checksStatus: "none",
	...overrides,
});

describe("pickConductorMatrixStatus", () => {
	test("a branch, a local workspace and a session", () => {
		expect(pickConductorMatrixStatus(base)).toEqual({
			status: "branch",
			gitStatus: "branch",
		});
		expect(pickConductorMatrixStatus({ ...base, hasRemote: false })).toEqual({
			status: "local",
			gitStatus: "local",
		});
		expect(pickConductorMatrixStatus({ ...base, isSession: true })).toEqual({
			status: "local",
			gitStatus: "local",
		});
	});

	test("pull requests in Conductor's git order", () => {
		const git = (pullRequest: ConductorStatusInput["pullRequest"]) =>
			pickConductorMatrixStatus({ ...base, pullRequest })?.gitStatus;
		expect(git(pr({ state: "merged", checksStatus: "failure" }))).toBe(
			"merged",
		);
		expect(git(pr({ state: "queued" }))).toBe("merge-queued");
		expect(git(pr({ state: "draft", checksStatus: "success" }))).toBe(
			"draft-pr",
		);
		expect(
			git(pr({ reviewDecision: "approved", checksStatus: "success" })),
		).toBe("ready-to-merge");
		expect(git(pr({ checksStatus: "failure" }))).toBe("checks-failing");
		expect(git(pr({ checksStatus: "pending" }))).toBe("checks-pending");
		expect(git(pr({ reviewDecision: "changes_requested" }))).toBe("open-pr");
	});

	test("running checks are git's alone: the status reads as an open pull request", () => {
		expect(
			pickConductorMatrixStatus({
				...base,
				pullRequest: pr({ checksStatus: "pending" }),
			}),
		).toEqual({ status: "open-pr", gitStatus: "checks-pending" });
	});

	test("the workspace and its agent come before git", () => {
		const status = (input: Partial<ConductorStatusInput>) =>
			pickConductorMatrixStatus({
				...base,
				pullRequest: pr({ state: "merged" }),
				...input,
			})?.status;
		expect(
			status({ sandboxStatus: "failed", workspaceStatus: "working" }),
		).toBe("failed");
		expect(status({ isCreatePending: true })).toBe("setting-up");
		expect(status({ sandboxStatus: "provisioning" })).toBe("setting-up");
		expect(status({ workspaceStatus: "permission" })).toBe(
			"needs-user-permission",
		);
		expect(status({ workspaceStatus: "working" })).toBe("working");
		expect(status({ workspaceStatus: "failed" })).toBe("failed");
		// A finished agent is the unread state, not a status.
		expect(status({ workspaceStatus: "review" })).toBe("merged");
	});

	test("a closed pull request keeps the fork's glyph", () => {
		expect(
			pickConductorMatrixStatus({
				...base,
				pullRequest: pr({ state: "closed" }),
			}),
		).toBeNull();
	});
});
