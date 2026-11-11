/**
 * @tanstack/react-router with a route-aware useMatchRoute: electron.vite.config.ts
 * aliases the package here for the renderer. React Compiler (on since Paradev's
 * Vite 8 upgrade) caches a `matchRoute(...)` made during render until the function
 * itself changes, and TanStack's never does, so every render-time match froze at
 * the first route: the open cloud workspace never woke, and active rows went stale.
 * This useMatchRoute is a new function each time the location changes.
 */
import {
	useMatchRoute as useRouterMatchRoute,
	useRouterState,
} from "@tanstack/react-router-original";
import { useCallback } from "react";

export * from "@tanstack/react-router-original";

export const useMatchRoute = (() => {
	"use no memo";
	const matchRoute = useRouterMatchRoute();
	const href = useRouterState({ select: (state) => state.location.href });
	// biome-ignore lint/correctness/useExhaustiveDependencies: href renews the function on each location.
	return useCallback(
		(...args: Parameters<typeof matchRoute>) => matchRoute(...args),
		[matchRoute, href],
	);
}) as typeof useRouterMatchRoute;
