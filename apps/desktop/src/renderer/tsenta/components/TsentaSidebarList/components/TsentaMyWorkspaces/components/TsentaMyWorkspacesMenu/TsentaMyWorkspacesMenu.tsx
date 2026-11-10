import { Trans, useLingui } from "@lingui/react/macro";
import {
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from "@superset/ui/dropdown-menu";
import { FolderPlus, Search } from "lucide-react";
import {
	VscFolderOpened,
	VscGithubAlt,
	VscLayout,
	VscNewFolder,
} from "react-icons/vsc";
import type { DashboardSidebarProject } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import type {
	SidebarProjectHostFilter,
	SidebarProjectSortMode,
} from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";
import {
	type TsentaSidebarGrouping,
	useTsentaSidebarGrouping,
} from "renderer/tsenta/stores/sidebar-grouping";
import { useAddProjectActions } from "./hooks/useAddProjectActions";

const SORT_MODES: SidebarProjectSortMode[] = ["manual", "active", "created"];
const HOST_FILTERS: SidebarProjectHostFilter[] = ["all", "local", "cloud"];

interface TsentaMyWorkspacesMenuProps {
	sortMode: SidebarProjectSortMode;
	onSortModeChange: (mode: SidebarProjectSortMode) => void;
	/** Null hides "Show" (cloud rows are not inline). */
	hostFilter: SidebarProjectHostFilter | null;
	onHostFilterChange: (filter: SidebarProjectHostFilter) => void;
	onOpenFilter: () => void;
	/** Projects a new folder can go in. */
	projects: readonly DashboardSidebarProject[];
	onNewSection: (projectId: string) => void;
}

/**
 * The "My workspaces" "…" menu (shell-sidebar spec §4.2) holding what the
 * stock Sessions and Projects headers had as buttons: Group by, Sort by
 * (Paradev's sort modes), Show (its local and cloud filter), Filter
 * projects, then New section (Paradev's new folder, per project when there
 * are several) and Add project (its four ways in).
 */
export function TsentaMyWorkspacesMenu({
	sortMode,
	onSortModeChange,
	hostFilter,
	onHostFilterChange,
	onOpenFilter,
	projects,
	onNewSection,
}: TsentaMyWorkspacesMenuProps) {
	const { t } = useLingui();
	const grouping = useTsentaSidebarGrouping((state) => state.grouping);
	const setGrouping = useTsentaSidebarGrouping((state) => state.setGrouping);
	const addProject = useAddProjectActions();
	const sortLabels: Record<SidebarProjectSortMode, string> = {
		manual: t({ message: "Manual order" }),
		active: t({ message: "Last active" }),
		created: t({ message: "Date created" }),
	};
	const hostLabels: Record<SidebarProjectHostFilter, string> = {
		all: t({ message: "All workspaces" }),
		local: t({ message: "Local" }),
		cloud: t({ message: "Cloud" }),
	};
	const folderProjects = projects.filter(
		(project) => project.kind !== "cloud-repo",
	);

	return (
		<>
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<Trans>Group by</Trans>
				</DropdownMenuSubTrigger>
				<DropdownMenuSubContent className="min-w-36">
					<DropdownMenuRadioGroup
						value={grouping}
						onValueChange={(value) =>
							setGrouping(value as TsentaSidebarGrouping)
						}
					>
						<DropdownMenuRadioItem value="project">
							<Trans>Project</Trans>
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="none">
							<Trans>None</Trans>
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuSubContent>
			</DropdownMenuSub>
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<Trans>Sort by</Trans>
				</DropdownMenuSubTrigger>
				<DropdownMenuSubContent className="min-w-36">
					<DropdownMenuRadioGroup
						value={sortMode}
						onValueChange={(value) =>
							onSortModeChange(value as SidebarProjectSortMode)
						}
					>
						{SORT_MODES.map((mode) => (
							<DropdownMenuRadioItem key={mode} value={mode}>
								{sortLabels[mode]}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
					{sortMode !== "manual" && (
						<div className="max-w-48 px-2 pt-1.5 pb-1 text-[11px] text-muted-foreground/70">
							<Trans>Drag workspaces to reorder in Manual order</Trans>
						</div>
					)}
				</DropdownMenuSubContent>
			</DropdownMenuSub>
			{hostFilter !== null && (
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Trans>Show</Trans>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className="min-w-36">
						<DropdownMenuRadioGroup
							value={hostFilter}
							onValueChange={(value) =>
								onHostFilterChange(value as SidebarProjectHostFilter)
							}
						>
							{HOST_FILTERS.map((filter) => (
								<DropdownMenuRadioItem key={filter} value={filter}>
									{hostLabels[filter]}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			)}
			<DropdownMenuItem onSelect={onOpenFilter}>
				<Search aria-hidden="true" className="size-4" />
				<Trans>Filter projects…</Trans>
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			{folderProjects.length === 1 ? (
				<DropdownMenuItem
					onSelect={() => {
						const [project] = folderProjects;
						if (project) onNewSection(project.id);
					}}
				>
					<FolderPlus aria-hidden="true" className="size-4" />
					<Trans>New section…</Trans>
				</DropdownMenuItem>
			) : folderProjects.length > 1 ? (
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<FolderPlus aria-hidden="true" className="size-4" />
						<Trans>New section…</Trans>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className="min-w-40">
						{folderProjects.map((project) => (
							<DropdownMenuItem
								key={project.id}
								onSelect={() => onNewSection(project.id)}
							>
								<span className="min-w-0 truncate">{project.name}</span>
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			) : null}
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<VscNewFolder aria-hidden="true" className="size-4" />
					<Trans>Add project…</Trans>
				</DropdownMenuSubTrigger>
				<DropdownMenuSubContent className="min-w-44">
					<DropdownMenuItem onSelect={() => void addProject.openProject()}>
						<VscFolderOpened aria-hidden="true" className="size-4" />
						<Trans>Open project</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={addProject.cloneFromUrl}>
						<VscGithubAlt aria-hidden="true" className="size-4" />
						<Trans>Clone from URL</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={addProject.createEmptyProject}>
						<VscNewFolder aria-hidden="true" className="size-4" />
						<Trans>Create new project</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={addProject.startFromTemplate}>
						<VscLayout aria-hidden="true" className="size-4" />
						<Trans>Start from a template</Trans>
					</DropdownMenuItem>
				</DropdownMenuSubContent>
			</DropdownMenuSub>
		</>
	);
}
