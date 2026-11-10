import { Trans } from "@lingui/react/macro";
import { cn } from "@superset/ui/utils";
import { Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardSidebarSectionContextMenu } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarSection/components/DashboardSidebarSectionContextMenu";
import { SectionActionsMenuItems } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarSection/components/DashboardSidebarSectionContextMenu/components/SectionActionsMenuItems";
import { useDashboardSidebarSectionRename } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarSectionRenameContext";
import { WorkspaceBulkMenuScope } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem/components/WorkspaceBulkMenuScope";
import { useDashboardSidebarDnd } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useSidebarDnd";
import { RenameInput } from "renderer/screens/main/components/WorkspaceSidebar/RenameInput";
import { PROJECT_COLOR_DEFAULT } from "shared/constants/project-colors";
import type { TsentaListRowProps } from "../../types";
import type { ConductorFolderSection } from "../../utils/buildConductorSidebarModel";
import { TsentaSectionActionsButton } from "../TsentaSectionActionsButton";
import { TsentaSectionHeader } from "../TsentaSectionHeader";
import { useSidebarListDrop } from "../TsentaSidebarDnd";
import { TsentaSidebarRow } from "../TsentaSidebarRow";

export interface FolderSectionActions {
	onToggleCollapse: (section: ConductorFolderSection) => void;
	onRename: (section: ConductorFolderSection, name: string) => void;
	onSetColor: (section: ConductorFolderSection, color: string | null) => void;
	onDelete: (section: ConductorFolderSection) => void;
	/** Hides its folders without untagging anyone (tag folders in projects). */
	onHide: (section: ConductorFolderSection) => void;
}

interface TsentaFolderSectionProps extends TsentaListRowProps {
	section: ConductorFolderSection;
	actions: FolderSectionActions;
}

/**
 * A Paradev folder as a Conductor user section (shell-sidebar spec §4.6):
 * a medium 12px name, the count while collapsed, "…" on hover with
 * Paradev's folder actions (rename, colour, hide, delete; right-click opens
 * the same), and the rows flush with the header. A folder with a colour
 * shows it as a dot where Conductor puts a section's emoji. An empty
 * section reads "Drag a workspace here", as Conductor's does.
 */
export function TsentaFolderSection({
	section,
	actions,
	shortcutLabels,
	onWorkspaceHover,
	isWorkspaceSelected,
	onSelectionClick,
}: TsentaFolderSectionProps) {
	const listKey = `section:${section.key}`;
	const listTarget = useMemo(
		() => ({ kind: "section" as const, sectionKey: section.key }),
		[section.key],
	);
	const { setNodeRef, isDropTarget } = useSidebarListDrop(listKey, listTarget);
	const { workspacesById, groupInfo } = useDashboardSidebarDnd();
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(section.name);
	const startRename = useCallback(() => {
		setRenameValue(section.name);
		setIsRenaming(true);
	}, [section.name]);
	const submitRename = () => {
		const trimmed = renameValue.trim();
		if (trimmed && trimmed !== section.name) actions.onRename(section, trimmed);
		setIsRenaming(false);
	};

	// "New section" and "New group" ask the new folder to open in rename.
	const { pendingRenameSectionId, clearPendingSectionRename } =
		useDashboardSidebarSectionRename();
	useEffect(() => {
		if (pendingRenameSectionId === null) return;
		if (
			!section.folders.some(
				(folder) => folder.section.id === pendingRenameSectionId,
			)
		) {
			return;
		}
		startRename();
		clearPendingSectionRename(pendingRenameSectionId);
	}, [
		pendingRenameSectionId,
		clearPendingSectionRename,
		section.folders,
		startRename,
	]);

	const hasColor =
		section.color != null && section.color !== PROJECT_COLOR_DEFAULT;
	const menuProps = {
		color: section.color,
		onRename: startRename,
		onSetColor: (color: string | null) => actions.onSetColor(section, color),
		onDelete: () => actions.onDelete(section),
		// Hiding is a per-project setting of tag folders, as in the stock
		// folder menu: a Sessions or legacy folder has none.
		onHide:
			section.tag !== null &&
			section.folders.some((folder) => folder.laneProjectId !== null)
				? () => actions.onHide(section)
				: undefined,
	};

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
				<DashboardSidebarSectionContextMenu {...menuProps}>
					<TsentaSectionHeader
						label={
							isRenaming ? (
								<RenameInput
									value={renameValue}
									onChange={setRenameValue}
									onSubmit={submitRename}
									onCancel={() => setIsRenaming(false)}
									className="-ml-1 h-4 w-full min-w-0 border-none bg-transparent px-1 py-0 font-medium text-sidebar-foreground text-xs outline-none"
								/>
							) : (
								section.name
							)
						}
						isEditing={isRenaming}
						isCollapsed={section.isCollapsed}
						onToggleCollapse={() => actions.onToggleCollapse(section)}
						count={section.rows.length}
						hasActions={!isRenaming}
						leading={
							hasColor ? (
								<span
									aria-hidden="true"
									className="flex size-4 shrink-0 items-center justify-center"
								>
									<span
										className="size-2 rounded-full"
										style={{ backgroundColor: section.color ?? undefined }}
									/>
								</span>
							) : undefined
						}
					/>
				</DashboardSidebarSectionContextMenu>
				{!isRenaming && (
					<TsentaSectionActionsButton
						label={section.name}
						contentClassName="w-44"
					>
						<SectionActionsMenuItems kind="dropdown" {...menuProps} />
					</TsentaSectionActionsButton>
				)}
			</div>
			<div
				hidden={section.isCollapsed}
				className="flex w-full min-w-0 flex-col gap-1"
			>
				{section.folders.map((folder) => {
					const rows = section.rows.filter(
						(row) => row.folderId === folder.section.id,
					);
					if (rows.length === 0) return null;
					return (
						<WorkspaceBulkMenuScope
							key={folder.section.id}
							projectId={folder.laneProjectId}
							workspacesById={workspacesById}
							groupInfo={groupInfo}
						>
							{rows.map((row) => (
								<TsentaSidebarRow
									key={row.workspace.id}
									workspace={row.workspace}
									listKey={listKey}
									listTarget={listTarget}
									laneProjectId={row.laneProjectId}
									isInSection
									indent="flush"
									shortcutLabel={shortcutLabels.get(row.workspace.id)}
									onHoverCardOpen={onWorkspaceHover}
									isSelected={isWorkspaceSelected(row.workspace)}
									onSelectionClick={onSelectionClick(row.workspace)}
								/>
							))}
						</WorkspaceBulkMenuScope>
					);
				})}
				{section.rows.length === 0 && (
					<div className="flex h-9 w-[calc(100%-2px)] items-center gap-2 rounded-md pr-[5px] pl-[6px]">
						<Inbox
							aria-hidden="true"
							className="size-3.5 shrink-0 text-sidebar-muted-foreground/50"
						/>
						<span className="min-w-0 truncate text-sidebar-muted-foreground/50 text-sm">
							<Trans>Drag a workspace here</Trans>
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
