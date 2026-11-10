import { cn } from "@superset/ui/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
	type ComponentPropsWithoutRef,
	forwardRef,
	type ReactNode,
} from "react";

interface TsentaSectionHeaderProps
	extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
	label: ReactNode;
	/** Pinned and "My workspaces" are semibold; user sections are medium. */
	weight?: "semibold" | "medium";
	isCollapsed: boolean;
	onToggleCollapse: () => void;
	/** Shown on hover while collapsed. */
	count?: number;
	/** Conductor's emoji slot before the name. */
	leading?: ReactNode;
	/** Leaves room for the "…" or "+" button the section places on top. */
	hasActions?: boolean;
	/** True while the label is a rename field: the row stops toggling. */
	isEditing?: boolean;
}

/**
 * The header row of a Conductor list section (shell-sidebar spec §4.2,
 * §4.6): a 12px label in the softer muted, the count while collapsed (on
 * hover), room for the section's button, and the chevron, right while
 * collapsed and always shown, down on hover while open. The whole row
 * toggles the section. It is a div with a button role, not a button, so a
 * rename field can sit in it; the context menu trigger wraps it as is.
 */
export const TsentaSectionHeader = forwardRef<
	HTMLDivElement,
	TsentaSectionHeaderProps
>(
	(
		{
			label,
			weight = "medium",
			isCollapsed,
			onToggleCollapse,
			count,
			leading,
			hasActions = false,
			isEditing = false,
			className,
			...props
		},
		ref,
	) => {
		const Chevron = isCollapsed ? ChevronRight : ChevronDown;
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: one toggle target that holds the rename field while renaming, which a native button cannot
			<div
				ref={ref}
				role={isEditing ? undefined : "button"}
				tabIndex={isEditing ? undefined : 0}
				data-tsenta="list-section-header"
				onClick={isEditing ? undefined : onToggleCollapse}
				onKeyDown={
					isEditing
						? undefined
						: (event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onToggleCollapse();
								}
							}
				}
				className={cn(
					"flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left outline-none",
					"hover:bg-sidebar-accent focus-visible:bg-sidebar-accent data-[state=open]:bg-sidebar-accent",
					"group-hover/section-header:bg-sidebar-accent group-has-[[data-state=open]]/section-header:bg-sidebar-accent",
					className,
				)}
				{...props}
			>
				{leading}
				<span
					className={cn(
						"min-w-0 truncate text-xs text-sidebar-muted-foreground/70",
						weight === "semibold" ? "font-semibold" : "font-medium",
						isEditing && "flex-1",
					)}
				>
					{label}
				</span>
				{isCollapsed && count !== undefined && count > 0 && (
					<span className="shrink-0 text-sidebar-muted-foreground text-xs opacity-0 group-hover/section-header:opacity-100">
						{count}
					</span>
				)}
				{hasActions && (
					<span aria-hidden="true" className="ml-auto w-6 shrink-0" />
				)}
				<span
					className={cn(
						"shrink-0 text-sidebar-muted-foreground",
						!hasActions && "ml-auto",
						!isCollapsed &&
							"opacity-0 group-focus-within/section-header:opacity-100 group-hover/section-header:opacity-100 group-has-[[data-state=open]]/section-header:opacity-100",
					)}
				>
					<Chevron aria-hidden="true" className="size-3" />
				</span>
			</div>
		);
	},
);

TsentaSectionHeader.displayName = "TsentaSectionHeader";
