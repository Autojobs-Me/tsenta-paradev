/**
 * Conductor's workspace statuses (shell-sidebar spec §4.7, its gKt / vKt
 * and the sets around them, renderApp R:477100 to R:477330).
 */
export type ConductorGitStatus =
	| "merged"
	| "merge-queued"
	| "ready-to-merge"
	| "draft-pr"
	| "merge-conflict"
	| "checks-failing"
	| "checks-pending"
	| "open-pr"
	| "local"
	| "branch";

export type ConductorMatrixStatus =
	| "unstarted"
	| "setting-up"
	| "failed"
	| "needs-plan-response"
	| "needs-user-permission"
	| "needs-user-input"
	| "working"
	| "cancelling"
	| "waiting"
	| ConductorGitStatus;

const GIT_STATUSES = new Set<string>([
	"merged",
	"merge-queued",
	"ready-to-merge",
	"draft-pr",
	"merge-conflict",
	"checks-failing",
	"checks-pending",
	"open-pr",
	"local",
	"branch",
]);
export const ACTIVE_STATUSES = new Set<ConductorMatrixStatus>([
	"cancelling",
	"setting-up",
	"waiting",
	"working",
]);
export const ATTENTION_STATUSES = new Set<ConductorMatrixStatus>([
	"failed",
	"needs-plan-response",
	"needs-user-input",
	"needs-user-permission",
]);

export function isGitStatus(
	status: ConductorMatrixStatus,
): status is ConductorGitStatus {
	return GIT_STATUSES.has(status);
}

/** A git status that says something (not the plain branch or local). */
export function isPullRequestGitStatus(
	status: ConductorMatrixStatus,
): status is ConductorGitStatus {
	return isGitStatus(status) && status !== "branch" && status !== "local";
}

type Tone = "muted" | "negative" | "warning" | "merged" | "positive";

const TONE: Record<ConductorMatrixStatus, Tone> = {
	unstarted: "muted",
	"setting-up": "muted",
	failed: "negative",
	"needs-plan-response": "warning",
	"needs-user-permission": "warning",
	"needs-user-input": "muted",
	working: "muted",
	cancelling: "muted",
	waiting: "muted",
	merged: "merged",
	"merge-queued": "muted",
	"ready-to-merge": "positive",
	"draft-pr": "muted",
	"merge-conflict": "warning",
	"checks-failing": "negative",
	"checks-pending": "muted",
	"open-pr": "muted",
	local: "muted",
	branch: "muted",
};

export function toneOf(status: ConductorMatrixStatus): Tone {
	return TONE[status];
}

export function toneColor(tone: Tone): string | undefined {
	switch (tone) {
		case "merged":
			return "text-purple-500";
		case "negative":
			return "text-destructive";
		case "positive":
			return "text-git-green";
		case "warning":
			return "text-highlight-muted";
		case "muted":
			return undefined;
	}
}

/** Conductor's status colour (xKt), amber for a conflict in the matrix. */
export function statusColor(status: ConductorMatrixStatus): string {
	if (status === "merge-conflict") return "text-amber-500";
	if (status === "failed" || status === "checks-failing") {
		return "text-destructive";
	}
	if (status === "merged") return "text-purple-500";
	if (status === "merge-queued") return "text-status-in-progress";
	if (status === "ready-to-merge") return "text-git-green";
	if (status === "checks-pending") return "text-checks-pending";
	return "text-sidebar-muted-foreground";
}
