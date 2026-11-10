import { useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { UpdatesPill } from "renderer/components/UpdatesPill";
import { HotkeyLabel } from "renderer/hotkeys";
import { OrganizationDropdown } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/OrganizationDropdown";
import { PlanBadge } from "./components/PlanBadge";

/**
 * Conductor's sidebar footer (shell-sidebar spec §3.5), in place of the
 * expanded sidebar's bottom bar under the Conductor skin: the organization
 * and plan on the left; updates and settings on the right, 20px apart. The
 * organization is still Paradev's menu (switching, members, new window,
 * notifications, help, log out); sidebar.css draws its trigger as
 * Conductor's muted name.
 */
export function TsentaSidebarFooter() {
	const { t } = useLingui();
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const isSettingsOpen = !!matchRoute({ to: "/settings", fuzzy: true });

	return (
		<div
			data-tsenta="sidebar-footer"
			className="flex shrink-0 items-center justify-between gap-3 border-t border-sidebar-border px-4 py-3"
		>
			<span
				data-tsenta="sidebar-footer-org"
				className="flex min-w-0 items-center gap-1.5"
			>
				<OrganizationDropdown variant="expanded" />
				<PlanBadge />
			</span>
			<div className="ml-auto flex shrink-0 items-center gap-5">
				<UpdatesPill />
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-label={t({ message: "Settings" })}
							aria-current={isSettingsOpen ? "page" : undefined}
							onClick={() => navigate({ to: "/settings/account" })}
							className={cn(
								"flex items-center justify-center rounded-sm transition-colors hover:text-foreground",
								isSettingsOpen
									? "text-foreground"
									: "text-sidebar-muted-foreground",
							)}
						>
							<Settings className="size-4" strokeWidth={1.5} />
						</button>
					</TooltipTrigger>
					<TooltipContent side="top">
						<HotkeyLabel
							label={t({ message: "Settings" })}
							id="OPEN_SETTINGS"
						/>
					</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
