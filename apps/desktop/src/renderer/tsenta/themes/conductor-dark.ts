import { darkTheme, type Theme } from "shared/themes";

/**
 * Conductor's dark palette (design-system spec §2.1 to §2.5) on Paradev's
 * UIColors. Tokens UIColors has no slot for (sheet surface, popover ring,
 * status, git, tip...) live in ../styles/tokens.css, keyed on
 * html[data-theme-id="conductor-dark"].
 */
export const conductorDarkTheme: Theme = {
	id: "conductor-dark",
	name: "Conductor Dark",
	author: "Tsenta",
	type: "dark",
	isBuiltIn: true,

	ui: {
		background: "#141110",
		foreground: "#eae8e6",
		card: "#2c2826",
		cardForeground: "#f3f2f1",
		popover: "#2c2826",
		popoverForeground: "#eae8e6",
		primary: "#f3f2f1",
		primaryForeground: "#2c2826",
		secondary: "#211e1c",
		secondaryForeground: "#f3f2f1",
		muted: "#211e1c",
		mutedForeground: "#a5a09c",
		accent: "#2c2826",
		accentForeground: "#f3f2f1",

		// Tertiary is Conductor's --sheet-surface.
		tertiary: "#1c1917",
		tertiaryActive: "#2c2826",

		destructive: "#f87272",
		destructiveForeground: "#fef1f1",
		// Paradev's warning is an attention colour, so this is Conductor's
		// --checks-pending, not its tan --warning tint (that is --notice).
		warning: "#d29922",
		warningForeground: "#141110",
		success: "#4ade80",

		// Translucent borders are a large part of the look.
		border: "#ffffff1a",
		input: "#ffffff33",
		ring: "#bcb6b3",

		// The sidebar is painted with the sheet surface (shell spec §0.3).
		sidebar: "#1c1917",
		sidebarForeground: "#ffffffe6",
		sidebarPrimary: "#eae8e6",
		sidebarPrimaryForeground: "#ffffff",
		sidebarAccent: "#ffffff0d",
		sidebarAccentForeground: "#ffffffe6",
		sidebarBorder: "#ffffff1a",
		sidebarRing: "#bcb6b3",

		chart1: darkTheme.ui.chart1,
		chart2: darkTheme.ui.chart2,
		chart3: darkTheme.ui.chart3,
		chart4: darkTheme.ui.chart4,
		chart5: darkTheme.ui.chart5,

		// Tan search hits.
		highlightMatch: "rgba(204, 166, 148, 0.25)",
		highlightActive: "rgba(204, 166, 148, 0.5)",

		// Paradev reads highlight as a colour that pops (text-highlight on the
		// effort slider and mode picker, the slider fill, the PRO badge), so it
		// gets Conductor's tan accent. Conductor's own --highlight is a dark tint
		// that would make that text invisible; it is --highlight-tint here.
		highlight: "#cca694",
		highlightForeground: "#141110",
	},

	terminal: {
		background: "#141110",
		foreground: "#eae8e6",
		cursor: "#eae8e6",
		cursorAccent: "#141110",
		selectionBackground: "#f3f2f1",
		selectionForeground: "#2c2826",

		black: "#47423e",
		red: "#f87272",
		green: "#4ade80",
		yellow: "#ffea80",
		blue: "#61a6fa",
		magenta: "#e852ff",
		cyan: "#3ed8ef",
		white: "#eae8e6",

		brightBlack: "#a5a09c",
		brightRed: "#fca6a6",
		brightGreen: "#85efac",
		brightYellow: "#fff1ad",
		brightBlue: "#91c3fd",
		brightMagenta: "#f08fff",
		brightCyan: "#7bebf9",
		brightWhite: "#ffffff",
	},
};
