import { SquareTerminal } from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useIsDarkTheme } from "renderer/assets/app-icons/preset-icons";
import { registerProvider } from "renderer/commandPalette/core/registry";
import type {
	Command,
	CommandProvider,
} from "renderer/commandPalette/core/types";
import { useV2AgentConfigs } from "renderer/hooks/useV2AgentConfigs";
import type { HotkeyId } from "renderer/hotkeys";
import { resolveV2PresetIcon } from "renderer/lib/preset-icon";
import type { V2TerminalPresetRow } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

const PROVIDER_ID = "tsenta.launchers";

export interface TsentaLaunchers {
	/** The project's terminal presets, the agent launchers among them. */
	matchedPresets: V2TerminalPresetRow[];
	executePreset: (preset: V2TerminalPresetRow) => void | Promise<void>;
}

/**
 * Paradev's launcher row (Claude, Codex, OpenCode and the rest), which the
 * skin does not draw, as command palette entries in the Workspace group, so
 * a launcher is one ⌘K and its name away. Titled by the preset's own name and run through the workspace's
 * executePreset, with the row's ⌘⌥ shortcuts. Registered while the
 * workspace view is open under the skin.
 */
export function useConductorLauncherCommands(
	launchers: TsentaLaunchers | undefined,
): void {
	const isDark = useIsDarkTheme();
	const { activeHostUrl } = useLocalHostService();
	const { data: agents } = useV2AgentConfigs(activeHostUrl);
	const execute = useRef(launchers?.executePreset);
	useLayoutEffect(() => {
		execute.current = launchers?.executePreset;
	});
	const matchedPresets = launchers?.matchedPresets;

	useEffect(() => {
		if (!matchedPresets) return;
		const commands: Command[] = matchedPresets
			.filter((preset) => preset.pinnedToBar !== false)
			.map((preset, index) => ({
				id: `tsenta.launch.${preset.id}`,
				title: {
					id: `tsenta.launch.${preset.id}`,
					message: preset.name || "default",
				},
				section: "workspace",
				icon: SquareTerminal,
				iconUrl: resolveV2PresetIcon(preset, agents, isDark),
				hotkeyId:
					index < 9 ? (`OPEN_PRESET_${index + 1}` as HotkeyId) : undefined,
				keywords: ["launch", "agent", "preset", "script", "new tab"],
				run: () => {
					void execute.current?.(preset);
				},
			}));
		const provider: CommandProvider = {
			id: PROVIDER_ID,
			provide: (context) => (context.workspace ? commands : []),
		};
		return registerProvider(provider);
	}, [matchedPresets, agents, isDark]);
}
