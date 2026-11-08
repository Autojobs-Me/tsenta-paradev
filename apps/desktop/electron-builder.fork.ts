/**
 * Electron Builder configuration for the Paradev Boxes fork.
 *
 * Extends the base config the way electron-builder.canary.ts does, with its
 * own identity so it installs beside Paradev and Paradev Canary: bundle id,
 * product name (which names userData, logs and the single-instance lock),
 * URL scheme, and release feed. Build with SUPERSET_WORKSPACE_NAME=boxes so
 * the runtime scheme (superset-boxes) matches; scripts/fork/build.sh sets
 * everything. The app home is not its own: the entry point, fork/main.cjs,
 * points it at Paradev's ~/.paradev before the main bundle loads, so both
 * apps share projects, workspaces, sign-in, host-service and terminals.
 */

import { join } from "node:path";
import type { Configuration, FileSet } from "electron-builder";
import baseConfig, { displayName as baseDisplayName } from "./electron-builder";
import pkg from "./package.json";
import { localizeMacDisplayName } from "./scripts/localize-display-name";

// "Superset <X>" displays as "<DESKTOP_DISPLAY_NAME> <X>" (app-display-name.ts).
const productName = "Superset Boxes";
const displayName = `${baseDisplayName} Boxes`;
const scheme = "superset-boxes";
// The deb and rpm package; also the installer file names.
const linuxName = "paradev-boxes";
// The GUI's command (/usr/bin/<this>) and window class. Not "paradev-boxes":
// that is the launcher fork/main.cjs writes for box wake commands, and a
// shell without ~/.paradev/bin first would run the GUI instead.
const linuxExecutable = "paradev-boxes-app";

const config: Configuration = {
	...baseConfig,
	appId: "io.github.agnays.paradev-boxes",
	productName,
	copyright:
		"Copyright © 2025-2026 Superset Inc. Paradev Boxes changes © 2026 Agnay Srivastava.",
	extraMetadata: {
		...baseConfig.extraMetadata,
		productName,
		main: "fork/main.cjs",
	},
	files: [
		...((baseConfig.files ?? []) as (string | FileSet)[]),
		{ from: "fork", to: "fork", filter: ["**/*"] },
	],
	afterPack: localizeMacDisplayName(displayName),

	publish: {
		provider: "github",
		owner: "AgnayS",
		repo: "paradev-boxes",
		releaseType: "prerelease",
	},

	protocols: { name: productName, schemes: [scheme] },

	mac: {
		...baseConfig.mac,
		// CSC_NAME picks a keychain identity; without one the app is ad-hoc signed.
		identity: process.env.CSC_NAME || "-",
		notarize: Boolean(process.env.APPLE_TEAM_ID),
		artifactName: `Paradev-Boxes-\${version}-\${arch}.\${ext}`,
		extendInfo: {
			...baseConfig.mac?.extendInfo,
			CFBundleName: productName,
			CFBundleDisplayName: productName,
		},
	},

	// Linux: its own executable, window class and package, so the deb and rpm
	// install beside Paradev's instead of claiming /usr/bin/superset, its
	// desktop file and its dock entry (the base config names all of them
	// "superset"). The icon is named because build/icons also holds the
	// canary and dev icons.
	linux: {
		...baseConfig.linux,
		executableName: linuxExecutable,
		icon: join(pkg.resources, "build/icons/icon.png"),
		synopsis: `${pkg.description} (Boxes)`,
		target: ["AppImage", "deb", "rpm"],
		desktop: {
			entry: {
				...baseConfig.linux?.desktop?.entry,
				Name: displayName,
				StartupWMClass: linuxExecutable,
			},
			desktopActions: {
				"new-window": {
					Name: "New Window",
					Exec: `${linuxExecutable} --new-window`,
				},
			},
		},
		artifactName: `${linuxName}-\${version}-\${arch}.\${ext}`,
	},
	deb: { ...baseConfig.deb, packageName: linuxName },
	rpm: { packageName: linuxName },

	// Windows: NSIS x64 like the base. Signed through Azure Trusted Signing
	// (electron-builder's native support, the account autojobs-electron-v3
	// used) only when its service principal and account are configured;
	// otherwise unsigned, and SmartScreen warns on first run.
	win: {
		...baseConfig.win,
		artifactName: `Paradev-Boxes-\${version}-\${arch}.\${ext}`,
		...(process.env.AZURE_CLIENT_ID && process.env.AZURE_SIGNING_ACCOUNT
			? {
					azureSignOptions: {
						publisherName: process.env.AZURE_PUBLISHER_NAME ?? "",
						endpoint: process.env.AZURE_SIGNING_ENDPOINT ?? "",
						codeSigningAccountName: process.env.AZURE_SIGNING_ACCOUNT,
						certificateProfileName: process.env.AZURE_SIGNING_PROFILE ?? "",
					},
				}
			: {}),
	},
};

export default config;
