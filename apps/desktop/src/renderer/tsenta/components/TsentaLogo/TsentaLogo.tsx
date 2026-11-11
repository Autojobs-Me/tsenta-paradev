import { cn } from "@superset/ui/utils";
import type { ComponentProps } from "react";
// The file, not the SupersetLogo barrel: the barrel exports this module.
import { SupersetLogo as ParadevLogo } from "renderer/components/SupersetLogo/SupersetLogo";
import { isConductorSkin } from "renderer/tsenta/skin";

type SupersetLogoProps = ComponentProps<typeof ParadevLogo>;

/** What the SupersetLogo barrel exports: Tsenta's mark under the skin, Paradev's otherwise. */
export function SupersetLogo(props: SupersetLogoProps) {
	return isConductorSkin() ? (
		<TsentaLogo {...props} />
	) : (
		<ParadevLogo {...props} />
	);
}

/** Tsenta's mark. `gradient` pulses it, standing in for Paradev's loading shimmer. */
export function TsentaLogo({ className, gradient = false }: SupersetLogoProps) {
	return (
		<svg
			viewBox="0 0 820 725"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("text-foreground", gradient && "animate-pulse", className)}
			role="img"
			aria-label="Tsenta"
		>
			<polygon
				points="410,0 819,725 631,725 410,332 188,725 0,725"
				fill="currentColor"
			/>
		</svg>
	);
}
