import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import * as p from "@clack/prompts";
import { CLIError } from "@superset/cli-framework";

/**
 * Provider keys come from the environment, then from this file (dotenv
 * format, keep it mode 0600). The file exists so a box's wake command, run
 * later by the app or `superset hosts wake`, finds the keys without the
 * caller having to export them.
 */
export const CREDENTIALS_PATH =
	process.env.PARADEV_BOXES_ENV ||
	join(homedir(), ".config", "paradev-boxes", "providers.env");

let cached: Record<string, string> | null = null;

function readFile(): Record<string, string> {
	if (cached) return cached;
	cached = {};
	let text = "";
	try {
		text = readFileSync(CREDENTIALS_PATH, "utf8");
	} catch {
		return cached;
	}
	for (const line of text.split("\n")) {
		const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (!match) continue;
		cached[match[1] as string] = (match[2] as string).replace(
			/^(['"])(.*)\1$/,
			"$2",
		);
	}
	return cached;
}

export function credential(name: string): string | undefined {
	return process.env[name] || readFile()[name] || undefined;
}

/**
 * A credential the provider cannot work without. In a terminal, asks for it
 * once (hidden) and saves it to the credentials file, so the app's "Create a
 * box" dialog needs no key field of its own.
 */
export async function requireCredential(
	name: string,
	hint: string,
): Promise<string> {
	const existing = credential(name);
	if (existing) return existing;
	if (!process.stdin.isTTY) {
		throw new CLIError(
			`${name} is not set`,
			`${hint} Then set ${name} in the environment or in ${CREDENTIALS_PATH}.`,
		);
	}
	const value = await p.password({ message: `${name} (${hint})` });
	if (p.isCancel(value) || !value.trim()) throw new CLIError("Cancelled");
	mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true, mode: 0o700 });
	const line = `${name}=${value.trim()}\n`;
	let text = "";
	try {
		text = readFileSync(CREDENTIALS_PATH, "utf8");
	} catch {}
	writeFileSync(
		CREDENTIALS_PATH,
		text && !text.endsWith("\n") ? `${text}\n${line}` : text + line,
		{ mode: 0o600 },
	);
	chmodSync(CREDENTIALS_PATH, 0o600);
	readFile()[name] = value.trim();
	return value.trim();
}
