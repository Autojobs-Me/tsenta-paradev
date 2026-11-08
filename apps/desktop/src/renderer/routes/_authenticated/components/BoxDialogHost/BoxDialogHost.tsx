import { useEffect } from "react";
import { BoxCommandDialog } from "renderer/routes/_authenticated/components/BoxCommandDialog";
import { useBoxDialogStore } from "renderer/stores/box-dialog";

/**
 * Paradev Boxes (fork-owned). Renders the app's one box dialog, opened from
 * anywhere with `useBoxDialogStore().open`. Mounted once, in the
 * authenticated layout, so a command keeps running when the surface that
 * started it (a menu, a popover, the new-workspace modal) goes away.
 */
export function BoxDialogHost() {
	const request = useBoxDialogStore((state) => state.request);
	const close = useBoxDialogStore((state) => state.close);
	// The store outlives this host: when the layout swaps it out (sign-out,
	// the offline screen) drop the request, so a remount never re-runs a
	// start or stop on its own.
	useEffect(() => close, [close]);
	if (!request) return null;
	return (
		<BoxCommandDialog
			key={request.key}
			open
			onOpenChange={(next) => {
				if (!next) close();
			}}
			action={request.action}
			box={request.box}
			organizationId={request.organizationId}
			hostName={request.hostName}
		/>
	);
}
