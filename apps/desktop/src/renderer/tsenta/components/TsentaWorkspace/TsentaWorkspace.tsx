import { Workspace, type WorkspaceProps } from "@superset/panes";
import { TsentaWorkspaceHeader } from "renderer/tsenta/components/TsentaWorkspaceHeader";
import { isConductorSkin } from "renderer/tsenta/skin";

/**
 * The workspace view's center panes (plan steps 9 and 10), swapped in for
 * packages/panes' Workspace at its one site in v2-workspace's page.tsx.
 * With the skin off it is that Workspace, untouched. Under the skin it reads
 * the same props and lays them out as Conductor does: the controls Paradev
 * put at the two ends of its tab bar move up into Conductor's header row
 * (TsentaWorkspaceHeader), which sits on the chrome above the tab strip.
 */
export function TsentaWorkspace<TData>(props: WorkspaceProps<TData>) {
	return isConductorSkin() ? (
		<ConductorWorkspace<TData> {...props} />
	) : (
		<Workspace<TData> {...props} />
	);
}

function ConductorWorkspace<TData>({
	renderTabBarLeading,
	renderTabBarTrailing,
	...props
}: WorkspaceProps<TData>) {
	return (
		<>
			<TsentaWorkspaceHeader
				leading={renderTabBarLeading?.()}
				trailing={renderTabBarTrailing?.()}
			/>
			<Workspace<TData> {...props} />
		</>
	);
}
