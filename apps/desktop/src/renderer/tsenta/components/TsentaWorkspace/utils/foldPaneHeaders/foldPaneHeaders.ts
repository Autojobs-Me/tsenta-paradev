import type {
	PaneDefinition,
	PaneRegistry,
	RendererContext,
} from "@superset/panes";

/**
 * The pane kinds whose header row folds into the tab strip under the skin:
 * chats, as in Conductor, and terminals. Their header only repeats the tab's
 * title beside a few controls, which the strip's trailing end takes
 * (FoldedPaneControls). Other kinds keep their header: a diff pane fills its
 * header through portal slots, a page's title has its back and close
 * buttons, a browser's is its address bar.
 */
export const FOLDED_PANE_KINDS: ReadonlySet<string> = new Set([
	"chat-v3",
	"pending-cloud-chat",
	"terminal",
]);

/** Whether a pane's header folds into the strip: a folded kind, alone in its tab. */
export function foldsPaneHeader<TData>(
	definition: PaneDefinition<TData> | undefined,
	context: RendererContext<TData>,
): boolean {
	return (
		definition !== undefined &&
		FOLDED_PANE_KINDS.has(context.pane.kind) &&
		context.pane.parentDirection === null &&
		!definition.renderToolbar
	);
}

/**
 * The registry with the folded kinds' header hidden while their pane is
 * alone in its tab. A split shows every pane's header, as in Paradev, since
 * the strip can only stand in for one. Everything else is the definition
 * as it was, so titles, icons and actions read the same.
 */
export function foldPaneHeaders<TData>(
	registry: PaneRegistry<TData>,
): PaneRegistry<TData> {
	const folded: PaneRegistry<TData> = {};
	for (const [kind, definition] of Object.entries(registry)) {
		if (!FOLDED_PANE_KINDS.has(kind) || definition.renderToolbar) {
			folded[kind] = definition;
			continue;
		}
		const hideHeader = definition.hideHeader;
		folded[kind] = {
			...definition,
			hideHeader: (context) =>
				foldsPaneHeader(definition, context) ||
				(hideHeader?.(context) ?? false),
		};
	}
	return folded;
}
