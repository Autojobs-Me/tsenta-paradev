import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { toast } from "@superset/ui/sonner";
import { Spinner } from "@superset/ui/spinner";
import { cn } from "@superset/ui/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuCheck, LuTriangleAlert } from "react-icons/lu";
import { type BoxHost, useRefreshBoxStates } from "renderer/hooks/useBoxHosts";
import {
	BOX_PROVIDER_LABELS,
	type BoxAction,
	buildBoxCommand,
} from "renderer/lib/boxes";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { CommandTerminal } from "renderer/routes/_authenticated/components/CommandTerminal";
import { useV2WorkspaceCreateDefaultsStore } from "renderer/stores/v2-workspace-create-defaults";

type Phase = "confirm" | "running" | "success" | "failed";

interface BoxCommandDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	action: BoxAction;
	box: Pick<BoxHost, "provider" | "id" | "ref" | "hostId">;
	organizationId: string;
	hostName: string;
}

/**
 * Wakes, stops or deletes a box by running `paradev-boxes` in a terminal,
 * so the CLI can ask for a provider API key. Waking and stopping start as the
 * dialog opens; deleting waits for a confirm. The app renders one, from
 * `BoxDialogHost`; open it with `useBoxDialogStore`.
 */
export function BoxCommandDialog({
	open,
	onOpenChange,
	action,
	box,
	organizationId,
	hostName,
}: BoxCommandDialogProps) {
	const { t } = useLingui();
	const navigate = useNavigate();
	const cloudUtils = cloudTrpc.useUtils();
	const refreshBoxStates = useRefreshBoxStates();
	const queryClient = useQueryClient();
	const [phase, setPhase] = useState<Phase>("confirm");
	const [run, setRun] = useState<{ command: string; attempt: number } | null>(
		null,
	);
	const terminalBoxRef = useRef<HTMLDivElement>(null);
	const provider = BOX_PROVIDER_LABELS[box.provider];
	// The dialog lives in the app layout, so a bad reference must not throw
	// while rendering; it ends in the failed state instead.
	const command = useMemo(() => {
		try {
			return buildBoxCommand(action, box, organizationId);
		} catch {
			return null;
		}
	}, [action, box, organizationId]);
	const running = phase === "running";

	useEffect(() => {
		if (!open) return;
		if (!command) {
			setRun(null);
			setPhase("failed");
			return;
		}
		if (action === "delete") {
			setRun(null);
			setPhase("confirm");
			return;
		}
		setRun((prev) => ({ command, attempt: (prev?.attempt ?? 0) + 1 }));
		setPhase("running");
	}, [open, action, command]);

	const start = () => {
		if (!command) return;
		setRun((prev) => ({ command, attempt: (prev?.attempt ?? 0) + 1 }));
		setPhase("running");
	};

	const focusTerminal = () => {
		terminalBoxRef.current
			?.querySelector<HTMLTextAreaElement>(".xterm-helper-textarea")
			?.focus();
	};

	const invalidateHosts = () => {
		void cloudUtils.host.roster.invalidate();
		void cloudUtils.host.list.invalidate();
	};

	const handleExit = (exitCode: number | null) => {
		// Even a failed command can have changed the box at its provider.
		refreshBoxStates();
		if (exitCode !== 0) {
			setPhase("failed");
			return;
		}
		if (action === "delete") {
			// A deleted box must not stay the new-workspace default.
			const createDefaults = useV2WorkspaceCreateDefaultsStore.getState();
			if (createDefaults.lastHostId === box.hostId) {
				createDefaults.setLastHostId(null);
			}
			// Leave the host's page before the roster drops the host from under it.
			onOpenChange(false);
			toast.success(t({ message: `Deleted "${hostName}"` }));
			void navigate({ to: "/settings/hosts", replace: true }).finally(
				invalidateHosts,
			);
			return;
		}
		setPhase("success");
		invalidateHosts();
		if (action === "start") {
			// While the box was down its project lists cached as unknown, which
			// hides "Set up project" and keeps project settings stale.
			void queryClient.invalidateQueries({ queryKey: ["project", "list"] });
			void queryClient.invalidateQueries({ queryKey: ["host-project"] });
		}
	};

	return (
		<Dialog
			open={open}
			modal
			onOpenChange={(next) => {
				if (!running) onOpenChange(next);
			}}
		>
			<DialogContent
				className="gap-3 sm:max-w-[752px]"
				showCloseButton={!running}
				onEscapeKeyDown={(event) => {
					if (running) event.preventDefault();
				}}
				onInteractOutside={(event) => {
					if (running) event.preventDefault();
				}}
				onFocusOutside={(event) => {
					if (running) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>
						{action === "start" ? (
							<Trans>Wake {hostName}</Trans>
						) : action === "stop" ? (
							<Trans>Stop {hostName}</Trans>
						) : (
							<Trans>Delete "{hostName}"?</Trans>
						)}
					</DialogTitle>
					<DialogDescription>
						{action === "start" ? (
							<Trans>
								Starts its sandbox at {provider} and the Paradev host on it.
								This can take a minute.
							</Trans>
						) : action === "stop" ? (
							<Trans>
								Stops its sandbox at {provider}. The disk stays, and waking the
								box starts it again.
							</Trans>
						) : (
							<Trans>
								Deletes its sandbox at {provider} with everything on the disk,
								and removes this host and its workspaces. This can’t be undone.
							</Trans>
						)}
					</DialogDescription>
					<p className="font-mono text-xs text-muted-foreground">{box.ref}</p>
				</DialogHeader>
				{running && (
					<div className="flex min-h-11 items-center gap-2.5 rounded-md bg-muted/40 px-3.5 text-sm text-muted-foreground">
						<Spinner className="size-3.5 shrink-0" />
						<Trans>
							Answer any questions in the terminal below, such as an API key.
						</Trans>
					</div>
				)}
				{phase === "success" && (
					<div className="flex min-h-11 items-center gap-2.5 rounded-md border bg-muted/40 px-3.5 text-sm">
						<LuCheck className="size-3.5 shrink-0 text-emerald-500" />
						{action === "stop" ? (
							<Trans>The box is stopped.</Trans>
						) : (
							<Trans>The box is online.</Trans>
						)}
					</div>
				)}
				{phase === "failed" && (
					<div className="flex min-h-11 items-center gap-2.5 rounded-md border bg-muted/40 px-3.5 text-sm">
						<LuTriangleAlert className="size-3.5 shrink-0 text-destructive" />
						<Trans>
							The command stopped. The reason is in the output below.
						</Trans>
					</div>
				)}
				{phase !== "confirm" && run && (
					<div
						ref={terminalBoxRef}
						className={cn(
							"h-[340px] w-full overflow-hidden rounded-lg border bg-[#151110] p-3",
							phase === "failed" && "opacity-80",
						)}
					>
						<CommandTerminal
							key={run.attempt}
							command={run.command}
							onExit={handleExit}
							onWriterReady={() => requestAnimationFrame(focusTerminal)}
						/>
					</div>
				)}
				<DialogFooter>
					{phase === "confirm" ? (
						<>
							<Button
								key="cancel"
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								<Trans>Cancel</Trans>
							</Button>
							<Button
								key="delete"
								type="button"
								variant="destructive"
								onClick={start}
							>
								<Trans>Delete box</Trans>
							</Button>
						</>
					) : running ? (
						<Button
							key="stop-running"
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							<Trans>Cancel</Trans>
						</Button>
					) : (
						<>
							<Button
								key="close"
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								<Trans>Close</Trans>
							</Button>
							{phase === "failed" && (
								<Button key="retry" type="button" onClick={start}>
									<Trans>Retry</Trans>
								</Button>
							)}
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
