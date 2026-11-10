import type { WorkspaceSelectionEvent } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarSelectionProvider";
import type { DashboardSidebarWorkspace } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";

/** What every list section passes to its rows. */
export interface TsentaListRowProps {
	shortcutLabels: ReadonlyMap<string, string>;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
	isWorkspaceSelected: (workspace: DashboardSidebarWorkspace) => boolean;
	/** A stable handler for rows that take part in multi-select, else undefined. */
	onSelectionClick: (
		workspace: DashboardSidebarWorkspace,
	) =>
		| ((event: WorkspaceSelectionEvent, workspaceId: string) => boolean)
		| undefined;
}
