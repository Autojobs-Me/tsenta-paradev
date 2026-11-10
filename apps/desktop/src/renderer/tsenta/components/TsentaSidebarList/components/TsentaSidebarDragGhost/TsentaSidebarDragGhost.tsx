import { useSidebarWorkspaceStatus } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarWorkspaceStatusProvider";
import type {
	DashboardSidebarProject,
	DashboardSidebarWorkspace,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { ProjectThumbnail } from "renderer/routes/_authenticated/components/ProjectThumbnail";
import { TsentaWorkspaceStatusGlyph } from "renderer/tsenta/components/TsentaWorkspaceStatusGlyph";

/**
 * The row that follows the pointer while a workspace is dragged: Conductor's
 * dragging style (shell-sidebar spec §4.4), the sidebar wash with a shadow,
 * holding the row's status and name. It floats over the content too, so the
 * wash sits on the sidebar's own opaque surface.
 */
export function TsentaSidebarDragGhost({
	workspace,
}: {
	workspace: DashboardSidebarWorkspace;
}) {
	const { status } = useSidebarWorkspaceStatus(workspace.id);
	return (
		<div className="flex h-9 w-full min-w-0 cursor-grabbing items-center gap-1.5 rounded-md bg-sidebar bg-[linear-gradient(var(--sidebar-accent),var(--sidebar-accent))] py-2 pr-1.5 pl-1.5 text-sm shadow-md">
			<span className="mr-0.5 flex size-4 shrink-0 items-center justify-center">
				<TsentaWorkspaceStatusGlyph
					workspace={workspace}
					workspaceStatus={status}
					isCreatePending={false}
				/>
			</span>
			<span className="min-w-0 truncate font-450 text-sidebar-foreground">
				{workspace.name || workspace.branch}
			</span>
		</div>
	);
}

/**
 * The repository header that follows the pointer while a project is
 * reordered: Conductor's dragging style for a repository (shell-sidebar spec
 * §4.4, the sidebar wash, a 6px radius and a shadow) over its icon and name.
 */
export function TsentaSidebarRepoDragGhost({
	project,
}: {
	project: DashboardSidebarProject;
}) {
	return (
		<div className="flex h-8 w-full min-w-0 cursor-grabbing items-center gap-2 rounded-md bg-sidebar bg-[linear-gradient(var(--sidebar-accent),var(--sidebar-accent))] py-1.5 pr-1.5 pl-1.5 text-sm shadow-md">
			<ProjectThumbnail
				projectName={project.name}
				iconUrl={project.iconUrl}
				color={project.color}
				className="size-4"
			/>
			<span className="min-w-0 truncate font-sans font-semibold text-sidebar-muted-foreground">
				{project.name}
			</span>
		</div>
	);
}
