import { cn } from "@superset/ui/utils";
// The file, not the ChildItemsList barrel: the barrel exports this module.
import { ChildItemsList as ParadevChildItemsList } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ChildItemsList/ChildItemsList";
import { ChildItem } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ChildItemsList/components/ChildItem";
import { useNestedItems } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/providers/NestedItemsProvider";
import { isConductorSkin } from "renderer/tsenta/skin";

type ChildItemsListProps = { parentId: string; flat?: boolean };

/**
 * What the ChildItemsList barrel exports: under the skin, a tool's nested
 * items hang off Conductor's 1px rule (workspace-chat spec §6.10,
 * `ml-1.5 border-l pl-4`); Paradev's list otherwise.
 */
export function ChildItemsList(props: ChildItemsListProps) {
	return isConductorSkin() ? (
		<TsentaChildItemsList {...props} />
	) : (
		<ParadevChildItemsList {...props} />
	);
}

export function TsentaChildItemsList({
	parentId,
	flat = false,
}: ChildItemsListProps) {
	const { childrenByParent, snapshot } = useNestedItems();
	const children = childrenByParent.get(parentId);
	if (!children || children.length === 0) return null;
	return (
		<div
			className={cn(
				"flex flex-col gap-1",
				!flat && "mt-1 mb-2 ml-1.5 border-border border-l pl-4",
			)}
		>
			{children.map((child) => (
				<ChildItem item={child} key={child.id} snapshot={snapshot} />
			))}
		</div>
	);
}
