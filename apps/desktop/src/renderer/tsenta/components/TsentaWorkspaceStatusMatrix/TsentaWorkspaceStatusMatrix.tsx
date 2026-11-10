import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";
import { cn } from "@superset/ui/utils";
import { memo } from "react";
import {
	BASE_PATH,
	CELL_SIZE,
	CHECKS_HIGHLIGHT,
	ERROR_CELLS,
	GRID_4,
	GRID_7,
	MERGED_CELLS,
	PULSE_STYLES,
	RING_PATH,
	SETUP_CORNERS,
	SETUP_RING,
	STEADY_HIGHLIGHT,
	SWEEP_STYLES,
	TWINKLE_STYLES,
	WAITING_STATIC,
	WORKING_HIGHLIGHT,
} from "./matrixGeometry";
import {
	ACTIVE_STATUSES,
	ATTENTION_STATUSES,
	type ConductorGitStatus,
	type ConductorMatrixStatus,
	isGitStatus,
	isPullRequestGitStatus,
	statusColor,
	toneColor,
	toneOf,
} from "./matrixStatus";

const LABELS: Record<ConductorMatrixStatus, MessageDescriptor> = {
	unstarted: msg({ message: "Unstarted" }),
	"setting-up": msg({ message: "Setting up" }),
	failed: msg({ message: "Failed" }),
	"needs-plan-response": msg({ message: "Needs plan response" }),
	"needs-user-permission": msg({ message: "Needs permission" }),
	"needs-user-input": msg({ message: "Needs input" }),
	working: msg({ message: "Working" }),
	cancelling: msg({ message: "Cancelling" }),
	waiting: msg({ message: "Waiting for background tasks" }),
	merged: msg({ message: "Merged" }),
	"merge-queued": msg({ message: "In merge queue" }),
	"ready-to-merge": msg({ message: "Ready to merge" }),
	"draft-pr": msg({ message: "Draft pull request" }),
	"merge-conflict": msg({ message: "Merge conflict" }),
	"checks-failing": msg({ message: "Checks failing" }),
	"checks-pending": msg({ message: "Checks running" }),
	"open-pr": msg({ message: "Pull request open" }),
	local: msg({ message: "Local workspace" }),
	branch: msg({ message: "Ready" }),
};

/** Conductor's accessible name for the matrix (its trr). */
function describe({
	status,
	gitStatus,
	hasUnread,
}: Pick<
	TsentaWorkspaceStatusMatrixProps,
	"status" | "gitStatus" | "hasUnread"
>): string {
	if (status === "unstarted") return i18n._(LABELS.unstarted);
	const isActive = ACTIVE_STATUSES.has(status);
	const needsAttention = ATTENTION_STATUSES.has(status);
	const git = gitStatus ?? (isGitStatus(status) ? status : undefined);
	const pullRequest =
		git !== undefined && isPullRequestGitStatus(git) ? git : undefined;
	const parts: string[] = [];
	if (isActive || needsAttention) parts.push(i18n._(LABELS[status]));
	if (pullRequest !== undefined) parts.push(i18n._(LABELS[pullRequest]));
	else if (!isActive && !needsAttention && !hasUnread) {
		parts.push(i18n._(LABELS[git ?? status]));
	}
	if (hasUnread) parts.push(i18n._(msg({ message: "Unread" })));
	return parts.join("; ");
}

export interface TsentaWorkspaceStatusMatrixProps {
	/** The workspace's status: its state, then its agent, then git. */
	status: ConductorMatrixStatus;
	/** Git alone, which may run checks while the agent works. */
	gitStatus?: ConductorGitStatus;
	hasUnread: boolean;
	/** Holds the animation on its steady frame. */
	paused?: boolean;
	/** Overrides the accessible name (a session has no git to speak of). */
	label?: string;
	className?: string;
}

/**
 * Conductor's workspace status matrix (its W7a and CKt, renderApp R:477770,
 * shell-sidebar spec §4.7): a 16px grid of 16 dots in the status colour.
 * Muted dots are a read workspace, bright ones unread, purple a merged
 * pull request (as a checkerboard), green one ready to merge, red an X for a
 * failure; a working agent twinkles, running checks sweep, setting up runs
 * round the ring, attention pulses. Markup, timings and opacity rules are
 * Conductor's; the keyframes are in styles/sidebar.css. Conductor's
 * automation-run arrow is left out: Paradev rows do not mark automation runs.
 */
