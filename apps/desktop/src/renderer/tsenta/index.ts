/**
 * Tsenta fork entry, imported once for its side effects by renderer/index.tsx.
 * Everything for the Conductor look lives under this folder, so rebasing onto
 * Paradev's canary only ever meets a few one-line hooks (listed in
 * scripts/fork/check-upstream-touchpoints.sh). Styles come in separately: the
 * last `@import` in globals.css pulls in styles/conductor.css. Components read
 * the switch with `isConductorSkin()` from ./skin.
 */
// First, before anything loads the theme store: adds the Conductor themes to
// Paradev's built-in list.
import "./themes/register";
import { applySkin } from "./skin";
import { adoptConductorTerminalFontSize } from "./terminal/font-size";
import {
	adoptConductorThemes,
	syncThemeIdAttribute,
} from "./themes/store-sync";

/**
 * This module loads before renderer/index.tsx sets up its boot error screen,
 * so a throw here would leave a blank window. The look is optional; the app
 * is not, so each step fails on its own and only logs.
 */
function runStep(name: string, step: () => unknown): void {
	try {
		const result = step();
		if (result instanceof Promise) {
			result.catch((error: unknown) => {
				console.error(`[tsenta] ${name} failed`, error);
			});
		}
	} catch (error) {
		console.error(`[tsenta] ${name} failed`, error);
	}
}

runStep("applySkin", applySkin);
runStep("syncThemeIdAttribute", syncThemeIdAttribute);
runStep("adoptConductorThemes", adoptConductorThemes);
runStep("adoptConductorTerminalFontSize", adoptConductorTerminalFontSize);
