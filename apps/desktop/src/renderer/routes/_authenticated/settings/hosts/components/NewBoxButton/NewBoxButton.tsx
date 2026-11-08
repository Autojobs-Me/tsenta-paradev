import { Trans } from "@lingui/react/macro";
import { Plus } from "lucide-react";
import { useState } from "react";
import { settingsListItemClass } from "../../../components/SettingsListSidebar";
import { NewBoxDialog } from "../NewBoxDialog";

/** The hosts list's "Create a box" row, with the dialog it opens. */
export function NewBoxButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={settingsListItemClass(false, "gap-2 w-full text-left")}
			>
				<Plus className="size-3.5 shrink-0" />
				<span className="truncate flex-1">
					<Trans>Create a box</Trans>
				</span>
			</button>
			<NewBoxDialog open={open} onOpenChange={setOpen} />
		</>
	);
}
