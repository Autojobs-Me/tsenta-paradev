import { cn } from "@superset/ui/utils";
import { type HotkeyId, useHotkeyDisplay } from "renderer/hotkeys";

interface ShortcutHintProps {
	id: HotkeyId;
	className?: string;
}

/**
 * Conductor's inline shortcut hint (shell-sidebar spec §3.3, navigation spec
 * §2.2): the binding as muted glyphs, not a key cap. Renders nothing when the
 * hotkey is unassigned.
 */
export function ShortcutHint({ id, className }: ShortcutHintProps) {
	const { text } = useHotkeyDisplay(id);
	if (text === "Unassigned") return null;
	return (
		<span
			className={cn(
				"inline-flex items-center pl-1 text-xs text-muted-foreground",
				className,
			)}
		>
			{text}
		</span>
	);
}