export const TsentaWorkspaceStatusMatrix = memo(
	function TsentaWorkspaceStatusMatrix({
		status,
		gitStatus,
		hasUnread,
		paused = false,
		label,
		className,
	}: TsentaWorkspaceStatusMatrixProps) {
		const isUnstarted = status === "unstarted";
		const isActive = ACTIVE_STATUSES.has(status);
		const isSettingUp = status === "setting-up";
		const isWaiting = status === "waiting";
		const isWorking = status === "working";
		const needsAttention = ATTENTION_STATUSES.has(status);
		const tone = toneOf(status);
		const git = gitStatus ?? (isGitStatus(status) ? status : undefined);
		const pullRequest =
			git !== undefined && isPullRequestGitStatus(git) ? git : undefined;
		const checksRunning = pullRequest === "checks-pending";
		const isMerged = pullRequest === "merged";
		const isError =
			status === "failed" ||
			(!isActive && !needsAttention && pullRequest === "checks-failing");
		const isDense = isWorking || checksRunning;
		const steadyHighlight = isWorking
			? WORKING_HIGHLIGHT
			: checksRunning
				? CHECKS_HIGHLIGHT
				: STEADY_HIGHLIGHT;
		const pausedHighlight = isWaiting
			? WAITING_STATIC
			: isSettingUp
				? SETUP_CORNERS
				: steadyHighlight;
		const isToned = !isActive && tone !== "muted";
		const showsAttention = !isError && needsAttention;
		const isAnimated =
			!isError && !needsAttention && (isActive || checksRunning);
		const hasOverlay = isAnimated || showsAttention;
		const isBright = pullRequest !== undefined || (!isActive && hasUnread);
		const baseColor =
			git === undefined
				? hasOverlay
					? "text-sidebar-muted-foreground"
					: undefined
				: pullRequest === undefined && hasUnread && !hasOverlay
					? "text-foreground"
					: statusColor(git);
		const cells = isDense ? GRID_7 : GRID_4;
		const cellStyles = isWorking
			? TWINKLE_STYLES
			: checksRunning
				? SWEEP_STYLES
				: PULSE_STYLES;

		return (
			<span
				role="img"
				aria-label={label ?? describe({ status, gitStatus, hasUnread })}
				data-activity={isActive ? "active" : "steady"}
				data-tsenta="status-matrix"
				className={cn(
					"relative block size-4 shrink-0",
					pullRequest !== undefined
						? statusColor(pullRequest)
						: isToned && toneColor(tone),
					pullRequest === undefined &&
						isToned &&
						!hasOverlay &&
						!isError &&
						!hasUnread &&
						"opacity-50",
					className,
				)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="none"
					aria-hidden="true"
					className="absolute inset-0 size-full"
				>
					<path
						d={isUnstarted ? RING_PATH : BASE_PATH}
						className={cn(
							"fill-current",
							isError ? "text-destructive" : baseColor,
							isError
								? "opacity-[0.32]"
								: hasOverlay && pullRequest !== undefined
									? "opacity-50"
									: isBright
										? "opacity-100"
										: "opacity-[0.32]",
						)}
					/>
					{isMerged && !isError && (
						<g>
							{MERGED_CELLS.map(({ index, x, y }) => (
								<rect
									key={index}
									className="fill-current"
									height={CELL_SIZE}
									width={CELL_SIZE}
									x={x}
									y={y}
								/>
							))}
						</g>
					)}
					{isError && (
						<g className="fill-current text-destructive">
							{ERROR_CELLS.map(({ index, x, y }) => (
								<rect
									key={index}
									height={CELL_SIZE}
									width={CELL_SIZE}
									x={x}
									y={y}
								/>
							))}
						</g>
					)}
				</svg>
				{showsAttention && (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						aria-hidden="true"
						data-paused={paused || undefined}
						className="workspace-matrix-attention absolute inset-0 size-full fill-current text-foreground"
					>
						<path d={BASE_PATH} />
					</svg>
				)}
				{isAnimated && (
					<span aria-hidden="true" className="absolute inset-0 block">
						{cells.map((cell, index) => (
							<span
								key={`${cell.x}-${cell.y}`}
								data-reduced-highlight={steadyHighlight.has(index) || undefined}
								data-waiting-static={WAITING_STATIC.has(index) || undefined}
								data-setup-corner={SETUP_CORNERS.has(index) || undefined}
								style={cellStyles[index]}
								className={cn(
									"absolute block opacity-0",
									isActive ? "bg-foreground" : "bg-current",
									paused
										? pausedHighlight.has(index) && "opacity-100"
										: isWorking
											? "workspace-matrix-twinkle"
											: checksRunning
												? "workspace-matrix-sweep"
												: isSettingUp
													? SETUP_RING.has(index) &&
														"workspace-matrix-setting-up"
													: isWaiting
														? "workspace-matrix-waiting"
														: "workspace-matrix-pulse",
								)}
							/>
						))}
					</span>
				)}
			</span>
		);
	},
);
