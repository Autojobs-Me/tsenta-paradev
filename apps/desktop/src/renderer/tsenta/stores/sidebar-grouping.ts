import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * "Group by" in the Conductor list's "My workspaces" menu (shell-sidebar
 * spec §4.2): workspaces in no folder sit under their repository header
 * (Conductor's default grouping, the default here too) or in one flat list,
 * as Conductor's team view shows them. Device-local, like Paradev's sidebar
 * collapse state.
 */
export type TsentaSidebarGrouping = "project" | "none";

interface TsentaSidebarGroupingState {
	grouping: TsentaSidebarGrouping;
	setGrouping: (grouping: TsentaSidebarGrouping) => void;
}

export const useTsentaSidebarGrouping = create<TsentaSidebarGroupingState>()(
	persist(
		(set) => ({
			grouping: "project",
			setGrouping: (grouping) => set({ grouping }),
		}),
		{ name: "tsenta-sidebar-grouping", version: 1 },
	),
);
