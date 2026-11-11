import { Trans, useLingui } from "@lingui/react/macro";
import { DropdownMenuItem } from "@superset/ui/dropdown-menu";
import { toast } from "@superset/ui/sonner";
import { useWorkspaceClient } from "@superset/workspace-client";
import { Download } from "lucide-react";
import { decodeBase64 } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/state/fileDocumentStore";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";
import { isConductorSkin } from "renderer/tsenta/skin";

/** Saves a workspace file through the browser download, so it works on cloud workspaces too. */
export function TsentaDownloadMenuItem({
	absolutePath,
}: {
	absolutePath: string;
}) {
	const { t } = useLingui();
	const { trpcClient } = useWorkspaceClient();
	const { workspace } = useWorkspace();
	if (!isConductorSkin()) return null;

	const download = async () => {
		try {
			const result = await trpcClient.filesystem.readFile.query({
				workspaceId: workspace.id,
				absolutePath,
			});
			const bytes =
				result.kind === "bytes"
					? decodeBase64(result.content)
					: new TextEncoder().encode(result.content);
			const url = URL.createObjectURL(
				new Blob([bytes as Uint8Array<ArrayBuffer>]),
			);
			const link = document.createElement("a");
			link.href = url;
			link.download = absolutePath.split(/[\\/]/).pop() ?? "file";
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch {
			toast.error(t({ message: "Download failed" }));
		}
	};

	return (
		<DropdownMenuItem onSelect={() => void download()}>
			<Download />
			<Trans>Download</Trans>
		</DropdownMenuItem>
	);
}
