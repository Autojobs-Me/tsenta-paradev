import { useDroppable } from "@dnd-kit/core";
import {
	createContext,
	useCallback,
	useContext,
	useSyncExternalStore,
} from "react";
import type { DashboardSidebarWorkspace } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import type {
	ConductorDropTarget,
	DropPlacement,
} from "../../utils/planConductorDrop";
import type { DropIndicatorStore } from "./dropIndicatorStore";

/** A list's own drop target, before a row under the pointer refines it. */
export type SidebarListTarget =
	| { kind: "pinned" }
	| { kind: "section"; sectionKey: string }
	| { kind: "loose"; laneProjectId?: string | null };

export interface SidebarRowDragData {
	type: "tsenta-row";
	workspace: DashboardSidebarWorkspace;
	laneProjectId: string | null;
	isPinned: boolean;
}

export interface SidebarRowDropData {
	type: "tsenta-row";
	listKey: string;
	rowKey: string;
	workspaceId: string;
	laneProjectId: string | null;
	target: SidebarListTarget;
}

export interface SidebarListDropData {
	type: "tsenta-list";
	listKey: string;
	target: SidebarListTarget;
}

export function toDropTarget(
	data: SidebarRowDropData | SidebarListDropData,
	placement: DropPlacement,
): ConductorDropTarget {
	if (data.type === "tsenta-list") return data.target;
	const { target } = data;
	if (target.kind === "loose") {
		return {
			...target,
			overId: data.workspaceId,
			overLaneProjectId: data.laneProjectId,
			placement,
		};
	}
	return { ...target, overId: data.workspaceId, placement };
}

interface TsentaSidebarDndValue {
	store: DropIndicatorStore;
	/** Rows are inert while the sidebar shows a sorted or filtered view. */
	isDisabled: boolean;
	/** The dragged workspace, while a row is dragged. */
	activeWorkspaceId: string | null;
}

export const TsentaSidebarDndContext =
	createContext<TsentaSidebarDndValue | null>(null);

export function useTsentaSidebarDnd(): TsentaSidebarDndValue {
	const value = useContext(TsentaSidebarDndContext);
	if (!value) {
		throw new Error("useTsentaSidebarDnd must be used inside TsentaSidebarDnd");
	}
	return value;
}

/** The side of this row the insertion line sits on, or null. */
export function useRowDropIndicator(rowKey: string): DropPlacement | null {
	const { store } = useTsentaSidebarDnd();
	return useSyncExternalStore(
		store.subscribe,
		useCallback(() => {
			const state = store.get();
			return state.rowKey === rowKey ? state.placement : null;
		}, [store, rowKey]),
	);
}

/**
 * Makes a list (a section, Pinned, a repository's rows) a drop target and
 * tells it whether the row being dragged would land in it.
 */
export function useSidebarListDrop(
	listKey: string,
	target: SidebarListTarget,
): { setNodeRef: (node: HTMLElement | null) => void; isDropTarget: boolean } {
	const { store } = useTsentaSidebarDnd();
	const data: SidebarListDropData = { type: "tsenta-list", listKey, target };
	const { setNodeRef } = useDroppable({ id: `tsenta-list:${listKey}`, data });
	const isDropTarget = useSyncExternalStore(
		store.subscribe,
		useCallback(() => store.get().listKey === listKey, [store, listKey]),
	);
	return { setNodeRef, isDropTarget };
}
