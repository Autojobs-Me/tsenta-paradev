import type { BoxHost } from "renderer/hooks/useBoxHosts";
import type { BoxAction } from "renderer/lib/boxes";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

/** What the app-wide box dialog runs: which box, for which host, and what. */
export interface BoxDialogRequest {
	box: Pick<BoxHost, "provider" | "id" | "ref" | "hostId">;
	organizationId: string;
	hostName: string;
	action: BoxAction;
}

interface BoxDialogState {
	/** The open dialog's request, or null; `key` is new for every open. */
	request: (BoxDialogRequest & { key: number }) | null;
	/** Opens the dialog, unless one is already open (it may be mid-command). */
	open: (request: BoxDialogRequest) => void;
	close: () => void;
}

let nextKey = 0;

/**
 * Paradev Boxes (fork-owned). The one wake, stop or delete dialog for the
 * whole app, rendered by `BoxDialogHost` in the authenticated layout. It keeps
 * the box it was opened for, so it stays up (and shows the result) after the
 * host comes online, or the surface that opened it closes.
 */
export const useBoxDialogStore = create<BoxDialogState>()(
	devtools(
		(set, get) => ({
			request: null,
			open: (request) => {
				if (get().request) return;
				nextKey += 1;
				set({ request: { ...request, key: nextKey } });
			},
			close: () => set({ request: null }),
		}),
		{ name: "BoxDialogStore" },
	),
);
