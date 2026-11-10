import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { Link } from "@tanstack/react-router";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";

/**
 * The id beside the header's title (workspace-chat spec §1.2; Conductor's
 * w6o, renderApp R:236525): Conductor shows its W-number in a mono chip.
 * Paradev workspaces have no number, so this is the linked task's slug
 * (TSE-123), and it opens the task. Nothing shows without a linked task.
 */
export function WorkspaceTaskChip() {
	const { workspace } = useWorkspace();
	const taskId = workspace.taskId;
	const { data: task } = cloudTrpc.task.byIdOrSlug.useQuery(taskId ?? "", {
		enabled: !!taskId,
	});
	if (!taskId || !task) return null;
	return (
		<Tooltip delayDuration={500}>
			<TooltipTrigger asChild>
				<Link
					to="/tasks/$taskId"
					params={{ taskId: task.id }}
					className="no-drag flex h-6 shrink-0 cursor-pointer items-center rounded-sm px-1.5 font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					{task.slug}
				</Link>
			</TooltipTrigger>
			<TooltipContent side="bottom">{task.title}</TooltipContent>
		</Tooltip>
	);
}
