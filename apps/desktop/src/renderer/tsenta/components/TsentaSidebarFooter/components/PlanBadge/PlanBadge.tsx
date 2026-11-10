import { cn } from "@superset/ui/utils";
import { useCurrentPlan } from "renderer/hooks/useCurrentPlan";

/**
 * The plan as Conductor's footer badge (shell-sidebar spec §3.5): mono caps,
 * dashed and muted on Free, the tip colours on a paid plan. Nothing until the
 * plan is known, so a paid org never flashes Free.
 */
export function PlanBadge() {
	const { plan, isReady, activePlan } = useCurrentPlan();
	if (!isReady) return null;
	const isFree = plan === "free";
	return (
		<span
			className={cn(
				"inline-flex h-4 shrink-0 items-center rounded-xs border py-0.5 font-mono text-xs uppercase tracking-wider",
				isFree
					? "border-dashed border-muted-foreground/80 bg-transparent px-2 text-muted-foreground/80"
					: "border-tip-secondary-border bg-tip-secondary px-1 text-tip-muted",
			)}
		>
			{/* The tier name as Paradev's organization menu shows it. */}
			{activePlan?.planTier ?? plan}
		</span>
	);
}
