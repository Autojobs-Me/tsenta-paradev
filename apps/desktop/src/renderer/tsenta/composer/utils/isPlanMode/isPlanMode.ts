import type { SessionConfigOption } from "@superset/chat/protocol";
import { planControl } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Composer/utils/planControl";

/**
 * Whether the chat is in plan mode, which Conductor shows as the composer
 * card's warm stripes (composer spec §1.1, §6). Plan is a session mode for
 * some agents and a config option for others; Paradev's planControl, which
 * `/plan` and `/default` use, already knows both.
 */
export function isPlanMode({
	configOptions,
	modes,
	currentModeId,
}: {
	configOptions?: readonly SessionConfigOption[];
	modes?: readonly { id: string }[];
	currentModeId?: string;
}): boolean {
	return (
		planControl({
			configOptions: configOptions ?? [],
			modes: modes ?? [],
			currentModeId,
			modeBeforePlan: undefined,
		})?.active === true
	);
}
