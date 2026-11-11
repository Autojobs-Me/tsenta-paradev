import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { FEATURE_FLAGS } from "@superset/shared/constants";
import { createElement, type ReactNode } from "react";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
// The bundle the app uses (renderer/lib/posthog), loaded once a DOM exists.
const { default: posthogFull } = await import(
	"posthog-js/dist/module.full.no-external"
);
const { PostHogProvider, useFeatureFlagEnabled } = await import(
	"posthog-js/react"
);
const { renderHook } = await import("@testing-library/react");
const { applyForkFeatureFlags, FORK_FEATURE_FLAGS } = await import(
	"./feature-flags"
);

type Client = Parameters<typeof applyForkFeatureFlags>[0];

/** A PostHog client as a fork build has it: never initialised (no key). */
function uninitialisedClient(): Client {
	const PostHogClass = (
		posthogFull as unknown as { constructor: new () => Client }
	).constructor;
	return new PostHogClass();
}

function flagFor(client: Client, flag: string) {
	return renderHook(() => useFeatureFlagEnabled(flag), {
		wrapper: ({ children }: { children: ReactNode }) =>
			createElement(PostHogProvider, { client: client as never }, children),
	}).result.current;
}

describe("applyForkFeatureFlags", () => {
	test("a build with no PostHog key reads cloud workspaces as on, and nothing else", () => {
		const client = uninitialisedClient();
		expect(flagFor(client, FEATURE_FLAGS.CLOUD_WORKSPACES)).toBeUndefined();
		expect(applyForkFeatureFlags(client, false)).toBe(true);
		expect(flagFor(client, FEATURE_FLAGS.CLOUD_WORKSPACES)).toBe(true);
		// Flags the fork does not answer stay unanswered, as before.
		expect(flagFor(client, FEATURE_FLAGS.PARADEV_SHELL)).toBeUndefined();
		expect(flagFor(client, FEATURE_FLAGS.PLUGINS)).toBeUndefined();
		// The client stays uninitialised: nothing is sent or stored.
		expect((client as { __loaded?: boolean }).__loaded).toBeFalsy();
	});

	test("leaves a build with a PostHog key to PostHog", () => {
		const client = uninitialisedClient();
		expect(applyForkFeatureFlags(client, true)).toBe(false);
		expect(client.config.bootstrap?.featureFlags).toBeUndefined();
		expect(flagFor(client, FEATURE_FLAGS.CLOUD_WORKSPACES)).toBeUndefined();
	});

	test("keeps whatever the bootstrap already held", () => {
		const client = uninitialisedClient();
		client.config.bootstrap = {
			distinctID: "someone",
			featureFlags: { "some-flag": "variant" },
		};
		applyForkFeatureFlags(client, false);
		expect(client.config.bootstrap).toEqual({
			distinctID: "someone",
			featureFlags: { "some-flag": "variant", ...FORK_FEATURE_FLAGS },
		});
	});
});
