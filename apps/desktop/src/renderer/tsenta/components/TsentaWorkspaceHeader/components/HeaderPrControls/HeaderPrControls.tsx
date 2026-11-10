import { Trans, useLingui } from "@lingui/react/macro";
import { WaveSpinner } from "@superset/ui/atoms/WaveSpinner";
import { Popover, PopoverAnchor, PopoverContent } from "@superset/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import {
	ArrowUpRight,
	GitCommitHorizontal,
	GitMerge,
	GitPullRequest,
	GitPullRequestCreate,
	LoaderCircle,
	Upload,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useTerminalAgentStatuses } from "renderer/hooks/host-service/useTerminalAgentStatuses";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { usePullRequestLinkPolicy } from "renderer/lib/clickPolicy";
import { openPullRequestInBrowser } from "renderer/lib/github/openPullRequestInBrowser";
import { openPullRequestLink } from "renderer/lib/github/openPullRequestLink";
import { CommitForm } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/CommitForm";
import { CreatePrForm } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/CreatePrForm";
import { usePRFlowState } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePRFlowState";
import { usePullRequestActions } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePullRequestActions";
import { useShipActions } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/useShipActions";
import { computeChecksRollup } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/computeChecksStatus";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";
import { usePullRequestPaneIntent } from "renderer/stores/pull-request-pane-intent";
import { getHighestPriorityStatus } from "shared/tabs-types";
import { flowStatePullRequest } from "../../utils/headerStatusInput";
import {
	type HeaderPrTone,
	pickHeaderPrState,
} from "../../utils/pickHeaderPrState";

const TONE_CLASS: Record<HeaderPrTone, string> = {
	in_sync: "text-success !border-success/20",
	queued: "text-status-in-progress !border-status-in-progress/20",
	out_of_sync: "text-highlight-muted !border-border-highlight/50",
	merged:
		"text-purple-500 !border-purple-500/20 [.dark_&]:text-purple-400 [.dark_&]:!border-purple-400/30",
	neutral: "",
};

/** Conductor's inverted "tip" chip (its _N.xs): dark on light in dark mode. */
const TIP_BUTTON =
	"no-drag inline-flex h-6 shrink-0 items-center gap-1 rounded-sm border border-sidebar-border bg-highlight-tint-foreground py-1 pr-2 pl-1.5 text-xs text-highlight-tint drop-shadow-xs hover:bg-highlight-tint-foreground/90 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3 [&_svg]:text-tip-secondary";

/** Conductor's neutral chip (its nxt and _Is): Create PR, Ready for review. */
const NEUTRAL_BUTTON =
	"no-drag inline-flex h-6 shrink-0 items-center gap-1 rounded-sm border !border-input bg-popover py-1 pr-2 pl-1.5 text-xs text-secondary-foreground drop-shadow-xs hover:bg-popover/90 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3";

/** Conductor's green merge button (its yIs.xs). */
const MERGE_BUTTON =
	"no-drag inline-flex h-6 shrink-0 items-center gap-1 rounded-sm border-0 bg-positive px-1.5 py-1 text-xs text-positive-foreground drop-shadow-xs hover:bg-positive/90 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3";

/**
 * The pull request pill and the one git action beside it, which Conductor's
 * header shows while the right panel is closed (workspace-chat spec §1.3 to
 * §1.5; right-panels spec §3.1). They run on Paradev's own git flow:
 * usePRFlowState for the state, useShipActions for commit, push and create
 * (with Paradev's commit and pull request forms) and usePullRequestActions
 * for ready for review and merge. The pill opens the pull request pane, or
 * the browser per the pull request link setting; its arrow always opens
 * the browser.
 */
