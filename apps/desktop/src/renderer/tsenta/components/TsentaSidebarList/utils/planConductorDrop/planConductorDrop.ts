import { tagFolderScope } from "@superset/shared/workspace-tags";
import type { DashboardSidebarProjectChild } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { buildSidebarFolderKey } from "renderer/routes/_authenticated/utils/workspaceTagFolders";
import type { ConductorFolderSection } from "../buildConductorSidebarModel";

export type DropPlacement = "before" | "after";

/** Where a dragged row would land. `overId` is the row under the pointer. */
export type ConductorDropTarget =
	| { kind: "pinned"; overId?: string; placement?: DropPlacement }
	| {
			kind: "section";
			sectionKey: string;
			overId?: string;
			placement?: DropPlacement;
	  }
	| {
			/**
			 * A lane's rows in no folder: one project's repository group, or the
			 * Sessions section. `laneProjectId` undefined is the flat "My
			 * workspaces" list, which takes a row back into its own lane.
			 */
			kind: "loose";
			laneProjectId?: string | null;
			overId?: string;
			overLaneProjectId?: string | null;
			placement?: DropPlacement;
	  };

export interface ConductorDragged {
	workspaceId: string;
	laneProjectId: string | null;
	isPinned: boolean;
}

export interface ConductorDropContext {
	pinned: ReadonlyArray<{ workspaceId: string; projectId: string | null }>;
	sections: readonly ConductorFolderSection[];
	/** A lane's children in Paradev's order (folders and loose rows). */
	laneChildren: (
		laneProjectId: string | null,
	) => readonly DashboardSidebarProjectChild[] | null;
}

type TopLevelItem = { type: "workspace" | "section"; id: string };

/**
 * The Paradev writes a drop maps to, each one a mutation the stock sidebar's
 * own drag and drop uses (useDashboardSidebarState):
 * - pin: reorderPinnedWorkspaces with the new pinned order,
 * - folder: setSectionWorkspaceOrder with the folder's new member order (it
 *   files the row by the folder's tag, so a section can take a row from
 *   another project, which then gets that folder too),
 * - loose: reorderProjectChildren with the lane's new top-level order.
 * folder and loose clear the pin first when the row was pinned, as a drop
 * out of the stock Pinned section does.
 */
export type ConductorDropPlan =
	| {
			type: "pin";
			pins: Array<{ workspaceId: string; projectId: string | null }>;
	  }
	| {
			type: "folder";
			laneProjectId: string | null;
			sectionId: string;
			workspaceIds: string[];
			unpin: boolean;
	  }
	| {
			type: "loose";
			laneProjectId: string | null;
			items: TopLevelItem[];
			unpin: boolean;
	  };

function insertAt<T>(
	list: T[],
	item: T,
	anchorIndex: number,
	placement: DropPlacement | undefined,
): T[] {
	const next = [...list];
	if (anchorIndex === -1) next.push(item);
	else next.splice(anchorIndex + (placement === "after" ? 1 : 0), 0, item);
	return next;
}

function sameOrder<T>(left: readonly T[], right: readonly T[]): boolean {
	return (
		left.length === right.length &&
		left.every((item, index) => item === right[index])
	);
}

/** Null when the drop changes nothing, or Paradev cannot make that move. */
export function planConductorDrop(
	dragged: ConductorDragged,
	target: ConductorDropTarget,
	context: ConductorDropContext,
): ConductorDropPlan | null {
	const { workspaceId, laneProjectId, isPinned } = dragged;
	if (target.overId === workspaceId) return null;

	if (target.kind === "pinned") {
		const rest = context.pinned.filter(
			(pin) => pin.workspaceId !== workspaceId,
		);
		const anchor =
			target.overId === undefined
				? -1
				: rest.findIndex((pin) => pin.workspaceId === target.overId);
		// Already pinned and dropped on the section, not by a row: no move.
		if (isPinned && anchor === -1) return null;
		const pins = insertAt(
			rest,
			{ workspaceId, projectId: laneProjectId },
			anchor,
			target.placement,
		);
		const unchanged = sameOrder(
			context.pinned.map((pin) => pin.workspaceId),
			pins.map((pin) => pin.workspaceId),
		);
		return isPinned && unchanged ? null : { type: "pin", pins };
	}

	if (target.kind === "section") {
		const section = context.sections.find(
			(entry) => entry.key === target.sectionKey,
		);
		if (!section) return null;
		const folder = section.folders.find(
			(entry) => entry.laneProjectId === laneProjectId,
		);
		// A folder IS its tag: a lane without this folder gets it by filing
		// the row under the tag. A legacy folder has no tag to file under.
		const sectionId =
			folder?.section.id ??
			(section.tag === null
				? null
				: buildSidebarFolderKey(tagFolderScope(laneProjectId), section.tag));
		if (sectionId === null) return null;
		const members = section.rows
			.filter((row) => row.folderId === sectionId)
			.map((row) => row.workspace.id);
		const wasMember = members.includes(workspaceId);
		const rest = members.filter((id) => id !== workspaceId);
		const anchor =
			target.overId === undefined ? -1 : rest.indexOf(target.overId);
		// Dropped on its own section, not by a row: no move.
		if (wasMember && anchor === -1) return null;
		const workspaceIds = insertAt(rest, workspaceId, anchor, target.placement);
		if (wasMember && sameOrder(members, workspaceIds)) return null;
		return {
			type: "folder",
			laneProjectId,
			sectionId,
			workspaceIds,
			unpin: isPinned,
		};
	}

	// A row only ever leaves a folder for its own lane: Paradev keeps a
	// workspace in its project.
	if (
		target.laneProjectId !== undefined &&
		target.laneProjectId !== laneProjectId
	) {
		return null;
	}
	const children = context.laneChildren(laneProjectId);
	if (!children) return null;
	const key = (item: TopLevelItem) => `${item.type}:${item.id}`;
	const items: TopLevelItem[] = children.map((child) =>
		child.type === "workspace"
			? { type: "workspace", id: child.workspace.id }
			: { type: "section", id: child.section.id },
	);
	const self: TopLevelItem = { type: "workspace", id: workspaceId };
	const wasLoose = items.some((item) => key(item) === key(self));
	const rest = items.filter((item) => key(item) !== key(self));
	const overInLane =
		target.overId !== undefined &&
		(target.overLaneProjectId === undefined ||
			target.overLaneProjectId === laneProjectId);
	const anchor = overInLane
		? rest.findIndex(
				(item) => item.type === "workspace" && item.id === target.overId,
			)
		: -1;
	// Already loose and dropped on its lane, not by a row: no move.
	if (wasLoose && anchor === -1) return null;
	let next: TopLevelItem[];
	if (anchor !== -1) {
		next = insertAt(rest, self, anchor, target.placement);
	} else {
		// Out of a folder with no row to place it by: just below the folder,
		// as Paradev's "Ungroup" does. A pinned row goes to the end.
		const formerFolder = children.find(
			(child) =>
				child.type === "section" &&
				child.section.workspaces.some(
					(workspace) => workspace.id === workspaceId,
				),
		);
		const folderIndex =
			formerFolder?.type === "section"
				? rest.findIndex(
						(item) =>
							item.type === "section" && item.id === formerFolder.section.id,
					)
				: -1;
		next = insertAt(rest, self, folderIndex, "after");
	}
	if (wasLoose && sameOrder(items.map(key), next.map(key))) return null;
	return { type: "loose", laneProjectId, items: next, unpin: isPinned };
}
