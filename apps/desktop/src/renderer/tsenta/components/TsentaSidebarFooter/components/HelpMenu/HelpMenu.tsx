import { Trans, useLingui } from "@lingui/react/macro";
import { isPaidPlanTier } from "@superset/shared/billing";
import { COMPANY } from "@superset/shared/constants";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { useNavigate } from "@tanstack/react-router";
import {
	ArrowUpRight,
	BookOpen,
	CircleQuestionMark,
	Keyboard,
	MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { useCurrentPlan } from "renderer/hooks/useCurrentPlan";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { SubmitPromptDialog } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/OrganizationDropdown/components/SubmitPromptDialog";
import { useGettingStartedStore } from "renderer/stores/getting-started";
import { ShortcutHint } from "renderer/tsenta/components/ShortcutHint";

/** Conductor's help menu row (shell-sidebar spec §3.5). */
const ITEM_CLASS = "gap-2 px-2.5 py-2";

function ExternalMark() {
	return (
		<ArrowUpRight aria-hidden="true" className="size-3 text-muted-foreground" />
	);
}

/**
 * The footer's "?" menu (shell-sidebar spec §3.5, navigation spec §8.6), in
 * Conductor's layout: a few headed rows with their related links indented
 * under them. Filled with what Paradev's own Help submenu offers (keyboard
 * shortcuts, docs, the Pro guide, changelog, issues, Discord, submit a
 * prompt, support mail), so nothing new is promised.
 */
export function HelpMenu() {
	const { t } = useLingui();
	const navigate = useNavigate();
	const { plan, isReady } = useCurrentPlan();
	const openUrl = electronTrpc.external.openUrl.useMutation();
	const [submitPromptOpen, setSubmitPromptOpen] = useState(false);
	const openExternal = (url: string) => openUrl.mutate(url);

	return (
		<>
			<DropdownMenu>
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								aria-label={t({ message: "Help" })}
								className="flex items-center justify-center rounded-sm text-sidebar-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-foreground"
							>
								<CircleQuestionMark className="size-4" strokeWidth={1.5} />
							</button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent side="top">
						<Trans>Help</Trans>
					</TooltipContent>
				</Tooltip>
				<DropdownMenuContent
					side="top"
					align="start"
					sideOffset={4}
					collisionPadding={8}
					className="w-[340px]"
				>
					<DropdownMenuItem
						className={ITEM_CLASS}
						onSelect={() => navigate({ to: "/settings/keyboard" })}
					>
						<Keyboard className="size-4" />
						<Trans>Keyboard shortcuts</Trans>
						<ShortcutHint id="SHOW_HOTKEYS" className="ml-auto" />
					</DropdownMenuItem>
					<DropdownMenuItem
						className={ITEM_CLASS}
						onSelect={() => openExternal(COMPANY.DOCS_URL)}
					>
						<BookOpen className="size-4" />
						<Trans>Docs</Trans>
						<ExternalMark />
					</DropdownMenuItem>
					{isReady && isPaidPlanTier(plan) && (
						<DropdownMenuItem
							className={ITEM_CLASS}
							onSelect={() => useGettingStartedStore.getState().show()}
						>
							<span className="ml-6">
								<Trans>Get the best out of Pro</Trans>
							</span>
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						className={ITEM_CLASS}
						onSelect={() => openExternal(COMPANY.CHANGELOG_URL)}
					>
						<span className="ml-6">
							<Trans>Changelog</Trans>
						</span>
						<ExternalMark />
					</DropdownMenuItem>
					<DropdownMenuItem
						className={ITEM_CLASS}
						onSelect={() => openExternal(COMPANY.REPORT_ISSUE_URL)}
					>
						<MessageSquare className="size-4" />
						<Trans>Feedback</Trans>
						<ExternalMark />
					</DropdownMenuItem>
					<DropdownMenuItem
						className={ITEM_CLASS}
						onSelect={() => openExternal(COMPANY.DISCORD_URL)}
					>
						<span className="ml-6">
							<Trans>Discord</Trans>
						</span>
						<ExternalMark />
					</DropdownMenuItem>
					<DropdownMenuItem
						className={ITEM_CLASS}
						onSelect={() => setSubmitPromptOpen(true)}
					>
						<span className="ml-6">
							<Trans>Submit a prompt</Trans>
						</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						className={ITEM_CLASS}
						onSelect={() => openExternal(COMPANY.MAIL_TO)}
					>
						<span className="ml-6">
							<Trans>Contact support</Trans>
						</span>
						<ExternalMark />
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<SubmitPromptDialog
				open={submitPromptOpen}
				onOpenChange={setSubmitPromptOpen}
			/>
		</>
	);
}
