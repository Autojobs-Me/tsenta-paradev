import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@superset/ui/collapsible";
import { cn } from "@superset/ui/utils";
import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

/** Conductor's default tool body (workspace-chat spec §5.2). */
export const TOOL_BODY_CLASSNAME =
	"whitespace-pre-wrap break-words rounded-md border border-border bg-accent p-3 font-medium font-mono text-accent-foreground text-xs";

/** Conductor's mono summary chip (workspace-chat spec §5.5). */
export const TOOL_CHIP_CLASSNAME =
	"block min-w-0 truncate rounded-md bg-muted px-1 py-0.5 font-medium font-mono text-muted-foreground text-xs";

export type ToolCardProps = {
	/** The tool's 12px glyph; on hover it turns into + or − when the card opens. */
	icon: ReactNode;
	/** What the tool did, in text-sm. */
	left: ReactNode;
	/** A summary on the right, kept in place but hidden while the card is open. */
	right?: ReactNode;
	/** Keep the right summary while open: a file chip, for one. */
	alwaysShowRight?: boolean;
	/** A note after the left text: how long it has run, how it ended. */
	status?: ReactNode;
	/** The body; a card without one does not open. */
	children?: ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The toggle's accessible name. */
	label: string;
	tone?: "default" | "destructive";
	/** Classes of the box around the body; Conductor's boxed mono body by default. */
	bodyClassName?: string;
	/** The transcript find bar's hook for the left text. */
	findItemId?: string;
};

/**
 * Conductor's tool card (`mu`, workspace-chat spec §5.2 and §5.3): an inline
 * header whose hover wash bleeds 8px past the column, the tool's glyph that
 * becomes + or − on hover, the left text, and a summary on the right that
 * gives way to the body when the card opens. The toggle lies under the
 * header so a chip in it can be a button of its own, as in Paradev's row;
 * hovering such a chip keeps the tool's glyph.
 */
export function ToolCard({
	alwaysShowRight = false,
	bodyClassName,
	children,
	findItemId,
	icon,
	label,
	left,
	onOpenChange,
	open,
	right,
	status,
	tone = "default",
}: ToolCardProps) {
	const openable = children !== undefined && children !== null;
	const shown = openable && open;
	const iconColor =
		tone === "destructive" ? "text-destructive" : "text-muted-foreground";
	const Glyph = shown ? Minus : Plus;
	return (
		<Collapsible
			className="w-full min-w-0"
			data-tsenta="tool-card"
			onOpenChange={onOpenChange}
			open={shown}
		>
			<div
				className={cn(
					"group/collapsible relative -mx-2 inline-flex max-w-[calc(100%+1rem)] items-center gap-2 rounded-sm px-2 py-1.5 align-top",
					openable && "hover:bg-muted/50",
				)}
			>
				{openable && (
					<CollapsibleTrigger
						aria-label={label}
						className="absolute inset-0 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-1px]"
					/>
				)}
				<div className="pointer-events-none relative z-[1] flex min-w-0 items-center gap-2">
					<span className="relative flex size-3 shrink-0 items-center justify-center">
						<span
							className={cn(
								"flex items-center justify-center [&_svg]:size-3",
								iconColor,
								openable &&
									"group-hover/collapsible:opacity-0 group-has-[.pointer-events-auto:hover]/collapsible:opacity-100",
							)}
						>
							{icon}
						</span>
						{openable && (
							<Glyph
								aria-hidden
								className="absolute inset-0 m-auto hidden size-3 text-muted-foreground group-hover/collapsible:block group-has-[.pointer-events-auto:hover]/collapsible:hidden"
							/>
						)}
					</span>
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<div
							className={cn(
								"flex min-w-0 items-center gap-1.5 truncate text-sm",
								tone === "destructive" ? "text-destructive" : "text-foreground",
							)}
							data-find-item={findItemId}
						>
							{left}
						</div>
						{status}
						{right !== undefined && right !== null && (
							<div
								className={cn(
									"flex min-w-0 max-w-[400px] items-center",
									shown && !alwaysShowRight && "invisible",
								)}
							>
								{right}
							</div>
						)}
					</div>
				</div>
			</div>
			{openable && (
				<CollapsibleContent>
					<div
						className={cn(
							"mt-2 select-text",
							bodyClassName ?? TOOL_BODY_CLASSNAME,
						)}
					>
						{children}
					</div>
				</CollapsibleContent>
			)}
		</Collapsible>
	);
}
