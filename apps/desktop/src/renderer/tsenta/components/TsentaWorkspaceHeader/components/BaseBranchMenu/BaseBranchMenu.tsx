import { Trans, useLingui } from "@lingui/react/macro";
import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { Ellipsis, LoaderCircle } from "lucide-react";
import { BaseBranchSelector } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/WorkspaceSidebar/hooks/useChangesTab/components/BaseBranchSelector";
import { useChangesScope } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/useChangesScope";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";

/**
 * Conductor's target branch menu after the header's title (workspace-chat
 * spec §1.2, its uvo): a 12px ellipsis opening a popover with the branch
 * picker. Here it is Paradev's base branch, which the Changes view diffs
 * and pull requests open against, set through the same useChangesScope and
 * BaseBranchSelector as the Changes tab. A session has no git, so no menu.
 */
export function BaseBranchMenu() {
	const { t } = useLingui();
	const { workspace } = useWorkspace();
	if (workspace.type === "session") return null;
	const label = t({ message: "Base branch" });
	return (
		<Popover>
			<Tooltip delayDuration={500}>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<button
							type="button"
							aria-label={label}
							className="no-drag ml-1 flex size-5 shrink-0 translate-y-px cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:text-foreground"
						>
							<Ellipsis className="size-3" />
						</button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom">{label}</TooltipContent>
			</Tooltip>
			<PopoverContent align="start" sideOffset={4} className="w-auto p-3">
				<BaseBranchPicker workspaceId={workspace.id} />
			</PopoverContent>
		</Popover>
	);
}

/** Mounted only while the popover is open, so its branch queries are too. */
function BaseBranchPicker({ workspaceId }: { workspaceId: string }) {
	const scope = useChangesScope(workspaceId);
	const current = scope.baseBranch ?? scope.status.data?.defaultBranch.name;
	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground">
				<Trans>Base branch</Trans>
			</span>
			{current ? (
				<BaseBranchSelector
					branches={scope.branches.data?.branches ?? []}
					currentValue={current}
					onChange={scope.setBaseBranch}
				/>
			) : (
				<LoaderCircle className="size-3 animate-spin text-muted-foreground" />
			)}
		</div>
	);
}
