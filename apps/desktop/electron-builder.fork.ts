/**
 * Electron Builder configuration for the Paradev Boxes fork.
 *
 * Extends the base config the way electron-builder.canary.ts does, with its
 * own identity so it installs beside Paradev and Paradev Canary: bundle id,
 * product name (which names userData, logs and the single-instance lock),
 * URL scheme, and release feed. Build with SUPERSET_WORKSPACE_NAME=boxes so
 * the runtime scheme (superset-boxes) and app home (~/.paradev-boxes) match;
 * scripts/fork/build-mac.sh sets everything.
 */

import type { Configuration } from "electron-builder";
import baseConfig, { displayName as baseDisplayName } from "./electron-builder";
import pkg from "./package.json";
import { localizeMacDisplayName } from "./scripts/localize-display-name";

// "Superset <X>" displays as "<DESKTOP_DISPLAY_NAME> <X>" (app-display-name.ts).
const productName = "Superset Boxes";
const displayName = `${baseDisplayName} Boxes`;
const scheme = "superset-boxes";

const config: Configuration = {
	...baseConfig,
	appId: "io.github.agnays.paradev-boxes",
	productName,
	copyright:
		"Copyright © 2025-2026 Superset Inc. Paradev Boxes changes © 2026 Agnay Srivastava.",
	extraMetadata: { ...baseConfig.extraMetadata, productName },
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

	linux: {
		...baseConfig.linux,
		synopsis: `${pkg.description} (Boxes)`,
		desktop: {
			...baseConfig.linux?.desktop,
			entry: { ...baseConfig.linux?.desktop?.entry, Name: displayName },
		},
		artifactName: `paradev-boxes-\${version}-\${arch}.\${ext}`,
	},
};

export default config;
