import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { useBoxForHost } from "renderer/hooks/useBoxForHost";
import {
	BOX_PROVIDER_LABELS,
	type BoxAction,
	boxStateLabel,
} from "renderer/lib/boxes";
import { HighlightText } from "renderer/routes/_authenticated/settings/components/HighlightText";
import { useBoxDialogStore } from "renderer/stores/box-dialog";
import { useSettingsSearchQuery } from "renderer/stores/settings-state";

interface BoxSectionProps {
	organizationId: string;
	hostId: string;
	hostName: string;
	/** The host's relay presence, as the rest of the page shows it. */
	isOnline: boolean;
}

/**
 * Wake, stop and delete for a host that runs on a box; nothing otherwise.
 * Wake is off while the host is online. Stop is off only while the host is
 * offline and its provider reports the box not running. Delete is always on.
 */
export function BoxSection({
	organizationId,
	hostId,
	hostName,
	isOnline,
}: BoxSectionProps) {
	const { t, i18n } = useLingui();
	const searchQuery = useSettingsSearchQuery();
	const box = useBoxForHost(organizationId, hostId, { providerState: true });
	const openBoxDialog = useBoxDialogStore((state) => state.open);

	if (!box) return null;
	const provider = BOX_PROVIDER_LABELS[box.provider];
	const stateLabel = boxStateLabel(box.providerState);
	// An online host's box is running, whatever a stale provider answer says.
	// A box can also run while its host is offline (the host crashed or is
	// still starting), and stopping it then is what ends the bill. When this
	// machine can't read the provider (no key here), the Stop dialog asks.
	const canStop = isOnline || box.running !== false;
	const run = (action: BoxAction) =>
		openBoxDialog({ box, organizationId, hostName, action });

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
					{(stateLabel || box.region) && (
						<dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
							{stateLabel && (
								<div className="flex gap-1.5">
									<dt className="text-muted-foreground">
										<Trans>State</Trans>
									</dt>
									<dd className="select-text cursor-text">
										{i18n._(stateLabel)}
									</dd>
								</div>
							)}
							{box.region && (
								<div className="flex gap-1.5">
									<dt className="text-muted-foreground">
										<Trans>Region</Trans>
									</dt>
									<dd className="select-text cursor-text">{box.region}</dd>
								</div>
							)}
						</dl>
					)}
				</div>
				<div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
					<Button
						size="sm"
						variant="outline"
						className="h-7 px-2.5 text-[13px]"
						disabled={isOnline}
						onClick={() => run("start")}
					>
						<Trans>Wake</Trans>
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="h-7 px-2.5 text-[13px]"
						disabled={!canStop}
						onClick={() => run("stop")}
					>
						<Trans>Stop</Trans>
					</Button>
					<Button
						size="sm"
						variant="destructive"
						className="h-7 px-2.5 text-[13px]"
						onClick={() => run("delete")}
					>
						<Trans>Delete box</Trans>
					</Button>
				</div>
			</div>
		</section>
	);
}
