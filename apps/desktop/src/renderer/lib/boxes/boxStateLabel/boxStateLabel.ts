import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

const RUNNING = msg({ message: "Running" });
const STOPPED = msg({ message: "Stopped" });
const SLEEPING = msg({ message: "Sleeping" });
const STARTING = msg({ message: "Starting" });
const ARCHIVED = msg({ message: "Archived" });
const UNKNOWN = msg({ message: "Unknown" });

/**
 * Provider state words, as `paradev-boxes list` reports them (lowercase), on
 * a few labels the app shows. Words on their way to a state get its label.
 */
const LABEL_BY_STATE = new Map<string, MessageDescriptor>([
	// Daytona
	["started", RUNNING],
	["creating", STARTING],
	["starting", STARTING],
	["restoring", STARTING],
	["resuming", STARTING],
	["pending_build", STARTING],
	["building_snapshot", STARTING],
	["pulling_snapshot", STARTING],
	["stopping", STOPPED],
	["stopped", STOPPED],
	["archiving", ARCHIVED],
	["archived", ARCHIVED],
	// E2B
	["running", RUNNING],
	["paused", SLEEPING],
	// Blaxel
	["deployed", RUNNING],
	["standby", SLEEPING],
	["uploading", STARTING],
	["building", STARTING],
	["deploying", STARTING],
	["deactivating", STOPPED],
	["deactivated", STOPPED],
]);

/**
 * The label for a box's provider state, never the provider's own word: one of
 * Running, Stopped, Sleeping, Starting, Archived or Unknown. Null when the
 * provider was not read (no keys on this machine, still loading).
 */
export function boxStateLabel(
	state: string | null | undefined,
): MessageDescriptor | null {
	if (!state) return null;
	return LABEL_BY_STATE.get(state.toLowerCase()) ?? UNKNOWN;
}
