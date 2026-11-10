import type { ReactNode } from "react";
// The file, not the RailStep barrel: the barrel exports this module.
import { RailStep as ParadevRailStep } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/TurnGroupSection/components/RailStep/RailStep";
import { isConductorSkin } from "renderer/tsenta/skin";

/**
 * What the RailStep barrel exports. Conductor lines its tool cards up with
 * the text column, with no rail of steps beside them, so under the skin a
 * step is just its row.
 */
export function RailStep({ children }: { children: ReactNode }) {
	return isConductorSkin() ? (
		<div className="min-w-0">{children}</div>
	) : (
		<ParadevRailStep>{children}</ParadevRailStep>
	);
}
