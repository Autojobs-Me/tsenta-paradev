import { useLingui } from "@lingui/react/macro";
import type { PaneRegistry } from "@superset/panes";
import { useMemo } from "react";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import { foldPaneHeaders } from "renderer/tsenta/components/TsentaWorkspace/utils/foldPaneHeaders";
import { isConductorSkin } from "renderer/tsenta/skin";

/** Right panel kinds whose header only repeats the tab's title. Browser keeps its address bar. */
const RIGHT_FOLDED_KINDS: ReadonlySet<string> = new Set([
	"changes-list",
	"files",
	"pages-list",
	"terminal",
]);

/**
 * The right panel's registry under the skin: the tabs' panes drop their
 * header row (it repeated the tab's title, beside split and close), and the
 * Changes list is titled Changes, as in Conductor.
 */
export function useTsentaRightRegistry(
	registry: PaneRegistry<PaneViewerData>,
): PaneRegistry<PaneViewerData> {
	const { t } = useLingui();
	const changes = t({ message: "Changes" });
	return useMemo(() => {
		if (!isConductorSkin()) return registry;
		const folded = foldPaneHeaders(registry, RIGHT_FOLDED_KINDS);
		const list = folded["changes-list"];
		return list
			? { ...folded, "changes-list": { ...list, getTitle: () => changes } }
			: folded;
	}, [registry, changes]);
}
