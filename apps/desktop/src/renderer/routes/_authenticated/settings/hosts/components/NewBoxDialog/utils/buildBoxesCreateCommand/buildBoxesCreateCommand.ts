import { quoteShellToken } from "renderer/lib/argv";
import {
	BOXES_LAUNCHER,
	type BoxProvider,
	isBoxProvider,
	withBoxesPreamble,
} from "renderer/lib/boxes";

export interface BoxSize {
	id: string;
	cpu: number;
	memoryGb: number;
}

export const BOX_SIZES: readonly BoxSize[] = [
	{ id: "small", cpu: 2, memoryGb: 4 },
	{ id: "medium", cpu: 4, memoryGb: 8 },
	{ id: "large", cpu: 8, memoryGb: 16 },
];

export const DEFAULT_BOX_SIZE_ID = "medium";

export interface BoxesCreateOptions {
	provider: BoxProvider;
	name?: string;
	cpu: number;
	memoryGb: number;
	diskGb: number;
	/** 0 keeps the box running until someone stops it. */
	idleMinutes: number;
	region?: string;
	/** Projects (ids on this device) to clone onto the box once it is online. */
	projectIds?: readonly string[];
	/** Copy this device's gh login and git name and email to the box. */
	github?: boolean;
}

const MAX_WHOLE_NUMBER = 1_000_000;

/** Reads a form field as a whole number of at least `min`, or null. */
export function parseWholeNumber(value: string, min: number): number | null {
	const trimmed = value.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	const parsed = Number(trimmed);
	return isWholeNumber(parsed, min) ? parsed : null;
}

function isWholeNumber(value: number, min: number): boolean {
	return (
		Number.isSafeInteger(value) && value >= min && value <= MAX_WHOLE_NUMBER
	);
}

/**
 * Box names and regions go to the provider as they are, and a leading dash
 * would read as a CLI option, so both keep to a conservative alphabet.
 */
const BOX_WORD = /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/;

export function isValidBoxName(name: string): boolean {
	return BOX_WORD.test(name);
}

export function isValidBoxRegion(region: string): boolean {
	return BOX_WORD.test(region);
}

/** Project ids are UUIDs; anything that could read as an option is refused. */
const PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function isValidProjectId(projectId: string): boolean {
	return PROJECT_ID.test(projectId);
}

/** The shell command the New box dialog runs. */
export function buildBoxesCreateCommand(
	options: BoxesCreateOptions,
	organizationId: string,
): string {
	if (!isBoxProvider(options.provider)) {
		throw new Error(`Unknown box provider: ${options.provider}`);
	}
	if (!isWholeNumber(options.cpu, 1)) throw new Error("Invalid vCPU count");
	if (!isWholeNumber(options.memoryGb, 1)) throw new Error("Invalid memory");
	if (!isWholeNumber(options.diskGb, 1)) throw new Error("Invalid disk size");
	if (!isWholeNumber(options.idleMinutes, 0)) {
		throw new Error("Invalid idle minutes");
	}
	if (options.name !== undefined && !isValidBoxName(options.name)) {
		throw new Error("Invalid box name");
	}
	if (options.region !== undefined && !isValidBoxRegion(options.region)) {
		throw new Error("Invalid region");
	}
	const projectIds = [...new Set(options.projectIds ?? [])];
	if (!projectIds.every(isValidProjectId)) {
		throw new Error("Invalid project id");
	}

	const args = [BOXES_LAUNCHER, "create"];
	if (options.name !== undefined) args.push(quoteShellToken(options.name));
	args.push(
		"--provider",
		quoteShellToken(options.provider),
		"--cpu",
		quoteShellToken(String(options.cpu)),
		"--memory",
		quoteShellToken(String(options.memoryGb)),
		"--disk",
		quoteShellToken(String(options.diskGb)),
		"--idle",
		quoteShellToken(String(options.idleMinutes)),
	);
	if (options.region !== undefined) {
		args.push("--region", quoteShellToken(options.region));
	}
	args.push("--org", quoteShellToken(organizationId));
	for (const projectId of projectIds) {
		args.push("--project", quoteShellToken(projectId));
	}
	if (options.github) args.push("--github");
	return withBoxesPreamble(organizationId, args.join(" "));
}
