import type { ToolCall, ToolKind } from "@superset/chat/protocol";
import {
	BicepsFlexed,
	Bot,
	Brain,
	ClipboardList,
	Clock,
	FileCode,
	FileDiff,
	FilePen,
	FileSearch,
	FileText,
	FileX,
	Globe,
	Image,
	type LucideIcon,
	MessageSquare,
	MessageSquareMore,
	MessagesSquare,
	MoveRight,
	Radio,
	Search,
	Send,
	Slash,
	SquareCheckBig,
	Terminal,
	Users,
	Wrench,
} from "lucide-react";
import type { ShellIntent } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/utils/shellIntent";

/** Conductor's glyph per tool name (`Tu`, workspace-chat spec §5.4). */
const ICON_BY_TOOL_NAME: Record<string, LucideIcon> = {
	Bash: Terminal,
	BashOutput: Terminal,
	KillShell: Terminal,
	Read: FileText,
	NotebookRead: FileText,
	Grep: Search,
	ToolSearch: Search,
	Glob: FileSearch,
	LS: FileSearch,
	Edit: FilePen,
	MultiEdit: FilePen,
	NotebookEdit: FilePen,
	Write: FilePen,
	TodoRead: SquareCheckBig,
	TodoWrite: SquareCheckBig,
	TaskCreate: SquareCheckBig,
	TaskGet: SquareCheckBig,
	TaskList: SquareCheckBig,
	TaskUpdate: SquareCheckBig,
	TaskOutput: Terminal,
	TaskStop: Terminal,
	WebSearch: Globe,
	WebFetch: Globe,
	Task: FileCode,
	Agent: FileCode,
	subagent: Bot,
	Thinking: Brain,
	EnterPlanMode: ClipboardList,
	ExitPlanMode: ClipboardList,
	Skill: BicepsFlexed,
	SlashCommand: Slash,
	Monitor: Radio,
	ImageGeneration: Image,
	ScheduleWakeup: Clock,
	SendMessage: Send,
	Teammate: Users,
	AskUserQuestion: MessageSquareMore,
	GetWorkspaceDiff: FileDiff,
	DiffComment: MessageSquare,
	GetDiffComments: MessagesSquare,
};

/** The same glyphs by Paradev's tool kind, for agents whose names differ. */
const ICON_BY_KIND: Record<ToolKind, LucideIcon> = {
	read: FileText,
	edit: FilePen,
	delete: FileX,
	move: MoveRight,
	search: Search,
	execute: Terminal,
	think: Brain,
	fetch: Globe,
	other: Wrench,
};

const ICON_BY_SHELL_VERB: Record<ShellIntent["verb"], LucideIcon> = {
	read: FileText,
	search: Search,
	list: FileSearch,
	write: FilePen,
	edit: FilePen,
};

/**
 * The glyph a tool card leads with: a shell command that only read or
 * searched shows as that read or search, a known tool by its name, anything
 * else by its kind.
 */
export function toolIcon(
	item: Pick<ToolCall, "toolName" | "toolKind" | "mcpServer" | "subagent">,
	intent: ShellIntent | null = null,
): LucideIcon {
	if (intent) return ICON_BY_SHELL_VERB[intent.verb];
	if (item.subagent) return Bot;
	if (item.mcpServer) return Wrench;
	return (
		ICON_BY_TOOL_NAME[item.toolName] ?? ICON_BY_KIND[item.toolKind] ?? Wrench
	);
}
