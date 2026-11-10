import type {
	ConductorGitStatus,
	ConductorMatrixStatus,
} from "renderer/tsenta/components/TsentaWorkspaceStatusMatrix";
import type { ConductorStatusInput } from "./pickConductorStatus";

export interface ConductorMatrixInput {
	status: ConductorMatrixStatus;
	gitStatus: ConductorGitStatus;
}

/**
 * Paradev's row state in the two inputs Conductor's status matrix takes
 * (its gKt and vKt, shell-sidebar spec §4.7), or null when the matrix has no
 * way to show it and the row keeps the fork's glyph: a closed pull request,
 * which Conductor never shows.
 *
 * - status: the workspace's own state (a sandbox being made or one that
 *   failed, a create in flight), then its agent (Paradev's working,
 *   permission and failed), then git without running checks.
 * - gitStatus: git alone, in Conductor's order: merged, in the merge queue,
 *   ready to merge, draft, checks failing, checks running, open, then a
 *   branch with a remote or a local one. Paradev has no merge-conflict
 *   state; ready to merge is the fork's stand-in for GitHub's clean merge
 *   state (see pickConductorStatus).
 *
 * A finished agent ("review") is not a status in Conductor: the row is
 * unread, which the matrix and the name show. A project-less session has
 * no git, so it reads as a local workspace.
 */
export function pickConductorMatrixStatus({
	workspaceStatus,
	isCreatePending,
	sandboxStatus,
	pullRequest,
	hasRemote,
	isSession,
}: ConductorStatusInput): ConductorMatrixInput | null {
	let gitStatus: ConductorGitStatus;
	if (pullRequest) {
		const { state, reviewDecision, checksStatus } = pullRequest;
		if (state === "closed") return null;
		const reviewClear =
			reviewDecision === "approved" || reviewDecision === null;
		const checksClear = checksStatus === "success" || checksStatus === "none";
		gitStatus =
			state === "merged"
				? "merged"
				: state === "queued"
					? "merge-queued"
					: state === "draft"
						? "draft-pr"
						: reviewClear && checksClear
							? "ready-to-merge"
							: checksStatus === "failure"
								? "checks-failing"
								: checksStatus === "pending"
									? "checks-pending"
									: "open-pr";
	} else {
		gitStatus = hasRemote && !isSession ? "branch" : "local";
	}

	let status: ConductorMatrixStatus =
		gitStatus === "checks-pending" ? "open-pr" : gitStatus;
	if (sandboxStatus === "failed") status = "failed";
	else if (isCreatePending || sandboxStatus === "provisioning") {
		status = "setting-up";
	} else if (workspaceStatus === "permission") {
		status = "needs-user-permission";
	} else if (workspaceStatus === "working") status = "working";
	else if (workspaceStatus === "failed") status = "failed";
	return { status, gitStatus };
}
