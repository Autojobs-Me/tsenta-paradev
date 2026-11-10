import { useLingui } from "@lingui/react/macro";
import { WaveSpinner } from "@superset/ui/atoms/WaveSpinner";
import { cn } from "@superset/ui/utils";
import type { ReactNode } from "react";
import { useSidebarWorkspaceStatus } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarWorkspaceStatusProvider";
import type { DashboardSidebarWorkspace } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/types";
import { TsentaWorkspaceStatusMatrix } from "renderer/tsenta/components/TsentaWorkspaceStatusMatrix";
import type { ActivePaneStatus } from "shared/tabs-types";
import { pickConductorMatrixStatus } from "./pickConductorMatrixStatus";
import {
	type ConductorStatusInput,
	type ConductorWorkspaceStatus,
	pickConductorStatus,
} from "./pickConductorStatus";

type GlyphStatus = Exclude<
	ConductorWorkspaceStatus,
	"setting-up" | "working" | "session"
>;

/**
 * Conductor's status glyphs, node data copied from its status map
 * (shell-sidebar spec §4.7): 24px lucide-style outlines drawn at a 2px
 * stroke, and the octicon merge-queue glyph filled on a 16px grid. The
 * closed pull request, which Conductor never shows, is lucide's
 * git-pull-request-closed.
 */
const GLYPHS: Record<
	GlyphStatus,
	{ viewBox?: string; filled?: boolean; nodes: ReactNode }
> = {
	failed: {
		nodes: (
			<>
				<circle cx={12} cy={12} r={10} />
				<line x1={12} x2={12} y1={8} y2={12} />
				<line x1={12} x2={12.01} y1={16} y2={16} />
			</>
		),
	},
	"needs-user-input": {
		nodes: (
			<>
				<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
				<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
				<path d="M12 17h.01" />
			</>
		),
	},
	merged: {
		nodes: (
			<>
				<circle cx={18} cy={18} r={3} />
				<circle cx={6} cy={6} r={3} />
				<path d="M6 21V9a9 9 0 0 0 9 9" />
			</>
		),
	},
	"merge-queued": {
		viewBox: "0 0 16 16",
		filled: true,
		nodes: (
			<path d="M3.75 4.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM3 7.75a.75.75 0 0 1 1.5 0v2.878a2.251 2.251 0 1 1-1.5 0Zm.75 5.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm5-7.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm5.75 2.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-1.5 0a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
		),
	},
	"ready-to-merge": {
		nodes: (
			<>
				<circle cx={5} cy={6} r={3} />
				<path d="M5 9v12" />
				<circle cx={19} cy={18} r={3} />
				<path d="m15 9-3-3 3-3" />
				<path d="M12 6h5a2 2 0 0 1 2 2v7" />
			</>
		),
	},
	"draft-pr": {
		nodes: (
			<>
				<circle cx={18} cy={18} r={3} />
				<circle cx={6} cy={6} r={3} />
				<path d="M18 6V5" />
				<path d="M18 11v-1" />
				<line x1={6} x2={6} y1={9} y2={21} />
			</>
		),
	},
	"checks-failing": {
		nodes: (
			<>
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</>
		),
	},
	"checks-pending": {
		nodes: (
			<>
				<circle cx={18} cy={18} r={3} />
				<circle cx={6} cy={6} r={3} />
				<path d="M13 6h3a2 2 0 0 1 2 2v7" />
				<line x1={6} x2={6} y1={9} y2={21} />
			</>
		),
	},
	"open-pr": {
		nodes: (
			<>
				<circle cx={18} cy={18} r={3} />
				<circle cx={6} cy={6} r={3} />
				<path d="M13 6h3a2 2 0 0 1 2 2v7" />
				<line x1={6} x2={6} y1={9} y2={21} />
			</>
		),
	},
	"closed-pr": {
		nodes: (
			<>
				<circle cx={6} cy={6} r={3} />
				<path d="M6 9v12" />
				<path d="m21 3-6 6" />
				<path d="m21 9-6-6" />
				<path d="M18 11.5V15" />
				<circle cx={18} cy={18} r={3} />
			</>
		),
	},
	local: {
		nodes: (
			<>
				<path d="M10 16h.01" />
				<path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
				<path d="M21.946 12.013H2.054" />
				<path d="M6 16h.01" />
			</>
		),
	},
	branch: {
		nodes: (
			<>
				<path d="M15 6a9 9 0 0 0-9 9V3" />
				<circle cx={18} cy={6} r={3} />
				<circle cx={6} cy={18} r={3} />
			</>
		),
	},
};

