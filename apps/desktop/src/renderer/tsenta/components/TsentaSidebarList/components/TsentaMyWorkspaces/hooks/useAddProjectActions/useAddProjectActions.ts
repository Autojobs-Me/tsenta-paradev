import { useLingui } from "@lingui/react/macro";
import { toast } from "@superset/ui/sonner";
import { useNavigate } from "@tanstack/react-router";
import { useOpenNewWorkspaceForLocalProject } from "renderer/hooks/useOpenNewWorkspace";
import { useFolderFirstImport } from "renderer/routes/_authenticated/_dashboard/components/AddRepositoryModals/hooks/useFolderFirstImport";
import {
	useOpenEmptyProjectModal,
	useOpenNewProjectModal,
	useOpenTemplateGalleryModal,
} from "renderer/stores/add-repository-modal";

export interface AddProjectActions {
	openProject: () => Promise<void>;
	cloneFromUrl: () => void;
	createEmptyProject: () => void;
	startFromTemplate: () => void;
}

/**
 * The stock Projects header's "Add project" menu actions, with its toasts,
 * for the "My workspaces" menu's "Add project" (DashboardSidebarWorkspacesHeader
 * does the same wiring inline).
 */
export function useAddProjectActions(): AddProjectActions {
	const { t } = useLingui();
	const openEmptyProject = useOpenEmptyProjectModal();
	const openNewWorkspace = useOpenNewWorkspaceForLocalProject();
	const openNewProject = useOpenNewProjectModal();
	const openTemplateGallery = useOpenTemplateGalleryModal();
	const navigate = useNavigate();
	const folderImport = useFolderFirstImport({
		onError: (message) => {
			toast.error(t({ message: `Import failed: ${message}` }));
		},
		onMultipleProjects: ({ candidates }) => {
			toast.error(t({ message: "Import failed" }), {
				description: t({
					message: `Multiple projects use this repository (${candidates.length}). Choose the project in settings to set it up on this device.`,
				}),
				action: {
					label: t({ message: "Open Projects" }),
					onClick: () => navigate({ to: "/settings/projects" }),
				},
			});
		},
	});

	const openProject = async () => {
		const result = await folderImport.start();
		if (result) {
			openNewWorkspace(result.projectId);
			toast.success(t({ message: "Project imported and selected." }));
		}
	};

	return {
		openProject,
		cloneFromUrl: () => openNewProject(),
		createEmptyProject: () => openEmptyProject(),
		startFromTemplate: () => openTemplateGallery(),
	};
}
