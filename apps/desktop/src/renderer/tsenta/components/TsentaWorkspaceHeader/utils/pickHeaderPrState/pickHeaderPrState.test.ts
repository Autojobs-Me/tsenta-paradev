import { describe, expect, test } from "bun:test";
import type { ChecksRollup } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/computeChecksStatus";
import type {
	BranchSyncStatus,
	PRFlowState,
	PullRequest,
} from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/getPRFlowState";
import { pickHeaderPrState } from "./pickHeaderPrState";

const sync = (overrides: Partial<BranchSyncStatus> = {}): BranchSyncStatus => ({
	hasRepo: true,
	hasUpstream: true,
	pushCount: 0,
	pullCount: 0,
	isDefaultBranch: false,
	isDetached: false,
	hasUncommitted: false,
	currentBranch: "feature",
	defaultBranch: "main",
	...overrides,
});

const pr = (overrides: Partial<PullRequest> = {}): PullRequest => ({
	number: 7,
	url: "https://github.com/acme/app/pull/7",
	title: "Change",
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

const checks = (overall: ChecksRollup["overall"]): ChecksRollup => ({
	overall,
	successCount: 0,
	failureCount: 0,
	pendingCount: 0,
	relevantCount: 0,
});

const base = {
	checks: null,
	isAgentWorking: false,
	canCreatePr: true,
	hasCommitsAhead: true,
};

const withPr = (
	prOverrides: Partial<PullRequest> = {},
	syncOverrides: Partial<BranchSyncStatus> = {},
): PRFlowState => ({
	kind: "pr-exists",
	pr: pr(prOverrides),
	sync: sync(syncOverrides),
});

describe("pickHeaderPrState", () => {
	test("no pull request: commit first, then create, then push", () => {
		expect(
			pickHeaderPrState({
				...base,
				flowState: { kind: "no-pr", sync: sync({ hasUncommitted: true }) },
			}),
		).toEqual({ tone: null, action: "commit" });
		expect(
			pickHeaderPrState({
				...base,
				flowState: { kind: "no-pr", sync: sync({ pushCount: 2 }) },
			}).action,
		).toBe("create_pr");
		expect(
			pickHeaderPrState({
				...base,
				canCreatePr: false,
				flowState: { kind: "no-pr", sync: sync({ pushCount: 2 }) },
			}).action,
		).toBe("push");
		expect(
			pickHeaderPrState({
				...base,
				hasCommitsAhead: false,
				flowState: { kind: "no-pr", sync: sync() },
			}).action,
		).toBe("none");
	});

	test("merged, queued and closed pull requests", () => {
		expect(
			pickHeaderPrState({ ...base, flowState: withPr({ state: "merged" }) }),
		).toEqual({ tone: "merged", action: "none" });
		expect(
			pickHeaderPrState({ ...base, flowState: withPr({ state: "queued" }) }),
		).toEqual({ tone: "queued", action: "queued" });
		expect(
			pickHeaderPrState({ ...base, flowState: withPr({ state: "closed" }) }),
		).toEqual({ tone: "neutral", action: "none" });
	});

	test("local work comes before review and checks", () => {
		expect(
			pickHeaderPrState({
				...base,
				checks: checks("success"),
				flowState: withPr({ isDraft: true }, { hasUncommitted: true }),
			}),
		).toEqual({ tone: "out_of_sync", action: "commit" });
		expect(
			pickHeaderPrState({
				...base,
				flowState: withPr({}, { pushCount: 1 }),
			}),
		).toEqual({ tone: "out_of_sync", action: "push" });
		expect(
			pickHeaderPrState({
				...base,
				flowState: withPr({}, { pullCount: 1 }),
			}),
		).toEqual({ tone: "out_of_sync", action: "none" });
	});

	test("an agent at work shows only that", () => {
		expect(
			pickHeaderPrState({
				...base,
				isAgentWorking: true,
				flowState: withPr({}, { hasUncommitted: true }),
			}).action,
		).toBe("working");
	});

	test("draft, failing, pending and clean", () => {
		expect(
			pickHeaderPrState({ ...base, flowState: withPr({ isDraft: true }) }),
		).toEqual({ tone: "neutral", action: "ready_for_review" });
		expect(
			pickHeaderPrState({
				...base,
				checks: checks("failure"),
				flowState: withPr(),
			}),
		).toEqual({ tone: "out_of_sync", action: "none" });
		expect(
			pickHeaderPrState({
				...base,
				checks: checks("pending"),
				flowState: withPr(),
			}),
		).toEqual({ tone: "out_of_sync", action: "checks_pending" });
		expect(
			pickHeaderPrState({
				...base,
				checks: checks("none"),
				flowState: withPr(),
			}),
		).toEqual({ tone: "in_sync", action: "merge" });
		expect(
			pickHeaderPrState({
				...base,
				flowState: withPr({ reviewDecision: "changes_requested" }),
			}),
		).toEqual({ tone: "out_of_sync", action: "none" });
	});

	test("nothing while loading or without a repository", () => {
		expect(
			pickHeaderPrState({ ...base, flowState: { kind: "loading" } }),
		).toEqual({
			tone: null,
			action: "none",
		});
		expect(
			pickHeaderPrState({
				...base,
				flowState: { kind: "unavailable", reason: "default-branch" },
			}),
		).toEqual({ tone: null, action: "none" });
	});
});