/** Conductor's status colours; everything else is the sidebar's muted. */
const COLOR: Partial<Record<ConductorWorkspaceStatus, string>> = {
	failed: "text-destructive",
	"checks-failing": "text-destructive",
	merged: "text-purple-500",
	"merge-queued": "text-status-in-progress",
	"ready-to-merge": "text-git-green",
	"checks-pending": "text-checks-pending",
};

interface TsentaWorkspaceStatusGlyphProps {
	workspace: DashboardSidebarWorkspace;
	workspaceStatus: ActivePaneStatus | null;
	isCreatePending: boolean;
}

/**
 * The sidebar row's status icon under the Conductor skin, in place of
 * DashboardSidebarWorkspaceLeadIndicator, from the same Paradev sources
 * (sandbox, agent and pull request state, and the row's unread mark):
 * Conductor's workspace status matrix, which Conductor shows for cloud and
 * team workspaces (shell-sidebar spec §4.7). An agent waiting on permission
 * counts as unread, as in Conductor.
 *
 * The one state the matrix cannot show, a closed pull request, keeps the
 * fork's step-7 glyph (Conductor's glyphs and colours at 14px). Those
 * carry data-keep-stroke: Conductor draws them at 2px, outside its 1px icon
 * rule (icons.css).
 */
export function TsentaWorkspaceStatusGlyph({
	workspace,
	workspaceStatus,
	isCreatePending,
}: TsentaWorkspaceStatusGlyphProps) {
	const { t } = useLingui();
	const { isUnread } = useSidebarWorkspaceStatus(workspace.id);
	const input: ConductorStatusInput = {
		workspaceStatus,
		isCreatePending,
		sandboxStatus: workspace.sandboxStatus,
		pullRequest: workspace.pullRequest,
		hasRemote: workspace.branchExistsOnRemote,
		isSession: workspace.type === "session",
	};
	const matrix = pickConductorMatrixStatus(input);
	if (matrix) {
		const hasUnread = isUnread || workspaceStatus === "permission";
		return (
			<span
				className="contents"
				data-lead={matrix.status}
				data-unread={hasUnread || undefined}
			>
				<TsentaWorkspaceStatusMatrix
					status={matrix.status}
					gitStatus={matrix.gitStatus}
					hasUnread={hasUnread}
					label={
						input.isSession && matrix.status === "local"
							? t({ message: "Session" })
							: undefined
					}
				/>
			</span>
		);
	}
	const status = pickConductorStatus(input);
	return (
		<span className="contents" data-lead={status}>
			{renderGlyph(status)}
		</span>
	);
}

function renderGlyph(status: ConductorWorkspaceStatus) {
	if (status === "setting-up" || status === "working") {
		return (
			<span className="flex size-3.5 items-center justify-center">
				<WaveSpinner className="text-sidebar-muted-foreground" />
			</span>
		);
	}
	if (status === "session") {
		return <span className="size-1.5 rounded-full bg-muted-foreground/50" />;
	}
	const glyph = GLYPHS[status];
	return (
		<svg
			aria-hidden="true"
			data-keep-stroke=""
			viewBox={glyph.viewBox ?? "0 0 24 24"}
			fill={glyph.filled ? "currentColor" : "none"}
			stroke={glyph.filled ? "none" : "currentColor"}
			strokeWidth={glyph.filled ? undefined : 2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={cn(
				"size-3.5 shrink-0",
				COLOR[status] ?? "text-sidebar-muted-foreground",
			)}
		>
			{glyph.nodes}
		</svg>
	);
}
