/**
 * Conductor's terminal font size is 12 (design-system spec §1.1); Paradev's
 * default is 14. With the Conductor look on, a profile with no terminal font
 * size of its own gets 12, written through Paradev's font settings rather than
 * CSS, so Settings > Appearance shows it and the user can change it. A size
 * the user picked is left alone. Clearing it (Reset, or the zoom reset key)
 * goes back to 14 until the next launch, which sets 12 again.
 */
import { FONT_SETTINGS_QUERY_KEY } from "renderer/lib/font-settings";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { electronQueryClient } from "renderer/providers/ElectronTRPCProvider";
import { isConductorSkin } from "../skin";

export const CONDUCTOR_TERMINAL_FONT_SIZE = 12;

export async function adoptConductorTerminalFontSize(): Promise<void> {
	if (!isConductorSkin()) return;
	try {
		const { terminalFontSize } =
			await electronTrpcClient.settings.getFontSettings.query();
		if (terminalFontSize !== null) return;
		await electronTrpcClient.settings.setFontSettings.mutate({
			terminalFontSize: CONDUCTOR_TERMINAL_FONT_SIZE,
		});
		// This runs at startup, so a terminal may already have read the old
		// value. Same two caches useFontSettingsMutation refreshes.
		await Promise.all([
			electronQueryClient.invalidateQueries({
				queryKey: [["settings", "getFontSettings"]],
			}),
			electronQueryClient.invalidateQueries({
				queryKey: FONT_SETTINGS_QUERY_KEY,
			}),
		]);
	} catch (error) {
		console.warn(
			"[tsenta] Could not set the Conductor terminal font size",
			error,
		);
	}
}
