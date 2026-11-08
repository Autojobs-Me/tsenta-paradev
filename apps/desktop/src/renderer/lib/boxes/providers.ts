/** Where a box can run. Mirrors the providers `superset boxes` supports. */
export const BOX_PROVIDERS = ["daytona", "e2b", "blaxel"] as const;

export type BoxProvider = (typeof BOX_PROVIDERS)[number];

/** Brand names, which the glossary keeps untranslated. */
export const BOX_PROVIDER_LABELS: Record<BoxProvider, string> = {
	daytona: "Daytona",
	e2b: "E2B",
	blaxel: "Blaxel",
};

export function isBoxProvider(value: string): value is BoxProvider {
	return (BOX_PROVIDERS as readonly string[]).includes(value);
}

/** A box's id at its provider: the only characters a wake command may carry. */
export const BOX_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/** A box as the app knows it: its provider, its id there, and `provider:id`. */
export interface Box {
	provider: BoxProvider;
	id: string;
	ref: string;
}
