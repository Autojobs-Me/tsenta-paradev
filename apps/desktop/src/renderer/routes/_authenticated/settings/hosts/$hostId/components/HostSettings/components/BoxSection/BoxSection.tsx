import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { useState } from "react";
import { useBoxForHost } from "renderer/hooks/useBoxForHost";
import { BOX_PROVIDER_LABELS, type BoxAction } from "renderer/lib/boxes";
import { BoxCommandDialog } from "renderer/routes/_authenticated/components/BoxCommandDialog";
import { HighlightText } from "renderer/routes/_authenticated/settings/components/HighlightText";
import { useSettingsSearchQuery } from "renderer/stores/settings-state";

interface BoxSectionProps {
	organizationId: string;
	hostId: string;
	hostName: string;
}

/** Wake, stop and delete for a host that runs on a box; nothing otherwise. */
export function BoxSection({
	organizationId,
	hostId,
	hostName,
}: BoxSectionProps) {
	const { t } = useLingui();
	const searchQuery = useSettingsSearchQuery();
	const box = useBoxForHost(organizationId, hostId);
	const [action, setAction] = useState<BoxAction | null>(null);

	if (!box) return null;
	const provider = BOX_PROVIDER_LABELS[box.provider];

	return (
		<section className="space-y-3">
			<h3 className="text-sm font-medium">
				<HighlightText
					text={t({ message: "Box", context: "sandbox host" })}
					query={searchQuery}
				/>
			</h3>
			<div className="flex items-start justify-between gap-6 rounded-md border border-border/60 px-3 py-2.5">
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">{provider}</p>
					<p className="mt-0.5 max-w-[52ch] text-xs text-muted-foreground">
						<Trans>
							Runs on a sandbox at {provider}, billed to your account there.
						</Trans>
					</p>
					<code className="mt-1 block select-text cursor-text truncate font-mono text-[12px] text-muted-foreground">
						{box.ref}
					</code>
				</div>
				<div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
					<Button
						size="sm"
						variant="outline"
						className="h-7 px-2.5 text-[13px]"
						onClick={() => setAction("start")}
					>
						<Trans>Wake</Trans>
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="h-7 px-2.5 text-[13px]"
						onClick={() => setAction("stop")}
					>
						<Trans>Stop</Trans>
					</Button>
					<Button
						size="sm"
						variant="destructive"
						className="h-7 px-2.5 text-[13px]"
						onClick={() => setAction("delete")}
					>
						<Trans>Delete box</Trans>
					</Button>
				</div>
			</div>
			{action && (
				<BoxCommandDialog
					open
					onOpenChange={(open) => {
						if (!open) setAction(null);
					}}
					action={action}
					box={box}
					organizationId={organizationId}
					hostName={hostName}
				/>
			)}
		</section>
	);
}
