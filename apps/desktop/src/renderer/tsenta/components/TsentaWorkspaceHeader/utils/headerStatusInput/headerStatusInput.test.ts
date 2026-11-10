import { describe, expect, test } from "bun:test";
import type {
	BranchSyncStatus,
	PRFlowState,
	PullRequest,
} from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/getPRFlowState";
import { headerStatusInput } from "./headerStatusInput";

const sync: BranchSyncStatus = {
	hasRepo: true,
	hasUpstream: true,
	pushCount: 0,
	pullCount: 0,
	isDefaultBranch: false,
	isDetached: false,
	hasUncommitted: false,
	currentBranch: "feature",
	defaultBranch: "main",
};

const pr = (overrides: Partial<PullRequest> = {}): PullRequest => ({
	number: 42,
	url: "https://github.com/acme/app/pull/42",
	title: "Add things",
	body: null,
	state: "open",
	isDraft: false,
	reviewDecision: null,
	mergeable: "unknown",
	headRefName: "feature",
	updatedAt: "",
	checks: [],
	repoOwner: "acme",
	repoName: "app",
	...overrides,
});

describe("headerStatusInput", () => {
	test("a branch with no pull request reads its remote from the sync status", () => {
		const flowState: PRFlowState = { kind: "no-pr", sync };
		expect(
			headerStatusInput({
				agentStatus: null,
				flowState,
				checks: null,
				isSession: false,
			}),
		).toEqual({
			workspaceStatus: null,
			isCreatePending: false,
			sandboxStatus: null,
			pullRequest: null,
			hasRemote: true,
			isSession: false,
		});
	});

	test("an open draft reads as a draft, and review_required as pending", () => {
		const flowState: PRFlowState = {
			kind: "pr-exists",
			pr: pr({ isDraft: true, reviewDecision: "review_required" }),
			sync,
		};
		expect(
			headerStatusInput({
				agentStatus: "working",
				flowState,
				checks: {
					overall: "pending",
					successCount: 0,
					failureCount: 0,
					pendingCount: 1,
					relevantCount: 1,
				},
				isSession: false,
			}).pullRequest,
		).toEqual({
			state: "draft",
			reviewDecision: "pending",
			checksStatus: "pending",
		});
	});

	test("a merged pull request stays merged even if it was a draft", () => {
		const flowState: PRFlowState = {
			kind: "pr-exists",
			pr: pr({ isDraft: true, state: "merged" }),
			sync: null,
		};
		const input = headerStatusInput({
			agentStatus: null,
			flowState,
			checks: null,
			isSession: false,
		});
		expect(input.pullRequest?.state).toBe("merged");
		expect(input.pullRequest?.checksStatus).toBe("none");
		expect(input.hasRemote).toBe(false);
	});

	test("while loading there is no pull request and no remote", () => {
		expect(
			headerStatusInput({
				agentStatus: "permission",
				flowState: { kind: "loading" },
				checks: null,
				isSession: true,
			}),
		).toMatchObject({
			workspaceStatus: "permission",
			pullRequest: null,
			hasRemote: false,
			isSession: true,
		});
	});
});
