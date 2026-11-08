import { useLingui } from "@lingui/react/macro";
import { type ReactNode, useState } from "react";
import { useBoxForHost } from "renderer/hooks/useBoxForHost";
import { BoxCommandDialog } from "renderer/routes/_authenticated/components/BoxCommandDialog";

/**
 * The pill's "Wake box" button for a workspace whose host is a box, and the
 * dialog it opens. The dialog is returned separately so the pill can keep it
 * mounted after the host is back and the pill itself hides.
 */
export function useWakeBox(
	organizationId: string,
	hostId: string,
	hostName: string,
): { button: ReactNode; dialog: ReactNode } {
	const { t } = useLingui();
	const box = useBoxForHost(organizationId, hostId);
	const [open, setOpen] = useState(false);
	if (!box) return { button: null, dialog: null };

	return {
		button: (
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 font-medium hover:bg-accent/70"
			>
				{t({ message: "Wake box" })}
			</button>
		),
		dialog: open ? (
			<BoxCommandDialog
				open
				onOpenChange={setOpen}
				action="start"
				box={box}
				organizationId={organizationId}
				hostName={hostName}
			/>
		) : null,
	};
}
