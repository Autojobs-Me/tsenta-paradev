import { Trans, useLingui } from "@lingui/react/macro";
import { DropdownMenuItem } from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { Pin, Plus } from "lucide-react";
import { PinnedPageRow } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarPinnedSection/components/PinnedPageRow";
import { usePinnedPages } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarPinnedSection/hooks/usePinnedPages";
import type { DashboardSidebarPinnedWorkspace } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { useOpenNewWorkspaceInViewedProject } from "renderer/routes/_authenticated/_dashboard/hooks/useOpenNewWorkspaceInViewedProject";
import { useSidebarSectionsCollapseStore } from "renderer/stores/sidebar-sections-collapse";
import type { TsentaListRowProps } from "../../types";
import { TsentaSectionActionsButton } from "../TsentaSectionActionsButton";
import { TsentaSectionHeader } from "../TsentaSectionHeader";
import { useSidebarListDrop, useTsentaSidebarDnd } from "../TsentaSidebarDnd";
import { TsentaSidebarRow } from "../TsentaSidebarRow";

const LIST_TARGET = { kind: "pinned" } as const;

interface TsentaPinnedSectionProps
	extends Pick<TsentaListRowProps, "shortcutLabels" | "onWorkspaceHover"> {
	pinnedWorkspaces: readonly DashboardSidebarPinnedWorkspace[];
}

/**
 * Paradev's pinned workspaces (and pinned pages) as Conductor's Pinned
 * section (shell-sidebar spec §4.6): a semibold 12px header with the count
 * while collapsed, "…" with Create workspace, and 12px of space below. The
 * section takes dropped rows (pin), washing while one hovers it. With
 * nothing pinned it is gone, and a drag shows a "Drop to pin" target stuck
 * to the top of the list instead, so nothing shifts under the pointer.
 */
export function TsentaPinnedSection({
	pinnedWorkspaces,
	shortcutLabels,
	onWorkspaceHover,
}: TsentaPinnedSectionProps) {
	const { t } = useLingui();
	const { activeWorkspaceId } = useTsentaSidebarDnd();
	const { setNodeRef, isDropTarget } = useSidebarListDrop(
		"pinned",
		LIST_TARGET,
	);
	const isCollapsed = useSidebarSectionsCollapseStore(
		(state) => state.collapsed.pinned,
	);
	const toggleSection = useSidebarSectionsCollapseStore(
		(state) => state.toggle,
	);
	const openNewWorkspace = useOpenNewWorkspaceInViewedProject();
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const { pinnedPages, setFavorite } = usePinnedPages();
	const activePage = matchRoute({ to: "/pages/$slug", fuzzy: true });
	const activePageSlug = activePage ? activePage.slug : null;
	const label = t({ message: "Pinned" });

	if (pinnedWorkspaces.length === 0 && pinnedPages.length === 0) {
		if (activeWorkspaceId === null) return null;
		return (
			<div className="sticky top-0 z-20 h-0 px-1.5">
				<div
					ref={setNodeRef}
					className={cn(
						"mt-1.5 flex h-9 items-center gap-2 rounded-md border border-sidebar-border border-dashed bg-sidebar px-1.5 text-sidebar-muted-foreground text-sm",
						isDropTarget && "bg-sidebar-accent text-sidebar-foreground",
					)}
				>
					<Pin aria-hidden="true" className="size-3.5 shrink-0" />
					<Trans>Drop to pin</Trans>
				</div>
			</div>
		);
	}

	return (
		<section
			ref={setNodeRef}
			aria-label={t({ message: "Pinned workspaces" })}
			data-tsenta="list-section"
			className={cn(
				"w-full min-w-0 px-1.5 pt-1.5 pb-3",
				isDropTarget && "rounded-md bg-sidebar-accent",
			)}
		>
			<div className="group/section-header relative mt-0.5 mb-1">
				<TsentaSectionHeader
					label={label}
					weight="semibold"
					isCollapsed={isCollapsed}
					onToggleCollapse={() => toggleSection("pinned")}
					count={pinnedWorkspaces.length + pinnedPages.length}
					hasActions
				/>
				<TsentaSectionActionsButton label={label}>
					<DropdownMenuItem onSelect={() => openNewWorkspace()}>
						<Plus aria-hidden="true" className="size-4" />
						<Trans>Create workspace</Trans>
					</DropdownMenuItem>
				</TsentaSectionActionsButton>
			</div>
			<div hidden={isCollapsed} className="flex w-full min-w-0 flex-col gap-1">
				{pinnedWorkspaces.map((workspace) => (
					<TsentaSidebarRow
						key={workspace.id}
						workspace={workspace}
						listKey="pinned"
						listTarget={LIST_TARGET}
						laneProjectId={workspace.projectId}
						isPinned
						indent="flush"
						shortcutLabel={shortcutLabels.get(workspace.id)}
						onHoverCardOpen={onWorkspaceHover}
					/>
				))}
				{pinnedPages.map((page) => (
					<PinnedPageRow
						key={page.id}
						title={page.title}
						isActive={page.slug === activePageSlug}
						isCollapsed={false}
						onClick={() =>
							void navigate({
								to: "/pages/$slug",
								params: { slug: page.slug },
							})
						}
						onUnpin={() => setFavorite(page.id, false)}
					/>
				))}
			</div>
		</section>
	);
}
