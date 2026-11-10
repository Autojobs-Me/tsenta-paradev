import type {
	PaneActionConfig,
	PaneDefinition,
	PaneRegistry,
	RendererContext,
	Pane as StorePane,
	Tab as StoreTab,
	WorkspaceProps,
	WorkspaceStore,
} from "@superset/panes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { Fragment, type ReactNode, useMemo } from "react";
import { useChatSubagentStore } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/stores/chatSubagentStore";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import { foldsPaneHeader } from "../../utils/foldPaneHeaders";

interface FoldedPaneControlsProps<TData> {
	store: StoreApi<WorkspaceStore<TData>>;
	/** Paradev's registry, before foldPaneHeaders. */
	registry: PaneRegistry<TData>;
	paneActions: WorkspaceProps<TData>["paneActions"];
}

/**
 * The trailing end of the tab strip under the skin (plan step 10): the
 * controls from the header of the pane the active tab shows, when
 * foldPaneHeaders hid that header. For a chat that is its history picker,
 * account usage and mode menu, then Paradev's split and close; the TARGET's
 * history icon at the strip's end. Empty for a split or a kind that keeps
 * its header.
 */
export function FoldedPaneControls<TData>({
	store,
	registry,
	paneActions,
}: FoldedPaneControlsProps<TData>) {
	const tab = useStore(
		store,
		(state) =>
			state.tabs.find((entry) => entry.id === state.activeTabId) ?? null,
	);
	const tabPosition = useStore(store, (state) =>
		state.tabs.findIndex((entry) => entry.id === state.activeTabId),
	);
	if (!tab || tab.layout.type !== "pane") return null;
	const pane = tab.panes[tab.layout.paneId];
	const definition = pane ? registry[pane.kind] : undefined;
	if (!pane || !definition) return null;
	return (
		<FoldedPane
			key={pane.id}
			store={store}
			tab={tab}
			tabPosition={tabPosition}
			pane={pane}
			definition={definition}
			paneActions={paneActions}
		/>
	);
}

function FoldedPane<TData>({
	store,
	tab,
	tabPosition,
	pane,
	definition,
	paneActions,
}: {
	store: StoreApi<WorkspaceStore<TData>>;
	tab: StoreTab<TData>;
	tabPosition: number;
	pane: StorePane<TData>;
	definition: PaneDefinition<TData>;
	paneActions: WorkspaceProps<TData>["paneActions"];
}) {
	const isActive = tab.activePaneId === pane.id;
	// The context packages/panes' Pane hands a header (Pane.tsx), for the same
	// pane, so the controls act on it exactly as they did there.
	const { context, actions } = useMemo(() => {
		const ctx: RendererContext<TData> = {
			pane: { ...pane, parentDirection: null },
			tab: { ...tab, position: tabPosition },
			isActive,
			store,
			actions: {
				close: async () => {
					if (definition.onBeforeClose) {
						const allowed = await definition.onBeforeClose(pane);
						if (!allowed) return;
					}
					store.getState().closePane({ tabId: tab.id, paneId: pane.id });
				},
				focus: () =>
					store.getState().setActivePane({ tabId: tab.id, paneId: pane.id }),
				setTitle: (title: string) =>
					store.getState().setPaneTitleOverride({
						tabId: tab.id,
						paneId: pane.id,
						titleOverride: title,
					}),
				pin: () =>
					store.getState().setPanePinned({ paneId: pane.id, pinned: true }),
				updateData: (data: TData) =>
					store.getState().setPaneData({ paneId: pane.id, data }),
				split: (position, newPane) =>
					store.getState().splitPane({
						tabId: tab.id,
						paneId: pane.id,
						position: position === "down" ? "bottom" : "right",
						newPane,
					}),
			},
			headerActions: null,
		};
		const workspaceActions =
			typeof paneActions === "function"
				? paneActions(ctx)
				: (paneActions ?? []);
		const config = definition.paneActions;
		const resolved = !config
			? workspaceActions
			: typeof config === "function"
				? config(ctx, workspaceActions)
				: config;
		ctx.headerActions = <PaneActions actions={resolved} context={ctx} />;
		return { context: ctx, actions: resolved };
	}, [store, tab, tabPosition, pane, isActive, definition, paneActions]);

	if (!foldsPaneHeader(definition, context)) return null;
	if (definition.hideHeader?.(context)) return null;

	return (
		<div
			data-tsenta="folded-pane-controls"
			className="flex h-full min-w-0 items-center gap-0.5"
		>
			<FoldedTitle definition={definition} context={context} />
			{definition.renderHeaderExtras?.(context)}
			<PaneActions actions={actions} context={context} />
		</div>
	);
}

/**
 * The header's title where the strip cannot stand in for it: a terminal's
 * session switcher, and a chat's way back out of a sub-agent's transcript.
 * A plain title is the tab's own, so it is left out.
 */
function FoldedTitle<TData>({
	definition,
	context,
}: {
	definition: PaneDefinition<TData>;
	context: RendererContext<TData>;
}) {
	if (context.pane.kind === "terminal") {
		return <TitleSlot>{definition.renderTitle?.(context)}</TitleSlot>;
	}
	if (context.pane.kind === "chat-v3") {
		const { terminalId } = context.pane.data as { terminalId?: string };
		return terminalId ? (
			<NestedChatTitle chatKey={terminalId}>
				{definition.renderTitle?.(context)}
			</NestedChatTitle>
		) : null;
	}
	return null;
}

function NestedChatTitle({
	chatKey,
	children,
}: {
	chatKey: string;
	children: ReactNode;
}) {
	const isNested = useChatSubagentStore(
		(state) => (state.paths[chatKey]?.length ?? 0) > 0,
	);
	return isNested ? <TitleSlot>{children}</TitleSlot> : null;
}

function TitleSlot({ children }: { children: ReactNode }) {
	if (!children) return null;
	return (
		<div className="mr-1 flex min-w-0 items-center gap-2 overflow-hidden text-xs">
			{children}
		</div>
	);
}

/** packages/panes' PaneHeaderActions, as Conductor's ghost iconXs buttons. */
function PaneActions<TData>({
	actions,
	context,
}: {
	actions: PaneActionConfig<TData>[];
	context: RendererContext<TData>;
}) {
	if (actions.length === 0) return null;
	return (
		<div className="flex shrink-0 items-center gap-0.5">
			{actions.map((action) => {
				const icon =
					typeof action.icon === "function"
						? action.icon(context)
						: action.icon;
				const tooltip =
					typeof action.tooltip === "function"
						? action.tooltip(context)
						: action.tooltip;
				const button = (
					<button
						type="button"
						onClick={() => action.onClick(context)}
						className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					>
						{icon}
					</button>
				);
				if (tooltip == null) {
					return <Fragment key={action.key}>{button}</Fragment>;
				}
				return (
					<Tooltip key={action.key} delayDuration={1000}>
						<TooltipTrigger asChild>{button}</TooltipTrigger>
						<TooltipContent side="bottom">{tooltip}</TooltipContent>
					</Tooltip>
				);
			})}
		</div>
	);
}
