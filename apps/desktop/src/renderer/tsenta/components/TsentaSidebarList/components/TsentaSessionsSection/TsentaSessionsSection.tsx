import { Trans, useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { Plus } from "lucide-react";
import { useOpenNewSession } from "renderer/hooks/useOpenNewWorkspace";
import type { DashboardSidebarWorkspace } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { useSidebarSectionsCollapseStore } from "renderer/stores/sidebar-sections-collapse";
import { conductorButtonVariants } from "renderer/tsenta/components/ui/button-variants";
import type { TsentaListRowProps } from "../../types";
import { TsentaSectionHeader } from "../TsentaSectionHeader";
import { useSidebarListDrop } from "../TsentaSidebarDnd";
import { TsentaSidebarRow } from "../TsentaSidebarRow";

const LIST_TARGET = { kind: "loose", laneProjectId: null } as const;

interface TsentaSessionsSectionProps
	extends Pick<TsentaListRowProps, "shortcutLabels" | "onWorkspaceHover"> {
	sessions: readonly DashboardSidebarWorkspace[];
}

/**
 * Paradev's project-less sessions as one more Conductor user section, only
 * while there are some outside a folder (their folders are sections of their
 * own). "+" on hover starts a new session, as the stock header's did.
 */
export function TsentaSessionsSection({
	sessions,
	shortcutLabels,
	onWorkspaceHover,
}: TsentaSessionsSectionProps) {
	const { t } = useLingui();
	const { setNodeRef, isDropTarget } = useSidebarListDrop(
		"sessions",
		LIST_TARGET,
	);
	const isCollapsed = useSidebarSectionsCollapseStore(
		(state) => state.collapsed.sessions,
	);
	const toggleSection = useSidebarSectionsCollapseStore(
		(state) => state.toggle,
	);
	const openNewSession = useOpenNewSession();
	if (sessions.length === 0) return null;
	const newSessionLabel = t({ message: "New session" });

	return (
		<div
			ref={setNodeRef}
			data-tsenta="list-section"
			className={cn(
				"relative mb-3 flex w-full min-w-0 flex-col gap-1",
				isDropTarget && "rounded-md bg-sidebar-accent",
			)}
		>
			<div className="group/section-header relative mt-0.5">
				<TsentaSectionHeader
					label={<Trans>Sessions</Trans>}
					isCollapsed={isCollapsed}
					onToggleCollapse={() => toggleSection("sessions")}
					count={sessions.length}
					hasActions
				/>
				<Tooltip delayDuration={500}>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-label={newSessionLabel}
							onClick={(event) => {
								event.stopPropagation();
								openNewSession();
							}}
							onKeyDown={(event) => event.stopPropagation()}
							className={conductorButtonVariants({
								variant: "ghost",
								size: "iconXs",
								className:
									"absolute top-1/2 right-[26px] z-10 size-6 -translate-y-1/2 px-0 text-sidebar-muted-foreground opacity-0 hover:text-sidebar-foreground focus-visible:opacity-100 group-hover/section-header:opacity-100",
							})}
						>
							<Plus aria-hidden="true" className="size-3.5" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="bottom">{newSessionLabel}</TooltipContent>
				</Tooltip>
			</div>
			<div hidden={isCollapsed} className="flex w-full min-w-0 flex-col gap-1">
				{sessions.map((workspace) => (
					<TsentaSidebarRow
						key={workspace.id}
						workspace={workspace}
						listKey="sessions"
						listTarget={LIST_TARGET}
						laneProjectId={null}
						indent="flush"
						shortcutLabel={shortcutLabels.get(workspace.id)}
						onHoverCardOpen={onWorkspaceHover}
					/>
				))}
			</div>
		</div>
	);
}
