import type { ActivePaneStatus } from "shared/tabs-types";

/**
 * Conductor's workspace statuses that Paradev's data can tell apart
 * (shell-sidebar spec §4.7). Paradev has no merge-conflict state, and a
 * closed pull request, which Conductor never shows, keeps a glyph of its own.
 */
export type ConductorWorkspaceStatus =
	| "failed"
	| "setting-up"
	| "working"
	| "needs-user-input"
	| "merged"
	| "merge-queued"
	| "ready-to-merge"
	| "draft-pr"
	| "checks-failing"
	| "checks-pending"
	| "open-pr"
	| "closed-pr"
	| "branch"
	| "local"
	| "session";

export interface ConductorStatusInput {
	workspaceStatus: ActivePaneStatus | null;
	isCreatePending: boolean;
	sandboxStatus: "provisioning" | "failed" | null;
	pullRequest: {
		state: "open" | "merged" | "closed" | "draft" | "queued";
		reviewDecision: "approved" | "changes_requested" | "pending" | null;
		checksStatus: "success" | "failure" | "pending" | "none";
	} | null;
	hasRemote: boolean;
	isSession: boolean;
}

/**
 * One status per row, in Paradev's precedence (the sandbox's own state,
 * then live agent state, then the pull request, then the branch) with
 * Conductor's git order inside the pull request: merged, in the merge queue,
 * ready to merge, draft, checks failing, checks running, open.
 *
 * "Ready for review" is not a glyph in Conductor: a finished agent marks the
 * row unread, which bolds its name, and the glyph stays the git state.
 * Ready to merge stands in for GitHub's clean merge state, which Paradev
 * does not have: an approved (or review-free) pull request whose checks
 * passed or that has none.
 */
export function pickConductorStatus({
	workspaceStatus,
	isCreatePending,
	sandboxStatus,
	pullRequest,
	hasRemote,
	isSession,
}: ConductorStatusInput): ConductorWorkspaceStatus {
	if (sandboxStatus === "failed") return "failed";
	if (isCreatePending || sandboxStatus === "provisioning") return "setting-up";
	if (workspaceStatus === "working") return "working";
	if (workspaceStatus === "failed") return "failed";
	if (workspaceStatus === "permission") return "needs-user-input";
	if (pullRequest) {
		const { state, reviewDecision, checksStatus } = pullRequest;
		if (state === "merged") return "merged";
		if (state === "queued") return "merge-queued";
		if (state === "closed") return "closed-pr";
		if (state === "draft") return "draft-pr";
		const reviewClear =
			reviewDecision === "approved" || reviewDecision === null;
		const checksClear = checksStatus === "success" || checksStatus === "none";
		if (reviewClear && checksClear) return "ready-to-merge";
		if (checksStatus === "failure") return "checks-failing";
		if (checksStatus === "pending") return "checks-pending";
		return "open-pr";
	}
	if (isSession) return "session";
	return hasRemote ? "branch" : "local";
}
