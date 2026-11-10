import { Trans } from "@lingui/react/macro";
import {
	ContextMenuItem,
	ContextMenuShortcut,
} from "@superset/ui/context-menu";
import { Mail, MailOpen } from "lucide-react";
import { useEffect, useRef } from "react";

/** The workspace menu's Pin item (a data-tsenta hook), which P selects. */
const PIN_ITEM = '[data-tsenta="ws-menu-pin"]';

interface TsentaWorkspaceMenuLeadProps {
	isUnread: boolean;
	onToggleUnread: () => void;
}

/**
 * The first item of the sidebar workspace menu under the Conductor skin, as
 * in Conductor (navigation spec §8.1): mark as read or unread, with its R
 * key. While the menu is open, R selects this item and P the Pin item
 * below it, as Conductor's menu does. Both go through the item's own select
 * (a click), so the menu closes exactly as when the item is clicked.
 *
 * Paradev's labels, which are already translated; the item it replaces is
 * not rendered under the skin.
 */
export function TsentaWorkspaceMenuLead({
	isUnread,
	onToggleUnread,
}: TsentaWorkspaceMenuLeadProps) {
	const itemRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Capture on the document runs before Radix's typeahead, which would
		// otherwise move focus to the first item starting with the letter.
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
				return;
			}
			const key = event.key.toLowerCase();
			if (key !== "r" && key !== "p") return;
			const item = itemRef.current;
			const target =
				key === "r"
					? item
					: item
							?.closest('[role="menu"]')
							?.querySelector<HTMLElement>(PIN_ITEM);
			if (!target) return;
			event.preventDefault();
			event.stopPropagation();
			if (!event.repeat) target.click();
		};
		document.addEventListener("keydown", onKeyDown, true);
		return () => document.removeEventListener("keydown", onKeyDown, true);
	}, []);

	return (
		<ContextMenuItem ref={itemRef} onSelect={onToggleUnread}>
			{isUnread ? (
				<>
					<MailOpen className="mr-2 size-4" />
					<Trans>Mark as Read</Trans>
				</>
			) : (
				<>
					<Mail className="mr-2 size-4" />
					<Trans>Mark as Unread</Trans>
				</>
			)}
			<ContextMenuShortcut>R</ContextMenuShortcut>
		</ContextMenuItem>
	);
}
