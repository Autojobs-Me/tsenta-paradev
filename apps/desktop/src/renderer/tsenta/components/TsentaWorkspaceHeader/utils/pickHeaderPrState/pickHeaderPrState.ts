import type { ChecksRollup } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/computeChecksStatus";
import type { PRFlowState } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/getPRFlowState";

/** Conductor's PR pill colours (workspace-chat spec §1.4). */
export type HeaderPrTone =
	| "in_sync"
	| "queued"
	| "out_of_sync"
	| "merged"
	| "neutral";

/** The header's primary git action (workspace-chat spec §1.5). */
export type HeaderPrAction =
	| "none"
	| "working"
	| "commit"
	| "push"
	| "create_pr"
	| "ready_for_review"
	| "checks_pending"
	| "merge"
	| "queued";

export interface HeaderPrState {
	/** The pill's colour, or null when there is no pull request to show. */
	tone: HeaderPrTone | null;
	action: HeaderPrAction;
}

const NOTHING: HeaderPrState = { tone: null, action: "none" };

/**
 * Conductor's header state machine (its RTi, right-panels spec §3.1),
 * evaluated in its order, on Paradev's flow state. Only the actions Paradev
 * can take show: commit (with its commit form), push, create PR, ready for
 * review and merge. Conductor's pull, resolve, "add comments to chat" and
 * "fix errors" have no Paradev action, so those states colour the pill and
 * show no button.
 */
export function pickHeaderPrState({
	flowState,
	checks,
	isAgentWorking,
	canCreatePr,
	hasCommitsAhead,
}: {
	flowState: PRFlowState;
	checks: ChecksRollup | null;
	isAgentWorking: boolean;
	/** A project workspace (sessions cannot open pull requests). */
	canCreatePr: boolean;
	hasCommitsAhead: boolean;
}): HeaderPrState {
	if (flowState.kind === "no-pr") {
		const { sync } = flowState;
		const needsPush = !sync.hasUpstream || sync.pushCount > 0;
		if (sync.hasUncommitted) return { tone: null, action: "commit" };
		if (canCreatePr && hasCommitsAhead) {
			return { tone: null, action: "create_pr" };
		}
		if (isAgentWorking) return { tone: null, action: "working" };
		return { tone: null, action: needsPush ? "push" : "none" };
	}
	if (flowState.kind !== "pr-exists") return NOTHING;

	const { pr, sync } = flowState;
	if (pr.state === "merged") return { tone: "merged", action: "none" };
	if (pr.state === "queued") return { tone: "queued", action: "queued" };
	if (pr.state === "closed") return { tone: "neutral", action: "none" };
	if (isAgentWorking) return { tone: "in_sync", action: "working" };
	if (sync?.hasUncommitted) return { tone: "out_of_sync", action: "commit" };
	if (sync && (!sync.hasUpstream || sync.pushCount > 0)) {
		return { tone: "out_of_sync", action: "push" };
	}
	if (sync && sync.pullCount > 0) {
		return { tone: "out_of_sync", action: "none" };
	}
	if (pr.reviewDecision === "changes_requested") {
		return { tone: "out_of_sync", action: "none" };
	}
	if (pr.isDraft) return { tone: "neutral", action: "ready_for_review" };
	if (checks?.overall === "failure") {
		return { tone: "out_of_sync", action: "none" };
	}
	if (checks?.overall === "pending") {
		return { tone: "out_of_sync", action: "checks_pending" };
	}
	return { tone: "in_sync", action: "merge" };
}
