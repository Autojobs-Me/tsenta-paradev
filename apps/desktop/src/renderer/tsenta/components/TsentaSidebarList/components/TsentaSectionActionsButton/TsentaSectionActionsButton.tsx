import { useLingui } from "@lingui/react/macro";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import { Ellipsis } from "lucide-react";
import type { ReactNode } from "react";
import { conductorButtonVariants } from "renderer/tsenta/components/ui/button-variants";

interface TsentaSectionActionsButtonProps {
	/** The section's name, for the button's accessible name. */
	label: string;
	children: ReactNode;
	/** Conductor sits it 26px from the right, 36px on repository rows. */
	offsetClassName?: string;
	contentClassName?: string;
}

/**
 * A section's "…" button (shell-sidebar spec §4.3): a 24px ghost button laid
 * over the header's right side, shown while the header is hovered or
 * focused or its menu is open, opening the section's actions below it.
 */
export function TsentaSectionActionsButton({
	label,
	children,
	offsetClassName = "right-[26px]",
	contentClassName,
}: TsentaSectionActionsButtonProps) {
	const { t } = useLingui();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={t({ message: `${label} actions` })}
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => event.stopPropagation()}
					onKeyDown={(event) => event.stopPropagation()}
					onContextMenu={(event) => event.stopPropagation()}
					className={conductorButtonVariants({
						variant: "ghost",
						size: "iconXs",
						className: cn(
							"absolute top-1/2 z-10 size-6 -translate-y-1/2 px-0 text-sidebar-muted-foreground opacity-0 hover:text-sidebar-foreground focus-visible:opacity-100 data-[state=open]:opacity-100",
							"group-hover/section-header:opacity-100 group-has-[:focus-visible]/section-header:opacity-100 group-has-[[data-state=open]]/section-header:opacity-100",
							offsetClassName,
						),
					})}
				>
					<Ellipsis aria-hidden="true" className="size-3.5" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				sideOffset={4}
				className={contentClassName}
				onCloseAutoFocus={(event) => event.preventDefault()}
				onClick={(event) => event.stopPropagation()}
				onPointerDown={(event) => event.stopPropagation()}
			>
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
