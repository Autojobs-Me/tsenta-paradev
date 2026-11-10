import { msg } from "@lingui/core/macro";
import {
	ClipboardList,
	Clock,
	FileText,
	GitPullRequest,
	Puzzle,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { registerProvider } from "renderer/commandPalette/core/registry";
import type {
	Command,
	CommandProvider,
} from "renderer/commandPalette/core/types";
import type { useDashboardNavigation } from "renderer/routes/_authenticated/_dashboard/hooks/useDashboardNavigation";

type DashboardNavigation = ReturnType<typeof useDashboardNavigation>;

const PROVIDER_ID = "tsenta.navigation";

/**
 * The destinations Conductor's nav block leaves out (shell-sidebar spec
 * §3.3 keeps Home, Create and Search), as "Go to" entries in the command
 * palette's Navigation group, so they stay one ⌘K away. Each runs Paradev's
 * own sidebar action (useDashboardNavigation), so the paywall checks and the
 * filters a list reopens with are exactly the old rows'. Usage needs no entry:
 * Paradev's palette already has one.
 *
 * Registered while the Conductor header is mounted, which under the skin is
 * whenever the dashboard is (a collapsed sidebar is hidden, not unmounted).
 */
export function useConductorNavigationCommands(
	navigation: DashboardNavigation,
	{ isPluginsEnabled }: { isPluginsEnabled: boolean },
): void {
	const latest = useRef(navigation);
	useLayoutEffect(() => {
		latest.current = navigation;
	});

	useEffect(() => {
		const commands: Command[] = [
			{
				id: "tsenta.nav.automations",
				title: msg({ message: "Go to Automations" }),
				section: "navigation",
				icon: Clock,
				keywords: ["automations", "schedule", "cron", "runs"],
				run: () => latest.current.openAutomations(),
			},
			{
				id: "tsenta.nav.tasks",
				title: msg({ message: "Go to Tasks" }),
				section: "navigation",
				icon: ClipboardList,
				keywords: ["tasks", "issues", "linear"],
				run: () => latest.current.openTasks(),
			},
			{
				id: "tsenta.nav.pullRequests",
				title: msg({ message: "Go to Pull requests" }),
				section: "navigation",
				icon: GitPullRequest,
				keywords: ["pull requests", "pr", "review", "github"],
				run: () => {
					void latest.current.openPullRequests();
				},
			},
			{
				id: "tsenta.nav.pages",
				title: msg({ message: "Go to Pages" }),
				section: "navigation",
				icon: FileText,
				keywords: ["pages", "docs", "notes"],
				run: () => latest.current.openPages(),
			},
		];
		if (isPluginsEnabled) {
			commands.push({
				id: "tsenta.nav.plugins",
				title: msg({ message: "Go to Plugins" }),
				section: "navigation",
				icon: Puzzle,
				keywords: ["plugins", "extensions"],
				run: () => latest.current.openPlugins(),
			});
		}
		const provider: CommandProvider = {
			id: PROVIDER_ID,
			provide: () => commands,
		};
		return registerProvider(provider);
	}, [isPluginsEnabled]);
}
