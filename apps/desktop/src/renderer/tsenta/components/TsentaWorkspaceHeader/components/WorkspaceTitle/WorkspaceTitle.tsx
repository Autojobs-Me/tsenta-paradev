import { Trans, useLingui } from "@lingui/react/macro";
import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { Check, Copy } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useTerminalAgentStatuses } from "renderer/hooks/host-service/useTerminalAgentStatuses";
import { useCopyToClipboard } from "renderer/hooks/useCopyToClipboard";
import { usePRFlowState } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePRFlowState";
import { useWorkspaceOpenInTarget } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/useWorkspaceOpenInTarget";
import { computeChecksRollup } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/computeChecksStatus";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";
import { pickConductorMatrixStatus } from "renderer/tsenta/components/TsentaWorkspaceStatusGlyph/pickConductorMatrixStatus";
import { TsentaWorkspaceStatusMatrix } from "renderer/tsenta/components/TsentaWorkspaceStatusMatrix";
import { getHighestPriorityStatus } from "shared/tabs-types";
import {
	flowStatePullRequest,
	headerStatusInput,
} from "../../utils/headerStatusInput";

/**
 * The header's title (workspace-chat spec §1.2; Conductor's E6o, renderApp
 * R:236336): the workspace's status matrix and name in a bare 24px button
 * that opens the workspace's details. The matrix is the sidebar row's, from
 * the same Paradev sources: the agents' attention status, the pull request
 * and the branch.
 */
export function WorkspaceTitle() {
	const { t } = useLingui();
	const { workspace } = useWorkspace();
	const agentStatuses = useTerminalAgentStatuses(workspace.id);
	const agentStatus = getHighestPriorityStatus(agentStatuses.values());
	const { flowState } = usePRFlowState(workspace.id);
	const pullRequest = flowStatePullRequest(flowState);
	const checks = useMemo(
		() => (pullRequest ? computeChecksRollup(pullRequest.checks) : null),
		[pullRequest],
	);
	const input = headerStatusInput({
		agentStatus,
		flowState,
		checks,
		isSession: workspace.type === "session",
	});
	// A closed pull request is the one state the matrix has no face for; the
	// branch stands in, as it does for a closed pull request in Conductor.
	const matrix = pickConductorMatrixStatus(input) ??
		pickConductorMatrixStatus({ ...input, pullRequest: null }) ?? {
			status: "local",
			gitStatus: "local",
		};
	const hasUnread = agentStatus === "review" || agentStatus === "permission";
	const name = workspace.name || workspace.branch;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={t({ message: "Workspace details" })}
					className="no-drag mx-1 flex h-6 min-w-0 cursor-pointer items-center rounded-sm px-1.5 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-accent"
				>
					<span className="flex size-3.5 shrink-0 items-center justify-center">
						<TsentaWorkspaceStatusMatrix
							status={matrix.status}
							gitStatus={matrix.gitStatus}
							hasUnread={hasUnread}
							label={
								input.isSession && matrix.status === "local"
									? t({ message: "Session" })
									: undefined
							}
						/>
					</span>
					<span className="ml-1.5 min-w-0 max-w-64 truncate text-sm font-medium">
						{name}
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={4}
				className="flex w-80 flex-col gap-3 p-4"
			>
				<div className="min-w-0 break-words text-sm font-medium leading-snug">
					{name}
				</div>
				<WorkspaceDetails />
			</PopoverContent>
		</Popover>
	);
}

function WorkspaceDetails() {
	const { t } = useLingui();
	const { workspace } = useWorkspace();
	const target = useWorkspaceOpenInTarget(workspace.id);
	return (
		<dl className="flex flex-col gap-2 text-xs">
			{workspace.branch && (
				<DetailRow
					label={<Trans>Branch</Trans>}
					value={workspace.branch}
					copyLabel={t({ message: "Copy branch name" })}
					mono
				/>
			)}
			{target?.worktreePath && (
				<DetailRow
					label={<Trans>Location</Trans>}
					value={target.worktreePath}
					copyLabel={t({ message: "Copy path" })}
				/>
			)}
		</dl>
	);
}

function DetailRow({
	label,
	value,
	copyLabel,
	mono = false,
}: {
	label: ReactNode;
	value: string;
	copyLabel: string;
	mono?: boolean;
}) {
	const { t } = useLingui();
	const { copyToClipboard, copied } = useCopyToClipboard();
	return (
		<div className="flex min-w-0 items-center gap-2">
			<dt className="w-16 shrink-0 text-muted-foreground">{label}</dt>
			<dd
				className={
					mono ? "min-w-0 flex-1 truncate font-mono" : "min-w-0 flex-1 truncate"
				}
				title={value}
			>
				{value}
			</dd>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-label={copyLabel}
						onClick={() => void copyToClipboard(value)}
						className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					>
						{copied ? (
							<Check className="size-3.5" />
						) : (
							<Copy className="size-3.5" />
						)}
					</button>
				</TooltipTrigger>
				<TooltipContent side="top">
					{copied ? t({ message: "Copied" }) : copyLabel}
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
