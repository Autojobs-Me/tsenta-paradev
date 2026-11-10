/**
 * Conductor's button classes (design-system spec §6.1), for fork components
 * only. Paradev's own Button keeps its sizes, because upstream layout relies
 * on them; primitives.css only gives it Conductor's pressed and focus states.
 *
 * A plain lookup in place of Conductor's cva call, so the desktop app gets no
 * new dependency. Translated to Paradev's Tailwind: `!` moves to the end of a
 * class, and Conductor's no-op `focus-visible:ring-none` becomes
 * `focus-visible:outline-none` (Conductor buttons show no focus ring).
 *
 * Usage: `<button className={conductorButtonVariants({ variant: "ghost",
 * size: "iconSm" })}>`. Add `data-primary-action` to a dialog's primary
 * button, as Conductor does.
 */
import { cn } from "@superset/ui/utils";

export type ConductorButtonVariant =
	| "default"
	| "destructive"
	| "outline"
	| "outlineDestructive"
	| "secondary"
	| "ghost"
	| "link";

export type ConductorButtonSize =
	| "default"
	| "xs"
	| "sm"
	| "lg"
	| "icon"
	| "iconSm"
	| "iconXs";

const BASE =
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-2 ring-offset-background transition-shadow duration-150 ease-out active:shadow-[inset_0_0_0_999px_rgb(0_0_0/0.1)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const VARIANTS: Record<ConductorButtonVariant, string> = {
	default: "bg-foreground font-medium text-background hover:bg-foreground/90",
	destructive:
		"bg-destructive font-medium text-destructive-foreground hover:bg-destructive/90",
	outline:
		"border border-input! bg-background font-450 hover:bg-accent hover:text-accent-foreground",
	outlineDestructive:
		"border border-input! bg-background font-450 text-destructive hover:bg-accent",
	secondary:
		"bg-secondary font-medium text-secondary-foreground hover:bg-secondary/80",
	ghost:
		"font-450 text-foreground/90 hover:bg-sidebar-accent hover:text-accent-foreground",
	link: "font-450 text-foreground/70 hover:text-foreground!",
};

const SIZES: Record<ConductorButtonSize, string> = {
	default: "h-8 gap-2 rounded-md px-3 py-3 text-sm",
	xs: "h-6 gap-1.5 rounded-sm px-2 text-xs",
	sm: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
	lg: "h-11 rounded-lg px-8",
	icon: "h-8 w-8 justify-center rounded-md text-sm",
	iconSm: "h-7 w-7 justify-center rounded-md text-xs",
	iconXs: "h-6 w-6 justify-center rounded-sm text-xs",
};

export interface ConductorButtonVariantsOptions {
	variant?: ConductorButtonVariant;
	size?: ConductorButtonSize;
	className?: string;
}

/** Class string for a Conductor button; `className` wins on conflicts. */
export function conductorButtonVariants({
	variant = "default",
	size = "default",
	className,
}: ConductorButtonVariantsOptions = {}): string {
	return cn(BASE, VARIANTS[variant], SIZES[size], className);
}
