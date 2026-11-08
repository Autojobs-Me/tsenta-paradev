/**
 * A box is a sandbox at Daytona, E2B or Blaxel that runs Paradev's
 * host-service in local mode, so it shows up in the app as an ordinary host
 * and is reached through the relay like any machine someone owns.
 */
export type ProviderName = "daytona" | "e2b" | "blaxel";

export const PROVIDERS: ProviderName[] = ["daytona", "e2b", "blaxel"];

/** Labels every box carries, so list and delete never have to wake it. */
export const LABELS = {
	box: "paradev-box",
	org: "paradev-org",
	host: "paradev-host",
	machineId: "paradev-machine-id",
} as const;

export interface Box {
	provider: ProviderName;
	id: string;
	name: string;
	/** The provider's own state word (started, stopped, paused, standby...). */
	state: string;
	running: boolean;
	region?: string;
	labels: Record<string, string>;
}

export interface CreateBoxOptions {
	name: string;
	labels: Record<string, string>;
	cpu: number;
	memoryGb: number;
	diskGb: number;
	/** Minutes without activity before the provider stops or pauses the box; 0 = never. */
	idleMinutes: number;
	region?: string;
	/** Provider-specific image, snapshot or template name. */
	image?: string;
}

/**
 * One box as `boxes list --json --providers-only` prints it: the provider's
 * view only, read without Paradev's API. The desktop app parses this shape
 * (apps/desktop/src/lib/trpc/routers/boxes/list-boxes.ts).
 */
export interface BoxStatus {
	provider: ProviderName;
	id: string;
	/** `provider:id`, what every boxes command accepts. */
	ref: string;
	name: string;
	state: string;
	running: boolean;
	region: string | null;
	hostId: string | null;
	organizationId: string | null;
}

export interface ExecResult {
	exitCode: number;
	output: string;
}

export interface BoxProvider {
	readonly name: ProviderName;
	/** The home of the user exec runs as (absolute, since host-service does not expand ~). */
	readonly homeDir: string;
	create(options: CreateBoxOptions): Promise<Box>;
	get(id: string): Promise<Box | null>;
	/** Boxes this harness created (carrying the paradev-box label). */
	list(signal?: AbortSignal): Promise<Box[]>;
	/** Run a POSIX sh script as the box's default user and wait for it. */
	exec(
		id: string,
		script: string,
		env?: Record<string, string>,
	): Promise<ExecResult>;
	/** Start a stopped box or resume a paused one; resolves once it can exec. */
	start(id: string): Promise<void>;
	/**
	 * Keeps the box from idling out while it is in use. Providers judge
	 * activity by inbound traffic, and a host's traffic arrives over its
	 * outbound relay tunnel, so without this a box in use stops or freezes.
	 */
	keepAwake?(box: Box): Promise<void>;
	stop(id: string): Promise<void>;
	remove(id: string): Promise<void>;
}
