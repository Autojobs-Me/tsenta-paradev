import type { DropPlacement } from "../planConductorDrop";

/**
 * The project order after a repository header is dropped beside another
 * (shell-sidebar spec §4.4: repositories reorder by drag, and the full order
 * persists), for Paradev's project reorder. Null when the drop changes
 * nothing or names a project the order does not hold.
 */
export function planConductorRepoMove(
	order: readonly string[],
	draggedId: string,
	overId: string,
	placement: DropPlacement,
): string[] | null {
	if (draggedId === overId) return null;
	if (!order.includes(draggedId) || !order.includes(overId)) return null;
	const next = order.filter((id) => id !== draggedId);
	next.splice(
		next.indexOf(overId) + (placement === "after" ? 1 : 0),
		0,
		draggedId,
	);
	return next.every((id, index) => id === order[index]) ? null : next;
}