export function HeaderPrControls() {
	const { t } = useLingui();
	const { workspace } = useWorkspace();
	const workspaceId = workspace.id;
	const { flowState, onRetry } = usePRFlowState(workspaceId);
	const pr = flowStatePullRequest(flowState);
	const checks = useMemo(
		() => (pr ? computeChecksRollup(pr.checks) : null),
		[pr],
	);
	const agentStatuses = useTerminalAgentStatuses(workspaceId);
	const isAgentWorking =
		getHighestPriorityStatus(agentStatuses.values()) === "working";
	const [view, setView] = useState<"commit" | "pr" | null>(null);
	const ship = useShipActions({
		workspaceId,
		onRefresh: onRetry,
		isPrFormOpen: view === "pr",
		onCommitted: () => setView(null),
		onPrCreated: () => setView(null),
	});
	const organizationId = useActiveOrganizationId();
	const prActions = usePullRequestActions({
		workspaceId,
		target: pr
			? {
					organizationId,
					repoFullName: `${pr.repoOwner}/${pr.repoName}`,
					prNumber: pr.number,
				}
			: null,
		onRefresh: onRetry,
	});
	const linkPolicy = usePullRequestLinkPolicy();

	const { tone, action } = pickHeaderPrState({
		flowState,
		checks,
		isAgentWorking,
		canCreatePr: ship.canCreatePr,
		hasCommitsAhead: ship.hasCommitsAhead,
	});

	const openPane = (
		ref: { repoFullName: string; number: number },
		placement?: "split" | "tab",
	) =>
		usePullRequestPaneIntent
			.getState()
			.request({ workspaceId, ...ref, placement });

	let actionButton: ReactNode = null;
	switch (action) {
		case "working":
			actionButton = (
				<span
					role="img"
					aria-label={t({ message: "Working", context: "agent status" })}
					className="flex size-3 items-center justify-center text-muted-foreground"
				>
					<WaveSpinner />
				</span>
			);
			break;
		case "commit":
			actionButton = (
				<button
					type="button"
					className={TIP_BUTTON}
					disabled={ship.isCommitting}
					onClick={() => setView("commit")}
				>
					{ship.isCommitting ? (
						<LoaderCircle className="animate-spin" />
					) : (
						<GitCommitHorizontal />
					)}
					<Trans>Commit</Trans>
				</button>
			);
			break;
		case "push":
			actionButton = (
				<button
					type="button"
					className={TIP_BUTTON}
					disabled={ship.isPushing}
					onClick={ship.push}
				>
					{ship.isPushing ? (
						<LoaderCircle className="animate-spin" />
					) : (
						<Upload />
					)}
					<Trans>Push</Trans>
				</button>
			);
			break;
		case "create_pr":
			actionButton = (
				<button
					type="button"
					className={NEUTRAL_BUTTON}
					disabled={ship.isShipping}
					onClick={() => {
						ship.seedPrTitle();
						setView("pr");
					}}
				>
					{ship.isShipping ? (
						<LoaderCircle className="animate-spin" />
					) : (
						<GitPullRequestCreate />
					)}
					<Trans>Create PR</Trans>
				</button>
			);
			break;
		case "ready_for_review":
			actionButton = (
				<button
					type="button"
					className={NEUTRAL_BUTTON}
					disabled={prActions.isMarkingReady}
					onClick={prActions.markReady}
				>
					{prActions.isMarkingReady ? (
						<LoaderCircle className="animate-spin" />
					) : (
						<GitPullRequest />
					)}
					<Trans>Ready for review</Trans>
				</button>
			);
			break;
		case "checks_pending":
			actionButton = (
				<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
					<Trans>Checks running</Trans>
				</span>
			);
			break;
		case "merge":
			actionButton = (
				<button
					type="button"
					className={MERGE_BUTTON}
					disabled={prActions.isMerging}
					onClick={() => prActions.merge("squash")}
				>
					{prActions.isMerging ? (
						<LoaderCircle className="animate-spin" />
					) : (
						<GitMerge />
					)}
					<Trans>Squash and merge</Trans>
				</button>
			);
			break;
		case "queued":
			actionButton = (
				<span className="flex shrink-0 items-center gap-1 rounded bg-[#9a6700] px-2 py-1 text-xs font-medium text-white">
					<Trans>Queued</Trans>
				</span>
			);
			break;
		case "none":
			break;
	}

	if (!pr && !actionButton) return null;

	return (
		<div className="flex shrink-0 items-center gap-3">
			{pr && tone && (
				<div
					data-tsenta="header-pr-pill"
					className={cn(
						"no-drag flex h-6 shrink-0 items-center overflow-hidden whitespace-nowrap rounded-sm border border-sidebar-border text-xs font-medium text-sidebar-muted-foreground",
						TONE_CLASS[tone],
					)}
				>
					<Tooltip delayDuration={500}>
						<TooltipTrigger asChild>
							<button
								type="button"
								aria-label={t({ message: `Pull request #${pr.number}` })}
								onClick={(event) =>
									openPullRequestLink(
										pr.url,
										linkPolicy.getAction(event),
										openPane,
									)
								}
								className="flex h-full cursor-pointer items-center gap-1 px-2 transition-colors hover:bg-accent"
							>
								<GitPullRequest className="size-3" />#{pr.number}
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom">{pr.title}</TooltipContent>
					</Tooltip>
					<Tooltip delayDuration={500}>
						<TooltipTrigger asChild>
							<button
								type="button"
								aria-label={t({ message: "Open in browser" })}
								onClick={() => openPullRequestInBrowser(pr.url)}
								className="flex h-full cursor-pointer items-center self-stretch border-l border-sidebar-border px-1 transition-colors hover:bg-accent"
							>
								<ArrowUpRight className="size-3" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<Trans>Open in browser</Trans>
						</TooltipContent>
					</Tooltip>
				</div>
			)}
			{actionButton && (
				<Popover
					open={view !== null}
					onOpenChange={(open) => {
						if (!open) setView(null);
					}}
				>
					<PopoverAnchor asChild>
						<div className="flex shrink-0 items-center">{actionButton}</div>
					</PopoverAnchor>
					<PopoverContent
						align="end"
						sideOffset={8}
						className={view === "pr" ? "w-96 p-3" : "w-80 p-3"}
					>
						{view === "commit" ? (
							<CommitForm actions={ship} />
						) : view === "pr" ? (
							<CreatePrForm actions={ship} />
						) : null}
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}
