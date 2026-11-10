import { Trans, useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { ChevronDown, ChevronRight, Ellipsis, Plus } from "lucide-react";
import {
	type ComponentPropsWithoutRef,
	forwardRef,
	type MouseEvent as ReactMouseEvent,
} from "react";
import type { DashboardSidebarProjectRow } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarProjectSection/components/DashboardSidebarProjectRow";
import { ProjectThumbnail } from "renderer/routes/_authenticated/components/ProjectThumbnail";
import { RenameInput } from "renderer/screens/main/components/WorkspaceSidebar/RenameInput";
import { conductorButtonVariants } from "renderer/tsenta/components/ui/button-variants";

type TsentaSidebarProjectRowProps = ComponentPropsWithoutRef<
	typeof DashboardSidebarProjectRow
> & {
	/**
	 * How many workspaces the project holds, shown while it is collapsed. A
	 * data attribute so the stock row, which shares the call site, accepts it
	 * without a type change.
	 */
	"data-workspace-count"?: number;
};

/**
 * Opens the project's context menu (Paradev's DashboardSidebarProjectContextMenu,
 * whose trigger is this row) under the "…" button, as if the row had been
 * right-clicked there, so the button and right-click share one menu.
 */
function openRowMenuBelow(event: ReactMouseEvent<HTMLButtonElement>) {
	event.stopPropagation();
	const button = event.currentTarget;
	const rect = button.getBoundingClientRect();
	button.dispatchEvent(
		new MouseEvent("contextmenu", {
			bubbles: true,
			cancelable: true,
			button: 2,
			clientX: rect.left,
			clientY: rect.bottom + 4,
		}),
	);
}

/**
 * Conductor's repository header (shell-sidebar spec §4.4) in place of
 * DashboardSidebarProjectRow under the Conductor skin, with the same props
 * and behaviour: click or Enter toggles the project, double-click renames,
 * the drag handle and context menu props land on the root.
 *
 * - The project icon turns into a chevron on hover (right when collapsed,
 *   down when open).
 * - A semibold muted name, then the workspace count while collapsed.
 * - On the right, "…" (on hover, or while the menu is open) opens the
 *   project menu, and "+" creates a workspace in the project.
 */
export const TsentaSidebarProjectRow = forwardRef<
	HTMLDivElement,
	TsentaSidebarProjectRowProps
>(
	(
		{
			projectName,
			iconUrl,
			projectColor,
			isCollapsed,
			isRenaming,
			renameValue,
			onRenameValueChange,
			onSubmitRename,
			onCancelRename,
			onStartRename,
			onToggleCollapse,
			onNewWorkspace,
			"data-workspace-count": workspaceCount = 0,
			className,
			...props
		},
		ref,
	) => {
		const { t } = useLingui();
		const Chevron = isCollapsed ? ChevronRight : ChevronDown;
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: The header acts as a single toggle target in view mode while preserving nested inline controls.
			<div
				ref={ref}
				role={isRenaming ? undefined : "button"}
				tabIndex={isRenaming ? undefined : 0}
				onClick={isRenaming ? undefined : onToggleCollapse}
				onDoubleClick={isRenaming ? undefined : onStartRename}
				onKeyDown={
					isRenaming
						? undefined
						: (event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onToggleCollapse();
								}
							}
				}
				className={cn(
					"group/project-header relative mx-1.5 mt-0.5 mb-1 flex min-w-0 items-center justify-between rounded-md py-1.5 pr-1.5 pl-1.5 text-sm outline-none transition-colors",
					"hover:bg-sidebar-accent focus-visible:bg-sidebar-accent data-[state=open]:bg-sidebar-accent",
					className,
				)}
				{...props}
			>
				<div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
					<div className="relative shrink-0">
						<span className="flex group-hover/project-header:invisible group-focus-visible/project-header:invisible">
							<ProjectThumbnail
								projectName={projectName}
								iconUrl={iconUrl}
								color={projectColor}
								className="size-4"
							/>
						</span>
						<span className="invisible absolute inset-0 flex cursor-pointer items-center justify-center group-hover/project-header:visible group-focus-visible/project-header:visible">
							<Chevron
								aria-hidden="true"
								className="size-3 text-sidebar-muted-foreground"
							/>
						</span>
					</div>
					{isRenaming ? (
						<RenameInput
							value={renameValue}
							onChange={onRenameValueChange}
							onSubmit={onSubmitRename}
							onCancel={onCancelRename}
							className="-ml-1 h-5 min-w-0 flex-1 border-none bg-transparent px-1 py-0 font-semibold text-sm outline-none"
						/>
					) : (
						<span className="min-w-0 truncate font-sans font-semibold text-sidebar-muted-foreground">
							{projectName}
						</span>
					)}
					{isCollapsed && workspaceCount > 0 && (
						<span className="shrink-0 font-mono text-2xs text-sidebar-muted-foreground">
							{workspaceCount}
						</span>
					)}
				</div>

				{!isRenaming && (
					<>
						<span aria-hidden="true" className="w-9 shrink-0" />
						<button
							type="button"
							aria-label={t({ message: "More actions" })}
							onClick={openRowMenuBelow}
							onKeyDown={(event) => event.stopPropagation()}
							onDoubleClick={(event) => event.stopPropagation()}
							className={conductorButtonVariants({
								variant: "ghost",
								size: "iconXs",
								className:
									"absolute top-1/2 right-9 z-10 size-6 -translate-y-1/2 px-0 text-sidebar-muted-foreground opacity-0 hover:text-sidebar-foreground focus-visible:opacity-100 group-hover/project-header:opacity-100 group-data-[state=open]/project-header:opacity-100",
							})}
						>
							<Ellipsis aria-hidden="true" className="size-3.5" />
						</button>
						<Tooltip delayDuration={500}>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label={t({ message: "Create workspace" })}
									onClick={(event) => {
										event.stopPropagation();
										onNewWorkspace();
									}}
									onKeyDown={(event) => event.stopPropagation()}
									onDoubleClick={(event) => event.stopPropagation()}
									onContextMenu={(event) => event.stopPropagation()}
									className={conductorButtonVariants({
										variant: "ghost",
										size: "iconXs",
										className:
											"size-6 shrink-0 px-0 text-sidebar-muted-foreground hover:text-foreground",
									})}
								>
									<Plus aria-hidden="true" className="size-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<Trans>Create workspace</Trans>
							</TooltipContent>
						</Tooltip>
					</>
				)}
			</div>
		);
	},
);

TsentaSidebarProjectRow.displayName = "TsentaSidebarProjectRow";
