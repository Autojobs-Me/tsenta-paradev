import { useLingui } from "@lingui/react/macro";
import { CircleX } from "lucide-react";
import { ToolCard, useCardOpen } from "../../../ToolCard";

/**
 * Conductor's error row (`x8`, workspace-chat spec §5.6), under a failed
 * tool: "Error" in red, the first line of what went wrong in a tinted mono
 * chip, and all of it in a tinted box when opened.
 */
export function ToolErrorRow({ id, text }: { id: string; text: string }) {
	const { t } = useLingui();
	const [open, setOpen] = useCardOpen(`${id}:error`);
	const firstLine = text.split("\n", 1)[0] ?? text;
	return (
		<ToolCard
			bodyClassName="whitespace-pre-wrap break-words rounded-md border border-destructive/20 bg-destructive/10 p-3 font-medium font-mono text-destructive text-xs max-h-96 overflow-auto"
			icon={<CircleX />}
			label={t({ message: "Error" })}
			left={<span>{t({ message: "Error" })}</span>}
			onOpenChange={setOpen}
			open={open}
			right={
				<span className="block min-w-0 select-text truncate rounded-md bg-destructive/10 px-1 py-0.5 font-medium font-mono text-destructive text-xs">
					{firstLine}
				</span>
			}
			tone="destructive"
		>
			{text}
		</ToolCard>
	);
}
