import { lightTheme, type Theme } from "shared/themes";

/**
 * Conductor's light palette (design-system spec §2.1 to §2.5) on Paradev's
 * UIColors. Tokens UIColors has no slot for live in ../styles/tokens.css,
 * keyed on html[data-theme-id="conductor-light"]. See conductor-dark.ts for
 * why warning and highlight differ from Conductor's tokens of the same name.
 */
export const conductorLightTheme: Theme = {
	id: "conductor-light",
	name: "Conductor Light",
	author: "Tsenta",
	type: "light",
	isBuiltIn: true,

	ui: {
		background: "#ffffff",
		foreground: "#2c2826",
		card: "#ffffff",
		cardForeground: "#211e1c",
		popover: "#ffffff",
		popoverForeground: "#211e1c",
		primary: "#413030",
		primaryForeground: "#f3f2f1",
		secondary: "#fafaf9",
		secondaryForeground: "#2c2826",
		muted: "#fafaf9",
		mutedForeground: "#8e8885",
		accent: "#fafaf9",
		accentForeground: "#2c2826",

		tertiary: "#fdfcfc",
		tertiaryActive: "#f3f2f1",

		destructive: "#dc2828",
		destructiveForeground: "#fef1f1",
		warning: "#9a6700",
		warningForeground: "#ffffff",
		success: "#16a249",

		border: "#eae8e6",
		input: "#14100f1a",
		ring: "#2c2826",

		sidebar: "#fdfcfc",
		sidebarForeground: "#14100fb3",
		sidebarPrimary: "#2c2826",
		sidebarPrimaryForeground: "#f3f2f1",
		sidebarAccent: "#14100f0d",
		sidebarAccentForeground: "#14100fcc",
		sidebarBorder: "#14100f1a",
		sidebarRing: "#a5a09c",

		chart1: lightTheme.ui.chart1,
		chart2: lightTheme.ui.chart2,
		chart3: lightTheme.ui.chart3,
		chart4: lightTheme.ui.chart4,
		chart5: lightTheme.ui.chart5,

		highlightMatch: "rgba(204, 166, 148, 0.3)",
		highlightActive: "rgba(164, 132, 127, 0.45)",

		highlight: "#a4847f",
		highlightForeground: "#ffffff",
	},

	terminal: {
		background: "#ffffff",
		foreground: "#2c2826",
		cursor: "#2c2826",
		cursorAccent: "#ffffff",
		selectionBackground: "#413030",
		selectionForeground: "#f3f2f1",

		black: "#2c2826",
		red: "#dc2828",
		green: "#16a249",
		yellow: "#ffdc2e",
		blue: "#2463eb",
		magenta: "#cb00eb",
		cyan: "#098dae",
		white: "#eae8e6",

		brightBlack: "#766f6b",
		brightRed: "#ef4343",
		brightGreen: "#21c45d",
		brightYellow: "#ffe561",
		brightBlue: "#3c83f6",
		brightMagenta: "#e014ff",
		brightCyan: "#07b6d5",
		brightWhite: "#f3f2f1",
	},
};
