import { Workspace, type WorkspaceProps } from "@superset/panes";
import { type ComponentProps, isValidElement, useMemo } from "react";
import { AddTabMenu } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/AddTabMenu";
import { TsentaWorkspaceHeader } from "renderer/tsenta/components/TsentaWorkspaceHeader";
import {
	type TsentaLaunchers,
	useConductorLauncherCommands,
} from "renderer/tsenta/palette/useConductorLauncherCommands";
import { isConductorSkin } from "renderer/tsenta/skin";
import { FoldedPaneControls } from "./components/FoldedPaneControls";
import { TabStatusIcon } from "./components/TabStatusIcon";
import { foldPaneHeaders } from "./utils/foldPaneHeaders";

/** What the Conductor layout needs beyond Workspace's own props. */
export interface TsentaWorkspaceExtras {
	/** Paradev's launcher row's presets, listed in the command palette instead. */
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
 *   join the command palette;
 * - the strip's "+" opens a chat with the default model, with no menu
 *   (Paradev's menu's Chat item); terminals and the rest keep their hotkeys;
 * - each tab's agent status leads its title in Conductor's glyphs
 *   (TabStatusIcon), in place of Paradev's trailing dot;
 * - a chat or terminal alone in its tab drops its own header row, and the
 *   strip's trailing end takes that header's controls (FoldedPaneControls),
 *   so the strip is the one row above the transcript.
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
	renderTabIcon,
	renderTabAccessory: _statusDot,
	...props
}: TsentaWorkspaceProps<TData>) {
	const { registry, store, paneActions } = props;
	const foldedRegistry = useMemo(() => foldPaneHeaders(registry), [registry]);
	useConductorLauncherCommands(tsenta?.launchers);
	const paradevMenu = renderAddTabMenu?.({
		runAfterClose: (action) => action(),
	});
	const onAddChat =
		isValidElement<ComponentProps<typeof AddTabMenu>>(paradevMenu) &&
		paradevMenu.type === AddTabMenu
			? paradevMenu.props.onAddChat
			: undefined;
	return (
		<>
			<TsentaWorkspaceHeader
				leading={renderTabBarLeading?.()}
				trailing={renderTabBarTrailing?.()}
			/>
			<Workspace<TData>
				{...props}
				registry={foldedRegistry}
				renderTabIcon={(tab) =>
					renderTabIcon?.(tab) ?? <TabStatusIcon<TData> tab={tab} />
				}
				renderTabBarTrailing={() => (
					<FoldedPaneControls<TData>
						store={store}
						registry={registry}
						paneActions={paneActions}
					/>
				)}
				renderAddTabMenu={onAddChat ? undefined : renderAddTabMenu}
				onAddTab={onAddChat ?? props.onAddTab}
			/>
		</>
	);
}
