import { useLingui } from "@lingui/react/macro";
import { type ReactNode, useCallback } from "react";
import { useBoxForHost } from "renderer/hooks/useBoxForHost";
import type { BoxHost } from "renderer/hooks/useBoxHosts";
import { useBoxDialogStore } from "renderer/stores/box-dialog";

export interface WakeBox {
	/** The host's box, or null when it is not a box (or no host was given). */
	box: BoxHost | null;
	/** Opens the app-wide Wake dialog; null when there is no box to wake. */
	open: (() => void) | null;
	/** A small pill "Wake box" button that calls `open`; null without a box. */
	button: ReactNode;
}

/**
 * Paradev Boxes (fork-owned). Wake for one host that may run on a box. Pass
 * a null host to offer nothing (and query nothing). The dialog itself is the
 * app-wide one `BoxDialogHost` renders, so it outlives the caller.
 */
export function useWakeBox(
	organizationId: string | null | undefined,
	hostId: string | null | undefined,
	hostName?: string,
): WakeBox {
	const { t } = useLingui();
	const box = useBoxForHost(organizationId, hostId);
	const openDialog = useBoxDialogStore((state) => state.open);
	const name = hostName || box?.hostName || box?.ref || "";
	const open = useCallback(() => {
		if (!box || !organizationId) return;
		openDialog({ box, organizationId, hostName: name, action: "start" });
	}, [box, name, openDialog, organizationId]);

	if (!box || !organizationId) {
		return { box: null, open: null, button: null };
	}
	return {
		box,
		open,
		button: (
			<button
				type="button"
				onClick={open}
				className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 font-medium hover:bg-accent/70"
			>
				{t({ message: "Wake box" })}
			</button>
		),
	};
}
