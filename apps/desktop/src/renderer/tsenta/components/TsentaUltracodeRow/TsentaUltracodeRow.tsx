import { Trans } from "@lingui/react/macro";
import { ULTRACODE_LABEL } from "renderer/tsenta/composer/ultracode";

/** Read-only: the user's Claude settings turn ultracode on, not this menu. */
export function TsentaUltracodeRow() {
	return (
		<div className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
			<span className="min-w-0 flex-1 truncate">{ULTRACODE_LABEL}</span>
			<span className="text-muted-foreground">
				<Trans>On</Trans>
			</span>
		</div>
	);
}
