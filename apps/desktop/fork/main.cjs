/**
 * Paradev Boxes' entry point (electron-builder.fork.ts points package.json's
 * main here). Fork-owned; runs before Paradev's main bundle.
 *
 * 1. Shares Paradev's home. app-environment.ts gives a build with a
 *    workspace name (boxes) its own ~/.paradev-boxes unless SUPERSET_HOME_DIR
 *    is set, and treats ~/.paradev as the default home when it is. So this
 *    app uses Paradev's projects, workspaces, sign-in, host-service and
 *    terminals; the workspace name only picks the URL scheme.
 * 2. Writes `paradev-boxes` into <home>/bin (first on PATH in Paradev
 *    terminals), running this app's bundled CLI as `superset boxes ...`.
 *    Both apps rewrite the shared `superset` shim at every launch, and
 *    Paradev's CLI has no boxes command, so box wake commands call this
 *    launcher instead.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

if (!process.env.SUPERSET_HOME_DIR?.trim()) {
	process.env.SUPERSET_HOME_DIR = path.join(os.homedir(), ".paradev");
}

require("../dist/main/index.js");

// Only once the bundle has loaded: loading it moves a pre-rename ~/.superset
// to ~/.paradev, which fails if ~/.paradev already has a bin/ of its own,
// and leaves SUPERSET_HOME_DIR naming the home actually in use.
try {
	const win = process.platform === "win32";
	const cli = path.join(
		process.resourcesPath,
		"resources",
		"bin",
		win ? "superset.exe" : "superset",
	);
	if (fs.existsSync(cli)) {
		const bin = path.join(process.env.SUPERSET_HOME_DIR, "bin");
		const launcher = path.join(
			bin,
			win ? "paradev-boxes.cmd" : "paradev-boxes",
		);
		// Only a file carrying this line is ours to rewrite; anything else at
		// that path (a user's own script, another tool's) is left alone.
		const marker = "Written by Paradev Boxes at launch.";
		const contents = win
			? `@echo off\r\nrem ${marker}\r\n"${cli.replaceAll('"', '""')}" boxes %*\r\n`
			: `#!/bin/sh\n# ${marker}\nexec '${cli.replaceAll("'", `'"'"'`)}' boxes "$@"\n`;
		let current = null;
		try {
			current = fs.readFileSync(launcher, "utf8");
		} catch (error) {
			if (error?.code !== "ENOENT") throw error;
		}
		if (current !== null && !current.includes(marker)) {
			console.warn(
				`[paradev-boxes] Left ${launcher} as it is: Paradev Boxes did not write it, so box commands run whatever it is.`,
			);
		} else if (current !== contents) {
			fs.mkdirSync(bin, { recursive: true });
			fs.writeFileSync(launcher, contents, { mode: 0o755 });
			fs.chmodSync(launcher, 0o755);
		}
	}
} catch (error) {
	console.warn(
		"[paradev-boxes] Could not write the paradev-boxes launcher:",
		error,
	);
}
