import { useLingui } from "@lingui/react/macro";
import type { Tab } from "@superset/panes";
import { WaveSpinner } from "@superset/ui/atoms/WaveSpinner";
import { CircleAlert, MessageCircleQuestionMark } from "lucide-react";
import { useV2SourcesNotificationStatus } from "renderer/hooks/host-service/useV2NotificationStatus";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";
import { getV2NotificationSourcesForTab } from "renderer/stores/v2-notifications";

/**
 * A tab's status ahead of its title, as Conductor marks its chat tabs
 * (composer spec §10, its tka): a question bubble while the agent waits for
 * input, a filled dot once it has finished and the tab is unread, a spinner
 * while it works. The tan is --unread. Conductor has no failed tab; Paradev
 * does, so a failed agent shows the sidebar's alert in the destructive
 * colour. A tab with nothing to say shows nothing.
 *
 * From the same sources as the dot Paradev puts at the tab's trailing end
 * (V2NotificationStatusIndicator), which the skin drops for this.
 */
export function TabStatusIcon<TData>({ tab }: { tab: Tab<TData> }) {
	const { t } = useLingui();
	const { workspace } = useWorkspace();
	const status = useV2SourcesNotificationStatus(
		workspace.id,
		getV2NotificationSourcesForTab(tab),
	);
	switch (status) {
		case "working":
			return (
				<span
					role="img"
					aria-label={t({ message: "Agent working" })}
					className="flex size-3 items-center justify-center text-muted-foreground"
				>
					<WaveSpinner />
				</span>
			);
		case "permission":
			return (
				<MessageCircleQuestionMark
					role="img"
					aria-label={t({ message: "Needs input" })}
					className="size-3 text-unread"
				/>
			);
		case "review":
			return (
				<span
					role="img"
					aria-label={t({ message: "Unread" })}
					className="flex size-3 items-center justify-center"
				>
					<span className="size-2 rounded-full bg-unread" />
				</span>
			);
		case "failed":
			return (
				<CircleAlert
					role="img"
					aria-label={t({ message: "Agent failed" })}
					className="size-3 text-destructive"
				/>
			);
		default:
			return null;
	}
}
