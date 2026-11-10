import type { ChecksRollup } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/computeChecksStatus";
import type {
	BranchSyncStatus,
	PRFlowState,
	PullRequest,
} from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/getPRFlowState";
import type { ConductorStatusInput } from "renderer/tsenta/components/TsentaWorkspaceStatusGlyph/pickConductorStatus";
import type { ActivePaneStatus } from "shared/tabs-types";

/** The pull request a flow state carries, when there is one. */
export function flowStatePullRequest(state: PRFlowState): PullRequest | null {
	switch (state.kind) {
		case "pr-exists":
		case "busy":
		case "error":
			return state.pr;
		default:
			return null;
	}
}

/** The branch's sync status a flow state carries, when there is one. */
export function flowStateSync(state: PRFlowState): BranchSyncStatus | null {
	return state.kind === "no-pr" || state.kind === "pr-exists"
		? state.sync
		: null;
}

/**
 * The open workspace's state in the shape the sidebar's status pickers take,
 * from the sources the workspace view already has: the agents' attention
 * status, the pull request and branch from usePRFlowState, and the
 * workspace's type. The header has no sandbox or create-in-flight state:
 * the view only opens once the workspace exists.
 */
export function headerStatusInput({
	agentStatus,
	flowState,
	checks,
	isSession,
}: {
	agentStatus: ActivePaneStatus | null;
	flowState: PRFlowState;
	checks: ChecksRollup | null;
	isSession: boolean;
}): ConductorStatusInput {
	const pr = flowStatePullRequest(flowState);
	const sync = flowStateSync(flowState);
	return {
		workspaceStatus: agentStatus,
		isCreatePending: false,
		sandboxStatus: null,
		pullRequest: pr
			? {
					state: pr.isDraft && pr.state === "open" ? "draft" : pr.state,
					reviewDecision:
						pr.reviewDecision === "review_required"
							? "pending"
							: pr.reviewDecision,
					checksStatus: checks?.overall ?? "none",
				}
			: null,
		hasRemote: sync?.hasUpstream ?? false,
		isSession,
	};
}
