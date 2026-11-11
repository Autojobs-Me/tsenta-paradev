import { FEATURE_FLAGS } from "@superset/shared/constants";
import type { PostHog } from "posthog-js/react";

/**
 * Feature flags a fork build answers itself.
 *
 * Fork builds carry no PostHog key (scripts/fork/build.sh and dev.sh unset
 * it, so no telemetry leaves the app), so PostHog never loads and every
 * `useFeatureFlagEnabled()` answers undefined, which Paradev reads as off.
 * Paradev's own build gets these flags from PostHog. Without them the fork
 * hid what Paradev shows the same account, most visibly every cloud
 * workspace: useCloudWorkspaces never fetched the list, so no sidebar row,
 * folder member or pin came from it, with the Conductor skin on or off.
 *
 * Only flags the server also enforces belong here: the client flag only
 * shows the feature, and the API still refuses an account without access
 * (cloud-workspaces: `assertCloudAccess`).
 */
export const FORK_FEATURE_FLAGS: Readonly<Record<string, boolean>> = {
	[FEATURE_FLAGS.CLOUD_WORKSPACES]: true,
};

/**
 * Hands the fork's flags to posthog-js/react without starting PostHog. Its
 * PostHogProvider passes the client's `config.bootstrap` to the hooks, and
 * `useFeatureFlagEnabled` answers from it until flags load, which with no key
 * is never. Nothing is sent or stored. A build with a key (Paradev's own) is
 * left alone, as PostHog answers there. Returns whether it applied.
 */
export function applyForkFeatureFlags(
	client: Pick<PostHog, "config">,
	hasPostHogKey: boolean,
): boolean {
	if (hasPostHogKey) return false;
	const bootstrap = client.config.bootstrap ?? {};
	client.config.bootstrap = {
		...bootstrap,
		featureFlags: { ...bootstrap.featureFlags, ...FORK_FEATURE_FLAGS },
	};
	return true;
}
