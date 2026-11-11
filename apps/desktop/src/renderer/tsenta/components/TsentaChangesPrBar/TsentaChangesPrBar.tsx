import type { WorkspaceStore } from "@superset/panes";
import { useCallback } from "react";
import type { OpenPullRequestPane } from "renderer/lib/github/openPullRequestLink";
import { ChangesControl } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/ChangesControl";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import { openPullRequestPaneInStore } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/openPullRequestPaneInStore";
import type { StoreApi } from "zustand/vanilla";

const noop = () => {};

/**
 * The workspace's pull request at the top of the Changes pane, under the
 * skin: its badge and checks, or the commit, push and create-PR actions
 * before one exists. The header's activity menu, which showed it before,
 * is not drawn under the skin.
 */
export function TsentaChangesPrBar({
	workspaceId,
	store,
}: {
	workspaceId: string;
	store: StoreApi<WorkspaceStore<PaneViewerData>>;
}) {
	const onOpenPullRequest = useCallback<OpenPullRequestPane>(
		(ref, placement) => openPullRequestPaneInStore(store, ref, placement),
		[store],
	);
	return (
		<div className="flex shrink-0 items-center justify-end px-2 pt-2 empty:hidden">
			<ChangesControl
				workspaceId={workspaceId}
				isChangesOpen
				onToggleChanges={noop}
				onOpenPullRequest={onOpenPullRequest}
			/>
		</div>
	);
}
