import { Trans, useLingui } from "@lingui/react/macro";
import {
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@superset/ui/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import {
	type ComponentProps,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useMemo,
} from "react";
import { BsTerminalPlus } from "react-icons/bs";
import { HiMiniCommandLine } from "react-icons/hi2";
import { LuGitCompareArrows, LuMessageSquare } from "react-icons/lu";
import { TbDeviceDesktop, TbWorld } from "react-icons/tb";
import {
	getPresetIcon,
	useIsDarkTheme,
} from "renderer/assets/app-icons/preset-icons";
import { HotkeyMenuShortcut } from "renderer/components/HotkeyMenuShortcut";
import { useBuiltinPresets } from "renderer/hooks/useBuiltinPresets";
import { useV2AgentConfigs } from "renderer/hooks/useV2AgentConfigs";
import type { HotkeyId } from "renderer/hotkeys";
import { posthog } from "renderer/lib/posthog";
import { resolveV2PresetIcon } from "renderer/lib/preset-icon";
import { AddTabMenu } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/AddTabMenu";
import type { V2TerminalPresetRow } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

type AddTabMenuProps = ComponentProps<typeof AddTabMenu>;

export interface TsentaLaunchers {
	/** The project's terminal presets, the agent launchers among them. */
	matchedPresets: V2TerminalPresetRow[];
	executePreset: (preset: V2TerminalPresetRow) => void | Promise<void>;
}

// The registry's OPEN_PRESET_{n}, in the order useWorkspaceHotkeys binds them
// to the presets shown in Paradev's launcher row.
const PRESET_HOTKEY_IDS: HotkeyId[] = [
	"OPEN_PRESET_1",
	"OPEN_PRESET_2",
	"OPEN_PRESET_3",
	"OPEN_PRESET_4",
	"OPEN_PRESET_5",
	"OPEN_PRESET_6",
	"OPEN_PRESET_7",
	"OPEN_PRESET_8",
	"OPEN_PRESET_9",
];

interface TsentaAddTabMenuProps {
	/** What Paradev renders in the menu: its AddTabMenu. */
	paradevMenu: ReactNode;
	runAfterClose: (action: () => void) => void;
	launchers?: TsentaLaunchers;
}

/**
 * The tab strip's new-tab menu under the skin (plan step 10; composer spec
 * §10, Conductor's yir): Chat first, then Terminal and Browser, as Conductor
 * lists them, then Paradev's other pane kinds and its right pane entries.
 * Paradev's launcher row (Claude, Codex, OpenCode and the rest) is not drawn
 * under the skin, so its launchers are listed here, with their ⌘⌥ shortcuts,
 * after them. They also stay in the command palette.
 *
 * The entries come from the AddTabMenu element Paradev renders, so this
 * follows its props. Should that element ever stop being an AddTabMenu, it
 * is shown as it is, with the launchers after it.
 */
export function TsentaAddTabMenu({
	paradevMenu,
	runAfterClose,
	launchers,
}: TsentaAddTabMenuProps) {
	const base = isAddTabMenu(paradevMenu) ? paradevMenu.props : null;
	return (
		<>
			{base ? <PaneKindItems {...base} /> : paradevMenu}
			{launchers && (
				<LauncherItems launchers={launchers} runAfterClose={runAfterClose} />
			)}
		</>
	);
}

function isAddTabMenu(
	node: ReactNode,
): node is ReactElement<AddTabMenuProps, typeof AddTabMenu> {
	return isValidElement(node) && node.type === AddTabMenu;
}

function PaneKindItems({
	onAddTerminal,
	runAfterClose,
	onAddChat,
	onAddBrowser,
	onAddChanges,
	onAddDesktop,
	rightPaneOptions = [],
	onOpenInRightPane,
}: AddTabMenuProps) {
	const { i18n } = useLingui();
	return (
		<>
			{onAddChat && (
				<DropdownMenuItem className="gap-2" onClick={onAddChat}>
					<LuMessageSquare className="size-4" />
					<span>
						<Trans>Chat</Trans>
					</span>
					<HotkeyMenuShortcut hotkeyId="NEW_CHAT" />
				</DropdownMenuItem>
			)}
			<DropdownMenuItem
				className="gap-2"
				onClick={() => runAfterClose(onAddTerminal)}
			>
				<BsTerminalPlus className="size-4" />
				<span>
					<Trans>Terminal</Trans>
				</span>
				<HotkeyMenuShortcut hotkeyId="NEW_GROUP" />
			</DropdownMenuItem>
			{onAddBrowser && (
				<DropdownMenuItem className="gap-2" onClick={onAddBrowser}>
					<TbWorld className="size-4" />
					<span>
						<Trans>Browser</Trans>
					</span>
					<HotkeyMenuShortcut hotkeyId="NEW_BROWSER" />
				</DropdownMenuItem>
			)}
			{onAddChanges && (
				<DropdownMenuItem className="gap-2" onClick={onAddChanges}>
					<LuGitCompareArrows className="size-4" />
					<span>
						<Trans>Changes</Trans>
					</span>
					<HotkeyMenuShortcut hotkeyId="OPEN_DIFF_VIEWER" />
				</DropdownMenuItem>
			)}
			{onAddDesktop && (
				<DropdownMenuItem className="gap-2" onClick={onAddDesktop}>
					<TbDeviceDesktop className="size-4" />
					<span>
						<Trans>Desktop</Trans>
					</span>
					<HotkeyMenuShortcut hotkeyId="SPLIT_WITH_DESKTOP" />
				</DropdownMenuItem>
			)}
			{onOpenInRightPane && rightPaneOptions.length > 0 && (
				<>
					<DropdownMenuSeparator />
					<DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
						<Trans>Open in right pane</Trans>
					</DropdownMenuLabel>
					{rightPaneOptions.map((option) => (
						<DropdownMenuItem
							key={option.kind}
							className="gap-2"
							onClick={() => onOpenInRightPane(option.kind)}
						>
							<option.Icon className="size-4" />
							<span>{i18n._(option.label)}</span>
							{option.hotkeyId && (
								<HotkeyMenuShortcut hotkeyId={option.hotkeyId} />
							)}
						</DropdownMenuItem>
					))}
				</>
			)}
		</>
	);
}

/**
 * Paradev's launcher row as menu entries: the presets the row shows, in its
 * order and with its shortcuts, then the built-in ones it shows after them,
 * and the way to manage them.
 */
function LauncherItems({
	launchers: { matchedPresets, executePreset },
	runAfterClose,
}: {
	launchers: TsentaLaunchers;
	runAfterClose: (action: () => void) => void;
}) {
	const navigate = useNavigate();
	const isDark = useIsDarkTheme();
	const { activeHostUrl } = useLocalHostService();
	const { data: agents } = useV2AgentConfigs(activeHostUrl);
	const builtinPresets = useBuiltinPresets();
	const visiblePresets = useMemo(
		() => matchedPresets.filter((preset) => preset.pinnedToBar !== false),
		[matchedPresets],
	);
	const visibleBuiltins = useMemo(
		() => builtinPresets.filter((entry) => entry.isVisible),
		[builtinPresets],
	);
	const builtinIcon = getPresetIcon("superset", isDark);

	return (
		<>
			<DropdownMenuSeparator />
			{visiblePresets.map((preset, index) => {
				const icon = resolveV2PresetIcon(preset, agents, isDark);
				const hotkeyId = PRESET_HOTKEY_IDS[index];
				return (
					<DropdownMenuItem
						key={preset.id}
						className="gap-2"
						onClick={() => runAfterClose(() => void executePreset(preset))}
					>
						<PresetIcon src={icon} />
						<span className="min-w-0 flex-1 truncate">
							{preset.name || "default"}
						</span>
						{hotkeyId && <HotkeyMenuShortcut hotkeyId={hotkeyId} />}
					</DropdownMenuItem>
				);
			})}
			{visibleBuiltins.map(({ preset }) => (
				<DropdownMenuItem
					key={preset.id}
					className="gap-2"
					onClick={() =>
						runAfterClose(() => {
							posthog.capture("builtin_preset_launched", {
								presetId: preset.id,
							});
							void executePreset(preset);
						})
					}
				>
					<PresetIcon src={builtinIcon} />
					<span className="min-w-0 flex-1 truncate">{preset.name}</span>
				</DropdownMenuItem>
			))}
			<DropdownMenuItem
				className="gap-2"
				onClick={() => navigate({ to: "/settings/terminal" })}
			>
				<Settings className="size-4" />
				<span>
					<Trans>Manage Terminal Scripts</Trans>
				</span>
			</DropdownMenuItem>
		</>
	);
}

function PresetIcon({ src }: { src: string | null | undefined }) {
	return src ? (
		<img src={src} alt="" className="size-4 object-contain" />
	) : (
		<HiMiniCommandLine className="size-4" />
	);
}
