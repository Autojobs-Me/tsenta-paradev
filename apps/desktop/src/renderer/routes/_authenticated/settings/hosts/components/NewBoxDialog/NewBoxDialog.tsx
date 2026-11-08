import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { Input } from "@superset/ui/input";
import { Label } from "@superset/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@superset/ui/select";
import { Spinner } from "@superset/ui/spinner";
import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { LuCheck, LuTriangleAlert } from "react-icons/lu";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import {
	BOX_PROVIDER_LABELS,
	BOX_PROVIDERS,
	type BoxProvider,
	isBoxProvider,
} from "renderer/lib/boxes";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { CommandTerminal } from "renderer/routes/_authenticated/components/CommandTerminal";
import { parseOnlineHostId } from "../SetUpOverSshDialog/utils/parseOnlineHostId";
import {
	BOX_SIZES,
	type BoxesCreateOptions,
	buildBoxesCreateCommand,
	DEFAULT_BOX_SIZE_ID,
	isValidBoxName,
	isValidBoxRegion,
	parseWholeNumber,
} from "./utils/buildBoxesCreateCommand";

type Phase = "form" | "running" | "success" | "failed";

interface NewBoxDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function NewBoxDialog({ open, onOpenChange }: NewBoxDialogProps) {
	const { t } = useLingui();
	const navigate = useNavigate();
	const organizationId = useActiveOrganizationId();
	const cloudUtils = cloudTrpc.useUtils();
	const fieldId = useId();
	const [phase, setPhase] = useState<Phase>("form");
	const [provider, setProvider] = useState<BoxProvider>("daytona");
	const [name, setName] = useState("");
	const [sizeId, setSizeId] = useState(DEFAULT_BOX_SIZE_ID);
	const [disk, setDisk] = useState("10");
	const [idle, setIdle] = useState("60");
	const [region, setRegion] = useState("");
	const [run, setRun] = useState<{ command: string; attempt: number } | null>(
		null,
	);
	const [hostId, setHostId] = useState<string | null>(null);
	const outputRef = useRef("");
	const terminalBoxRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open) {
			setPhase("form");
			setRun(null);
		}
	}, [open]);

	const size = BOX_SIZES.find((option) => option.id === sizeId);
	const diskGb = parseWholeNumber(disk, 1);
	const idleMinutes = parseWholeNumber(idle, 0);
	const trimmedName = name.trim();
	const trimmedRegion = region.trim();
	const nameInvalid = trimmedName !== "" && !isValidBoxName(trimmedName);
	const regionInvalid =
		trimmedRegion !== "" && !isValidBoxRegion(trimmedRegion);
	const createOptions: BoxesCreateOptions | null =
		size && diskGb !== null && idleMinutes !== null
			? {
					provider,
					name: trimmedName || undefined,
					cpu: size.cpu,
					memoryGb: size.memoryGb,
					diskGb,
					idleMinutes,
					region: trimmedRegion || undefined,
				}
			: null;
	const canStart =
		createOptions !== null &&
		organizationId !== null &&
		!nameInvalid &&
		!regionInvalid;
	const running = phase === "running";
	const locked = running || phase === "success";
	const providerLabel = BOX_PROVIDER_LABELS[provider];

	const start = () => {
		if (!canStart || !createOptions || !organizationId || running) return;
		outputRef.current = "";
		setHostId(null);
		setRun((prev) => ({
			command: buildBoxesCreateCommand(createOptions, organizationId),
			attempt: (prev?.attempt ?? 0) + 1,
		}));
		setPhase("running");
	};

	const cancel = () => {
		setRun(null);
		setPhase("form");
	};

	const focusTerminal = () => {
		terminalBoxRef.current
			?.querySelector<HTMLTextAreaElement>(".xterm-helper-textarea")
			?.focus();
	};

	const handleExit = (exitCode: number | null) => {
		if (exitCode === 0) {
			setHostId(parseOnlineHostId(outputRef.current));
			setPhase("success");
			void cloudUtils.host.roster.invalidate();
			void cloudUtils.host.list.invalidate();
		} else {
			setPhase("failed");
		}
	};

	const openHost = async () => {
		await cloudUtils.host.roster.invalidate();
		onOpenChange(false);
		if (hostId) {
			navigate({ to: "/settings/hosts/$hostId", params: { hostId } });
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
						<Trans>Create a box</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>
							Runs a Paradev host on a sandbox at Daytona, E2B or Blaxel, billed
							to your own account there. It shows up here like any other host.
						</Trans>
					</DialogDescription>
				</DialogHeader>
				<form
					className="space-y-3"
					onSubmit={(event) => {
						event.preventDefault();
						start();
					}}
				>
					<div className="grid grid-cols-3 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor={`${fieldId}-provider`} className="text-xs">
								<Trans>Provider</Trans>
							</Label>
							<Select
								value={provider}
								onValueChange={(value) => {
									if (isBoxProvider(value)) setProvider(value);
								}}
								disabled={locked}
							>
								<SelectTrigger id={`${fieldId}-provider`} className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BOX_PROVIDERS.map((option) => (
										<SelectItem key={option} value={option}>
											{BOX_PROVIDER_LABELS[option]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${fieldId}-size`} className="text-xs">
								<Trans>Size</Trans>
							</Label>
							<Select
								value={sizeId}
								onValueChange={setSizeId}
								disabled={locked}
							>
								<SelectTrigger id={`${fieldId}-size`} className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BOX_SIZES.map(({ id, cpu, memoryGb: memory }) => (
										<SelectItem key={id} value={id}>
											{t({ message: `${cpu} vCPU / ${memory} GB` })}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${fieldId}-name`} className="text-xs">
								<Trans>Name</Trans>
							</Label>
							<Input
								id={`${fieldId}-name`}
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder={t({ message: "Optional" })}
								aria-invalid={nameInvalid}
								autoComplete="off"
								spellCheck={false}
								disabled={locked}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${fieldId}-disk`} className="text-xs">
								<Trans>Disk (GiB)</Trans>
							</Label>
							<Input
								id={`${fieldId}-disk`}
								value={disk}
								onChange={(event) => setDisk(event.target.value)}
								inputMode="numeric"
								aria-invalid={diskGb === null}
								autoComplete="off"
								disabled={locked}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${fieldId}-idle`} className="text-xs">
								<Trans>Idle minutes before it stops</Trans>
							</Label>
							<Input
								id={`${fieldId}-idle`}
								value={idle}
								onChange={(event) => setIdle(event.target.value)}
								inputMode="numeric"
								aria-invalid={idleMinutes === null}
								autoComplete="off"
								disabled={locked}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${fieldId}-region`} className="text-xs">
								<Trans>Region</Trans>
							</Label>
							<Input
								id={`${fieldId}-region`}
								value={region}
								onChange={(event) => setRegion(event.target.value)}
								placeholder={t({ message: "Optional" })}
								aria-invalid={regionInvalid}
								autoComplete="off"
								spellCheck={false}
								disabled={locked}
							/>
						</div>
					</div>
					<div className="flex items-center justify-between gap-4">
						<p className="text-xs text-muted-foreground">
							<Trans>
								Set idle minutes to 0 to keep it running. The first time you use{" "}
								{providerLabel}, the terminal asks for its API key.
							</Trans>
						</p>
						{running ? (
							<Button
								key="cancel"
								type="button"
								variant="outline"
								className="shrink-0"
								onClick={(event) => {
									event.preventDefault();
									cancel();
								}}
							>
								<Trans>Cancel</Trans>
							</Button>
						) : phase === "success" ? (
							<Button
								key="open-host"
								type="button"
								className="shrink-0"
								onClick={openHost}
							>
								<Trans>Open host</Trans>
							</Button>
						) : (
							<Button
								key="submit"
								type="submit"
								className="shrink-0"
								disabled={!canStart}
							>
								{phase === "failed" ? (
									<Trans>Retry</Trans>
								) : (
									<Trans>Create</Trans>
								)}
							</Button>
						)}
					</div>
				</form>
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
						<Trans>
							The box is online. Pick it when you create a workspace.
						</Trans>
					</div>
				)}
				{phase === "failed" && (
					<div className="flex min-h-11 items-center gap-2.5 rounded-md border bg-muted/40 px-3.5 text-sm">
						<LuTriangleAlert className="size-3.5 shrink-0 text-destructive" />
						<Trans>Setup stopped. The reason is in the output below.</Trans>
					</div>
				)}
				{phase !== "form" && run && (
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
							onOutput={(data) => {
								outputRef.current = (outputRef.current + data).slice(-8192);
							}}
							onWriterReady={() => requestAnimationFrame(focusTerminal)}
						/>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
