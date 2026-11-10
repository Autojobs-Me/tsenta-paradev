/**
 * Ties the Conductor themes to Paradev's theme store from outside it, so the
 * store itself is never edited.
 */
import { SYSTEM_THEME_ID, useThemeStore } from "renderer/stores/theme";
import { DEFAULT_THEME_ID, darkTheme, lightTheme } from "shared/themes";
import { isConductorSkin } from "../skin";
import { CONDUCTOR_DARK_THEME_ID, CONDUCTOR_LIGHT_THEME_ID } from "./register";

/**
 * Keeps `<html data-theme-id>` on the active theme. tokens.css keys the
 * Conductor-only tokens on it. public/tsenta-boot.js sets the saved id before
 * first paint; this follows every change after that.
 */
export function syncThemeIdAttribute(): () => void {
	const apply = (themeId: string | undefined) => {
		if (themeId) document.documentElement.dataset.themeId = themeId;
	};
	apply(useThemeStore.getState().activeTheme?.id);
	return useThemeStore.subscribe((state, previous) => {
		if (state.activeTheme !== previous.activeTheme) {
			apply(state.activeTheme?.id);
		}
	});
}

/**
 * With the Conductor look on, a profile still on Paradev's theme defaults
 * (Dark, or System with Light and Dark) moves to the Conductor themes, dark
 * first as in Conductor. A profile with any other choice is left alone.
 *
 * No "done" flag is stored: once moved, the system themes are no longer
 * Paradev's defaults, so this does not run again, and a later pick of
 * Paradev's Dark stays. Writing a flag to localStorage would need an entry in
 * the upstream persisted-key registry (apps/desktop/AGENTS.md).
 */
function adoptIfUntouched(): void {
	if (!isConductorSkin()) return;
	const state = useThemeStore.getState();
	const untouched =
		(state.activeThemeId === DEFAULT_THEME_ID ||
			state.activeThemeId === SYSTEM_THEME_ID) &&
		state.systemDarkThemeId === darkTheme.id &&
		state.systemLightThemeId === lightTheme.id;
	if (!untouched) return;

	state.setSystemThemePreference("dark", CONDUCTOR_DARK_THEME_ID);
	state.setSystemThemePreference("light", CONDUCTOR_LIGHT_THEME_ID);
	if (state.activeThemeId === DEFAULT_THEME_ID) {
		state.setTheme(CONDUCTOR_DARK_THEME_ID);
	}
}

/** Runs the move once the store has loaded the saved theme state. */
export function adoptConductorThemes(): void {
	const { persist } = useThemeStore;
	if (persist.hasHydrated()) {
		adoptIfUntouched();
		return;
	}
	const unsubscribe = persist.onFinishHydration(() => {
		unsubscribe();
		// Runs inside the store's hydration; a throw here would skip the
		// listeners after this one.
		try {
			adoptIfUntouched();
		} catch (error) {
			console.error("[tsenta] Could not move to the Conductor themes", error);
		}
	});
}
