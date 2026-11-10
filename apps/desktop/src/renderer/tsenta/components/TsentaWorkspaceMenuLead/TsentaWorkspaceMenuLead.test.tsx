import { afterEach, beforeEach, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { DashboardSidebarWorkspaceContextMenu } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem/components/DashboardSidebarWorkspaceContextMenu/DashboardSidebarWorkspaceContextMenu";
import { DashboardSidebarHoverProvider } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarHoverProvider";

const noop = () => {};

beforeEach(() => {
	document.documentElement.dataset.skin = "conductor";
});

afterEach(() => {
	cleanup();
	delete document.documentElement.dataset.skin;
});

function renderMenu({
	isUnread = false,
	onToggleUnread = noop,
	onTogglePin = noop,
}: {
	isUnread?: boolean;
	onToggleUnread?: () => void;
	onTogglePin?: () => void;
} = {}) {
	render(
		<QueryClientProvider client={new QueryClient()}>
			<DashboardSidebarHoverProvider>
				<DashboardSidebarWorkspaceContextMenu
					workspaceId="b502bf30-8693-4815-be65-795035e0ce5f"
					projectId="project-1"
					isLocalWorkspace
					isPinned={false}
					isUnread={isUnread}
					hasStatus={false}
					hasPullRequest={false}
					onTogglePin={onTogglePin}
					onCreateSection={noop}
					onMoveToSection={noop}
					onOpenInFinder={noop}
					onCopyPath={noop}
					onCopyBranchName={noop}
					onCopyWorkspaceId={noop}
					onToggleUnread={onToggleUnread}
					onClearStatus={noop}
					onRemovePullRequest={noop}
				>
					<span>workspace row</span>
				</DashboardSidebarWorkspaceContextMenu>
			</DashboardSidebarHoverProvider>
		</QueryClientProvider>,
	);
	fireEvent.contextMenu(screen.getByText("workspace row"));
}

test("under the Conductor skin, read state leads the menu, once", async () => {
	renderMenu({ isUnread: true });
	const items = await screen.findAllByRole("menuitem");
	expect(items[0]?.textContent).toBe("Mark as ReadR");
	expect(items[1]?.textContent).toBe("PinP");
	expect(screen.getAllByText(/Mark as (Read|Unread)/)).toHaveLength(1);
});

test("R and P select their items while the menu is open", async () => {
	let read = 0;
	let pin = 0;
	renderMenu({
		onToggleUnread: () => {
			read += 1;
		},
		onTogglePin: () => {
			pin += 1;
		},
	});
	await screen.findByText("Mark as Unread");
	fireEvent.keyDown(document.activeElement ?? document.body, { key: "p" });
	await waitFor(() => expect(pin).toBe(1));
	await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

	fireEvent.contextMenu(screen.getByText("workspace row"));
	await screen.findByText("Mark as Unread");
	fireEvent.keyDown(document.activeElement ?? document.body, { key: "r" });
	await waitFor(() => expect(read).toBe(1));
	expect(pin).toBe(1);
});
