import type { LucideIcon } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import type { HotkeyId } from "renderer/hotkeys";
import { ShortcutHint } from "renderer/tsenta/components/ShortcutHint";

interface SidebarNavRowProps {
	icon: LucideIcon;
	label: ReactNode;
	onClick: (event: MouseEvent<HTMLButtonElement>) => void;
	onPointerDown?: () => void;
	isActive?: boolean;
	/** Its binding shows at the right while the row is hovered or focused. */
	hotkey?: HotkeyId;
	/** Shows at the right at rest and gives way to the binding on hover. */
	restIndicator?: ReactNode;
}

/**
 * One row of Conductor's sidebar nav block (shell-sidebar spec §3.3): a 16px
 * icon box, a muted label and the shortcut on hover. Every row has the same
 * shell, so Paradev's extra destinations read as Conductor's.
 */
export function SidebarNavRow({
	icon: Icon,
	label,
	onClick,
	onPointerDown,
	isActive = false,
	hotkey,
	restIndicator,
}: SidebarNavRowProps) {
	return (
		<button
			type="button"
			data-active={isActive}
			aria-current={isActive ? "page" : undefined}
			onClick={onClick}
			onPointerDown={onPointerDown}
			className="group/nav-row flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm outline-none hover:bg-sidebar-accent focus-visible:bg-sidebar-accent data-[active=true]:bg-sidebar-accent"
		>
			<span className="flex size-4 shrink-0 items-center justify-center">
				<Icon
					aria-hidden="true"
					className="mb-px size-3.5 text-sidebar-muted-foreground"
				/>
			</span>
			<span className="min-w-0 truncate text-sidebar-muted-foreground">
				{label}
			</span>
			{(hotkey || restIndicator) && (
				<span className="relative ml-auto flex shrink-0 items-center">
					{restIndicator && (
						<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center opacity-100 group-hover/nav-row:opacity-0 group-focus-visible/nav-row:opacity-0">
							{restIndicator}
						</span>
					)}
					{hotkey && (
						<span className="flex items-center opacity-0 group-hover/nav-row:opacity-100 group-focus-visible/nav-row:opacity-100">
							<ShortcutHint id={hotkey} />
						</span>
					)}
				</span>
			)}
		</button>
	);
}
