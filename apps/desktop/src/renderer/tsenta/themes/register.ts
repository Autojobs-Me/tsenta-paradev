/**
 * Makes the Conductor themes real built-ins without editing packages/shared.
 * `builtInThemes` is a mutable array that every consumer reads at call time
 * (the theme store's findTheme and getAllThemes, Settings > Appearance, the
 * command palette's theme frame, the terminal appearance fallbacks), so adding
 * to it at import time is enough.
 *
 * Runs as a side effect of being imported. renderer/tsenta/index.ts imports it
 * first, so the themes are in place before the theme store module loads (it
 * snapshots the built-in ids once) and long before the store hydrates.
 */
import { builtInThemes, type Theme } from "shared/themes";
import { conductorDarkTheme } from "./conductor-dark";
import { conductorLightTheme } from "./conductor-light";

export const CONDUCTOR_DARK_THEME_ID = conductorDarkTheme.id;
export const CONDUCTOR_LIGHT_THEME_ID = conductorLightTheme.id;

const conductorThemes: Theme[] = [conductorDarkTheme, conductorLightTheme];

for (const theme of conductorThemes) {
	// Replace rather than append on a re-run (Vite HMR re-evaluates this file).
	const index = builtInThemes.findIndex((t) => t.id === theme.id);
	if (index === -1) builtInThemes.push(theme);
	else builtInThemes[index] = theme;
}
