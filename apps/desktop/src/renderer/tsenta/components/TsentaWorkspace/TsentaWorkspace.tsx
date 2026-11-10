import { Workspace, type WorkspaceProps } from "@superset/panes";
import {
	TsentaAddTabMenu,
	type TsentaLaunchers,
} from "renderer/tsenta/components/TsentaAddTabMenu";
import { TsentaWorkspaceHeader } from "renderer/tsenta/components/TsentaWorkspaceHeader";
import { isConductorSkin } from "renderer/tsenta/skin";

/** What the Conductor layout needs beyond Workspace's own props. */
export interface TsentaWorkspaceExtras {
	/** Paradev's launcher row's presets, listed in the "+" menu instead. */
	launchers?: TsentaLaunchers;
}

type TsentaWorkspaceProps<TData> = WorkspaceProps<TData> & {
	tsenta?: TsentaWorkspaceExtras;
};

/**
 * The workspace view's center panes (plan steps 9 and 10), swapped in for
 * packages/panes' Workspace at its one site in v2-workspace's page.tsx.
 * With the skin off it is that Workspace, untouched. Under the skin it reads
 * the same props and lays them out as Conductor does:
 * - the controls Paradev put at the two ends of its tab bar move up into
 *   Conductor's header row (TsentaWorkspaceHeader), on the chrome above the
 *   tab strip;
 * - Paradev's launcher row below the tab bar is not drawn; its launchers
 *   join the strip's "+" menu (TsentaAddTabMenu), which lists Chat first.
 */
export function TsentaWorkspace<TData>({
	tsenta,
	...props
}: TsentaWorkspaceProps<TData>) {
	return isConductorSkin() ? (
		<ConductorWorkspace<TData> {...props} tsenta={tsenta} />
	) : (
		<Workspace<TData> {...props} />
	);
}

function ConductorWorkspace<TData>({
	tsenta,
	renderTabBarLeading,
	renderTabBarTrailing,
	renderBelowTabBar: _launcherRow,
	renderAddTabMenu,
	...props
}: TsentaWorkspaceProps<TData>) {
	return (
		<>
			<TsentaWorkspaceHeader
				leading={renderTabBarLeading?.()}
				trailing={renderTabBarTrailing?.()}
			/>
			<Workspace<TData>
				{...props}
				renderAddTabMenu={(actions) => (
					<TsentaAddTabMenu
						paradevMenu={renderAddTabMenu?.(actions)}
						runAfterClose={actions.runAfterClose}
						launchers={tsenta?.launchers}
					/>
				)}
			/>
		</>
	);
}
