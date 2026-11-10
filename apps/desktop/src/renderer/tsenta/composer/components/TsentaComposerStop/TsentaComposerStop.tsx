import { useLingui } from "@lingui/react/macro";
import { SquareIcon } from "lucide-react";
import { isConductorSkin } from "renderer/tsenta/skin";

/**
 * Conductor keeps Stop in the composer for the whole turn (composer spec
 * §4.2, items 7 and 8): once there is text to send, Send joins it and Stop
 * turns to an outline square. Paradev trades its Stop for Send ("Queue
 * message") as soon as there is text, leaving Esc to stop. Under the skin
 * this second Stop sits in the toolbar while a turn can be stopped, and
 * composer.css shows it only while Paradev's Send is in the row, so there is
 * never more than one Stop.
 */
export function TsentaComposerStop({ onStop }: { onStop?: () => void }) {
	const { t } = useLingui();
	if (!onStop || !isConductorSkin()) return null;
	return (
		<button
			type="button"
			aria-label={t({ message: "Stop response" })}
			className="flex shrink-0 cursor-pointer items-center justify-center"
			data-tsenta="composer-stop"
			onClick={onStop}
		>
			<SquareIcon className="size-2.5 fill-current" />
		</button>
	);
}
