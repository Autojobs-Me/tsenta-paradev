// Tsenta fork: puts the Conductor skin switch and the saved theme id on <html>
// before the first paint, so skin-scoped CSS never flashes the Paradev look.
// Loaded as a classic script right after theme-boot.js in index.html.
// renderer/tsenta/skin.ts applies the same rule again at startup.
(() => {
	const root = document.documentElement;
	try {
		if (localStorage.getItem("tsenta-skin") !== "paradev") {
			root.dataset.skin = "conductor";
		}
		// Written by syncThemeToLocalStorage in renderer/stores/theme/store.ts.
		const themeId = localStorage.getItem("theme-id");
		if (themeId) root.dataset.themeId = themeId;
	} catch (_e) {
		root.dataset.skin = "conductor";
	}
})();
