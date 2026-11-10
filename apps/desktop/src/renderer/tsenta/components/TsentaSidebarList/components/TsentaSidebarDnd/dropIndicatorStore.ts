import type { DropPlacement } from "../../utils/planConductorDrop";

/** Where the drop under the pointer would land, while a row is dragged. */
export interface DropIndicator {
	/** The list that would take the row (a section, Pinned, a repository). */
	listKey: string | null;
	/** The row the insertion line sits against, if any. */
	rowKey: string | null;
	placement: DropPlacement;
	/** The dragged workspace, so its own row can dim. */
	draggingWorkspaceId: string | null;
}

export const IDLE_DROP_INDICATOR: DropIndicator = {
	listKey: null,
	rowKey: null,
	placement: "before",
	draggingWorkspaceId: null,
};

/**
 * A tiny external store for the drop indicator: the pointer moves many times
 * a second, and each row and list reads only whether it is the target, so a
 * move re-renders the one or two parts whose answer changed instead of the
 * whole sidebar.
 */
export function createDropIndicatorStore() {
	let state = IDLE_DROP_INDICATOR;
	const listeners = new Set<() => void>();
	return {
		get: () => state,
		set: (next: DropIndicator) => {
			if (
				next.listKey === state.listKey &&
				next.rowKey === state.rowKey &&
				next.placement === state.placement &&
				next.draggingWorkspaceId === state.draggingWorkspaceId
			) {
				return;
			}
			state = next;
			for (const listener of listeners) listener();
		},
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

export type DropIndicatorStore = ReturnType<typeof createDropIndicatorStore>;
