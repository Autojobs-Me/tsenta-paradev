import type { Plan } from "@superset/chat/protocol";
import { cn } from "@superset/ui/utils";
import { Circle, CircleCheck, Clock, SquareCheckBig } from "lucide-react";
import { useMemo } from "react";
// The file, not the PlanRow barrel: the barrel exports this module.
import { PlanRow as ParadevPlanRow } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/PlanRow/PlanRow";
import { isConductorSkin } from "renderer/tsenta/skin";
import { TOOL_BODY_CLASSNAME, ToolCard, useCardOpen } from "../ToolCard";
import { type TodoCard, todoCards } from "./utils/todoCards";

/**
 * What the PlanRow barrel exports: Conductor's todo cards under the skin,
 * Paradev's plan card otherwise.
 */
export function PlanRow({ item }: { item: Plan }) {
	return isConductorSkin() ? (
		<TsentaPlanRow item={item} />
	) : (
		<ParadevPlanRow item={item} />
	);
}

const STATUS_ICON = {
	completed: <CircleCheck aria-hidden className="size-4 text-todo-completed" />,
	in_progress: (
		<Clock
			aria-hidden
			className="size-4 text-todo-in-progress motion-safe:animate-pulse"
		/>
	),
	pending: <Circle aria-hidden className="size-4 text-todo-pending" />,
} as const;

function TodoList({ item }: { item: Plan }) {
	return (
		<div className="flex flex-col gap-2">
			{item.entries.map((entry, index) => {
				const done = entry.status === "completed";
				return (
					<div
						className={cn(
							"flex items-center gap-2 font-sans font-normal transition-opacity",
							done && "opacity-60",
						)}
						// biome-ignore lint/suspicious/noArrayIndexKey: entries have no id; their order is the list
						key={index}
					>
						<span className="mt-0.5 shrink-0">{STATUS_ICON[entry.status]}</span>
						<p
							className={cn(
								"min-w-0 flex-1 break-words text-xs",
								done && "line-through",
							)}
							data-find-item={item.id}
						>
							{entry.text}
						</p>
					</div>
				);
			})}
		</div>
	);
}

function TodoCardRow({ card, item }: { card: TodoCard; item: Plan }) {
	const [open, setOpen] = useCardOpen(
		card.key ? `${item.id}-${card.key}` : item.id,
	);
	return (
		<ToolCard
			bodyClassName={TOOL_BODY_CLASSNAME}
			icon={<SquareCheckBig />}
			label={card.label}
			left={<span>{card.label}</span>}
			onOpenChange={setOpen}
			open={open}
			right={
				card.summary ? (
					<span
						className="block min-w-0 truncate text-muted-foreground text-xs"
						title={card.summary}
					>
						{card.summary}
					</span>
				) : undefined
			}
		>
			{item.entries.length > 0 ? <TodoList item={item} /> : undefined}
		</ToolCard>
	);
}

/**
 * The agent's todo list as Conductor's todo cards (`hta`, workspace-chat
 * spec §6.8): what this update did ("Todo started", "Todo completed"), the
 * item in progress or the count on the right, and the whole list in the
 * card, done items struck through at 60%, the one in progress pulsing.
 */
export function TsentaPlanRow({ item }: { item: Plan }) {
	const cards = useMemo(() => todoCards(item.entries), [item.entries]);
	return (
		<div className="flex flex-col">
			{cards.map((card) => (
				<TodoCardRow card={card} item={item} key={card.key} />
			))}
		</div>
	);
}
