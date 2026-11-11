import { Trans } from "@lingui/react/macro";
import { Dialog, DialogContent, DialogTitle } from "@superset/ui/dialog";
import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { NewWorkspaceScreen } from "renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/components/NewWorkspaceScreen";
import { DashboardNewWorkspaceDraftProvider } from "renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/DashboardNewWorkspaceDraftContext";
import { useNewWorkspaceModalStore } from "renderer/stores/new-workspace-modal";

/**
 * ⌘N's new-workspace popup under the skin, as in Conductor: Paradev's create
 * screen (its /new-workspace route) in a dialog over the current view. It
 * closes when the app navigates, which is what creating a workspace does.
 */
export function TsentaNewWorkspaceDialog() {
	const isOpen = useNewWorkspaceModalStore((state) => state.isOpen);
	const projectId = useNewWorkspaceModalStore(
		(state) => state.preSelectedProjectId,
	);
	const closeModal = useNewWorkspaceModalStore((state) => state.closeModal);
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: closes on navigation only
	useEffect(() => {
		useNewWorkspaceModalStore.getState().closeModal();
	}, [pathname]);

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
			<DialogContent
				showCloseButton={false}
				className="max-h-[85vh] w-[min(56rem,calc(100vw-4rem))] max-w-none overflow-auto border-0 bg-transparent p-0 shadow-none"
			>
				<DialogTitle className="sr-only">
					<Trans>New Workspace</Trans>
				</DialogTitle>
				{isOpen && (
					<DashboardNewWorkspaceDraftProvider onClose={closeModal}>
						<NewWorkspaceScreen
							isOpen
							preSelectedProjectId={projectId}
							preSelectedSession={false}
							preSelectedHostId={null}
						/>
					</DashboardNewWorkspaceDraftProvider>
				)}
			</DialogContent>
		</Dialog>
	);
}
