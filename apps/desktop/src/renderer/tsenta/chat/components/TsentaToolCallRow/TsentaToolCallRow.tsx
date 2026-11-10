import { useLingui } from "@lingui/react/macro";
import type { ToolCall, ToolContent } from "@superset/chat/protocol";
import { ShimmerLabel } from "@superset/ui/ai-elements/shimmer-label";
import { cn } from "@superset/ui/utils";
import type { ReactNode } from "react";
import { PluginIcon } from "renderer/components/PluginIcon";
import { FileChangeTitle } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ToolCallRow/components/FileChangeTitle";
import { RunningTime } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ToolCallRow/components/RunningTime";
import { ShellIntentTitle } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ToolCallRow/components/ShellIntentTitle";
import { StatusWord } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ToolCallRow/components/StatusWord";
// The file, not the ToolCallRow barrel: the barrel exports this module.
import { ToolCallRow as ParadevToolCallRow } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ToolCallRow/ToolCallRow";
import { ToolContentList } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ToolContentList";
import { useTranscriptPlugins } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/providers/TranscriptPluginsProvider";
import {
	toolCallCommand,
	unwrapShellCommand,
} from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/utils/shellIntent";
import { isConductorSkin } from "renderer/tsenta/skin";
import {
	TOOL_BODY_CLASSNAME,
	TOOL_CHIP_CLASSNAME,
	ToolCard,
	useCardOpen,
} from "../ToolCard";
import { PlanProposalCard, proposedPlan } from "./components/PlanProposalCard";
import { ToolErrorRow } from "./components/ToolErrorRow";
import { toolFace } from "./utils/toolFace";
import { toolIcon } from "./utils/toolIcon";

const TITLE_SWEEP_SECONDS = 1.6;

/**
 * What the ToolCallRow barrel exports: Conductor's tool card under the skin,
 * Paradev's row otherwise.
 */
export function ToolCallRow({ item }: { item: ToolCall }) {
	if (!isConductorSkin()) return <ParadevToolCallRow item={item} />;
	const plan = item.toolName === "ExitPlanMode" ? proposedPlan(item) : null;
	return plan ? (
		<PlanProposalCard item={item} plan={plan} />
	) : (
		<TsentaToolCallRow item={item} />
	);
}

/** What a failed call said, for its error row: its text, else its output. */
function errorText(content: readonly ToolContent[]): string {
	const texts = content.flatMap((part) =>
		part.type === "text" && part.text.trim() ? [part.text.trim()] : [],
	);
	if (texts.length > 0) return texts.join("\n\n");
	const terminal = content.findLast((part) => part.type === "terminal");
	return terminal?.type === "terminal" ? terminal.output.trim() : "";
}

/**
 * One tool call as Conductor's card (workspace-chat spec §5, §6): its glyph,
 * what it did, and a summary on the right (the command in a mono chip, the
 * file it changed, the note the agent gave it). The body is Paradev's own
 * output: the terminal, the diff, the result text, in Conductor's box. A
 * running call sweeps its label, as in Paradev, instead of a spinner; a
 * failed one gets Conductor's error row under it.
 */
export function TsentaToolCallRow({ item }: { item: ToolCall }) {
	const { t } = useLingui();
	const [open, setOpen] = useCardOpen(item.id);
	const running = item.status === "running";
	const installedPlugins = useTranscriptPlugins();
	const mcpServer = item.mcpServer;
	const plugin = mcpServer
		? installedPlugins.find((candidate) => candidate.name === mcpServer.name)
		: undefined;
	const face = toolFace(item, t, Boolean(plugin));
	const intentCommand =
		face.kind === "intent" &&
		!item.content.some((content) => content.type === "terminal")
			? toolCallCommand(item)
			: null;
	const hasBody = item.content.length > 0 || intentCommand !== null;
	const Icon = toolIcon(item, face.kind === "intent" ? face.intent : null);
	const icon = plugin ? (
		<PluginIcon className="size-3 rounded-[3px]" pluginName={plugin.name} />
	) : (
		<Icon />
	);

	let left: ReactNode;
	let right: ReactNode = null;
	let alwaysShowRight = false;
	if (face.kind === "change") {
		left = (
			<FileChangeTitle
				change={face.change}
				item={item}
				onToggle={hasBody ? () => setOpen(!open) : undefined}
				running={running}
				verb={face.verb}
			/>
		);
	} else if (face.kind === "intent") {
		left = (
			<ShellIntentTitle
				intent={face.intent}
				running={running}
				verb={face.verb}
			/>
		);
	} else {
		left = running ? (
			<ShimmerLabel
				className="min-w-0 truncate font-normal"
				duration={TITLE_SWEEP_SECONDS}
			>
				{face.label}
			</ShimmerLabel>
		) : (
			<span className="min-w-0 truncate">{face.label}</span>
		);
		if (face.summary) {
			right = face.mono ? (
				<span className={TOOL_CHIP_CLASSNAME} title={face.summary}>
					{face.summary}
				</span>
			) : (
				<span
					className="block min-w-0 truncate text-muted-foreground text-xs"
					title={face.summary}
				>
					{face.summary}
				</span>
			);
			alwaysShowRight = !face.mono;
		}
	}

	const failure = item.status === "failed" ? errorText(item.content) : "";
	return (
		<>
			<ToolCard
				alwaysShowRight={alwaysShowRight}
				bodyClassName="flex flex-col gap-2"
				findItemId={item.id}
				icon={icon}
				label={item.title}
				left={left}
				onOpenChange={setOpen}
				open={open}
				right={right}
				status={
					running ? (
						<RunningTime startedAtMs={item.startedAtMs} />
					) : (
						<StatusWord status={item.status} />
					)
				}
			>
				{hasBody ? (
					<div className="flex min-w-0 flex-col gap-2" data-tsenta="tool-body">
						{intentCommand && (
							<div className={TOOL_BODY_CLASSNAME}>
								$ {unwrapShellCommand(intentCommand)}
							</div>
						)}
						{item.content.map((content, index) => {
							const key = `${item.id}:${index}`;
							return (
								<div
									className={
										content.type === "text"
											? cn(TOOL_BODY_CLASSNAME, "max-h-96 overflow-auto")
											: "min-w-0"
									}
									key={key}
								>
									<ToolContentList
										itemId={key}
										items={[content]}
										streaming={running}
									/>
								</div>
							);
						})}
					</div>
				) : undefined}
			</ToolCard>
			{failure && <ToolErrorRow id={item.id} text={failure} />}
		</>
	);
}
