import { Trans, useLingui } from "@lingui/react/macro";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@superset/ui/context-menu";
import { toast } from "@superset/ui/sonner";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { isConductorSkin } from "renderer/tsenta/skin";

function extensionFor(contentType: string | null | undefined): string {
	if (contentType?.includes("html")) return ".html";
	if (contentType?.includes("markdown")) return ".md";
	return "";
}

/** A page card's right-click menu under the skin: Download saves the page's published content. */
export function TsentaPageContextMenu({
	page,
	children,
}: {
	page: { id: string; slug: string };
	children: ReactNode;
}) {
	const { t } = useLingui();
	const utils = cloudTrpc.useUtils();
	if (!isConductorSkin()) return children;

	const download = async () => {
		let url: string | null = null;
		try {
			const pulled = await utils.client.page.pull.query({ id: page.id });
			url = pulled.downloadUrl;
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const objectUrl = URL.createObjectURL(await response.blob());
			const link = document.createElement("a");
			link.href = objectUrl;
			link.download = `${page.slug || "page"}${extensionFor(pulled.contentType)}`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
		} catch {
			// The storage link may refuse a cross-origin fetch; the browser can still save it.
			if (url) window.open(url, "_blank");
			else toast.error(t({ message: "Download failed" }));
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div>{children}</div>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onSelect={() => void download()}>
					<Download className="mr-2 size-4" />
					<Trans>Download</Trans>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
