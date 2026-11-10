import { Trans } from "@lingui/react/macro";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { isConductorSkin } from "renderer/tsenta/skin";

/**
 * Conductor's "⌘L to focus" pill in the composer's top-right corner
 * (composer spec §2.2), with Paradev's own focus binding (FOCUS_CHAT_INPUT).
 * composer.css shows it only while the composer is empty, unfocused and has
 * no suggestion list open. The message is the one Paradev's terminal input
 * already uses, so it is translated everywhere.
 */
export function TsentaFocusHint() {
	const { text: focusShortcutText } = useHotkeyDisplay("FOCUS_CHAT_INPUT");
	if (!isConductorSkin() || focusShortcutText === "Unassigned") return null;
	return (
		<span
			aria-hidden="true"
			className="pointer-events-none animate-in fade-in whitespace-nowrap duration-150 motion-reduce:animate-none"
			data-tsenta="composer-focus-hint"
		>
			<Trans>{focusShortcutText} to focus</Trans>
		</span>
	);
}
