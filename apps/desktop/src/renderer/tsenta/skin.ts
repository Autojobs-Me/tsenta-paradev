/**
 * The Conductor skin switch. Every Conductor style and fork component is keyed
 * on `<html data-skin="conductor">`: CSS through `html[data-skin="conductor"]`
 * and the `conductor:` Tailwind variant, React through `isConductorSkin()`.
 *
 * On by default. `localStorage["tsenta-skin"] = "paradev"` turns it off after
 * a reload. public/tsenta-boot.js applies the same rule before first paint, so
 * keep the two in step.
 */

export const SKIN_STORAGE_KEY = "tsenta-skin";

export type TsentaSkin = "conductor" | "paradev";

export function readSkinPreference(): TsentaSkin {
	try {
		return localStorage.getItem(SKIN_STORAGE_KEY) === "paradev"
			? "paradev"
			: "conductor";
	} catch {
		return "conductor";
	}
}

export function applySkin(skin: TsentaSkin = readSkinPreference()): void {
	const root = document.documentElement;
	if (skin === "conductor") root.dataset.skin = "conductor";
	else delete root.dataset.skin;
}

/** Read at render time; the skin only changes across a reload. */
export function isConductorSkin(): boolean {
	return (
		typeof document !== "undefined" &&
		document.documentElement.dataset.skin === "conductor"
	);
}
