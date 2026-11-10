#!/usr/bin/env bash
# Lists every upstream file this fork edits and fails when one is not on the
# allowlist below. Each of them can conflict when fork-sync.yml rebases onto
# Paradev's canary, so adding one should be a choice someone sees in review.
# Files the fork adds are its own and never conflict, so they are not listed;
# neither is anything under a tsenta/ folder (apps/desktop/src/renderer/tsenta).
#   scripts/fork/check-upstream-touchpoints.sh [base]   default: fork-base
# The base is the upstream commit the fork sits on: the fork-base branch, or
# origin/fork-base after `git fetch origin fork-base`.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Exact paths, or globs matched with bash `case` (where * also crosses /).
allowlist=(
	# Fork identity, update feed, boxes and hosts.
	'apps/desktop/src/lib/trpc/routers/index.ts'
	'apps/desktop/src/main/lib/auto-updater.ts'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/automations/components/HostOfflineRunDialog/HostOfflineRunDialog.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/components/HostConnectionPill/HostConnectionPill.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/components/DashboardNewWorkspaceForm/components/DevicePicker/DevicePicker.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/components/NewWorkspaceScreen/NewWorkspaceScreen.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/layout.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/settings/hosts/$hostId/components/HostSettings/HostSettings.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/settings/hosts/components/HostsSettingsSidebar/HostsSettingsSidebar.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/settings/v2-project/$projectId/components/V2ProjectSettings/V2ProjectSettings.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/settings/v2-project/$projectId/components/V2ProjectSettings/components/ProjectLocationSection/ProjectLocationSection.tsx'
	# Translations; .gitattributes merges these with merge=union.
	'packages/i18n/locales/*/messages.po'
	# Conductor look: one-line hooks into renderer/tsenta.
	'apps/desktop/src/renderer/globals.css'
	'apps/desktop/src/renderer/index.html'
	'apps/desktop/src/renderer/index.tsx'
	# Conductor sidebar header and footer swaps (plan step 6), and the flat
	# Conductor list (TsentaSidebarList) in place of the project tree.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/DashboardSidebar.tsx'
	# Conductor workspace list (plan step 7): data-tsenta hooks on the rows
	# and the list headers.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarGroupHeader/DashboardSidebarGroupHeader.tsx'
	# ...and the repository header swap.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarProjectSection/DashboardSidebarProjectSection.tsx'
	# ...and Conductor's hover card delay.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarHoverProvider/DashboardSidebarHoverProvider.tsx'
	# ...and Conductor's workspace menu order (read state first, R and P).
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem/components/DashboardSidebarWorkspaceContextMenu/DashboardSidebarWorkspaceContextMenu.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarSectionHeader/DashboardSidebarSectionHeader.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem/DashboardSidebarWorkspaceItem.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarWorkspaceItem/components/DashboardSidebarExpandedWorkspaceRow/DashboardSidebarExpandedWorkspaceRow.tsx'
	# Conductor sidebar size (plan step 8): 256 / 192 / 480 under the skin,
	# and the 40% cap where the panel works out its widest.
	'apps/desktop/src/renderer/stores/workspace-sidebar-state.ts'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/WorkspaceSidebarPanel/WorkspaceSidebarPanel.tsx'
	# ...hidden rather than folded to the rail when collapsed, with the panel's
	# state on its wrapper (that file) and Conductor's window chrome in place
	# of Paradev's while it is hidden.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/layout.tsx'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/WindowChrome/index.ts'
	# ...and Conductor's codicon right panel toggle, swapped in by its barrel.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/RightSidebarToggle/index.ts'
	# Conductor center tab strip (plan step 10): data-pane-tabbar,
	# data-pane-add-tab, data-pane-tab and data-active hooks for workspace.css.
	'packages/panes/src/react/components/Workspace/components/TabBar/TabBar.tsx'
	'packages/panes/src/react/components/Workspace/components/TabBar/components/TabItem/TabItem.tsx'
	# Conductor workspace header (plan step 9): the center Workspace comes from
	# renderer/tsenta (TsentaWorkspace, the same Workspace with the skin off).
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/page.tsx'
	# Conductor transcript (plan step 11): the 56rem chat column under the
	# skin, the data-tsenta="transcript" and "scroll-to-bottom" hooks
	# chat.css keys on, and the working row at the transcript's end
	# (TsentaTranscriptFooter).
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/constants.ts'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/Transcript.tsx'
	# ...the same transcript hook on a sub-agent's own transcript, so it reads
	# like the main one.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/SubagentView/SubagentView.tsx'
	# ...and data-tsenta="markdown" on the agent text root, for Conductor's prose.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/MarkdownView/MarkdownView.tsx'
	# ...and Conductor's turn outline (the transcript's stacked marks) in
	# place of Paradev's rail of prompts, one import line.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/SessionView/SessionView.tsx'
	# ...and the user-row, user-bubble and user-actions hooks for Conductor's
	# user message.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/UserMessageRow/UserMessageRow.tsx'
	# ...and data-tsenta="approval" with its status on the approval card.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ApprovalRow/ApprovalRow.tsx'
	# ...and the transcript's component barrels that export the fork's
	# Conductor rows (renderer/tsenta/chat), Paradev's own with the skin off:
	# the tool card, steps with no rail beside them, and runs of calls flat
	# while they run, folded under Conductor's summary line once done.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ToolCallRow/index.ts'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/TurnGroupSection/components/RailStep/index.ts'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/TurnGroupSection/components/ToolRunRow/index.ts'
	# ...the Thinking row.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ReasoningRow/index.ts'
	# ...the turn footer.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ReplyFooter/index.ts'
	# ...the todo cards.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/PlanRow/index.ts'
	# ...sub-agents, and items nested under a tool.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/SubagentEventLine/index.ts'
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ChildItemsList/index.ts'
	# ...and an approval's stacked answers.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/ApprovalRow/components/OptionButtons/index.ts'
	# ...and error notices as Conductor's destructive badge.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Transcript/components/NoticeRow/index.ts'
	# Conductor composer (plan step 12): data-tsenta="composer" and
	# data-plan-mode on the chat session's composer, the model menu's align
	# and the fork's second Stop in its toolbar, and the
	# card, send, stop, mic and menu hooks (data-composer-root,
	# data-composer-send, data-composer-stop, data-composer-dictate,
	# data-composer-menus) composer.css keys on in chat-ui's ComposerBody.
	'apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatSession/components/Composer/Composer.tsx'
	'packages/chat-ui/src/components/PromptInput/components/ComposerBody/ComposerBody.tsx'
	# ...and the model picker's trigger and menu hooks, with an align prop so
	# its menu opens from the composer's left edge, where Conductor keeps the
	# trigger.
	'apps/desktop/src/renderer/routes/_authenticated/components/AgentComposer/components/ModelPicker/ModelPicker.tsx'
)

base="${1:-}"
if [ -z "$base" ]; then
	for ref in fork-base origin/fork-base tsenta/fork-base; do
		if git rev-parse -q --verify "$ref^{commit}" >/dev/null; then
			base="$ref"
			break
		fi
	done
fi
if [ -z "$base" ]; then
	echo "No fork-base ref found: run \`git fetch origin fork-base\` or pass the base commit." >&2
	exit 2
fi
# From the merge base, so a branch cut before the last sync does not count
# upstream's own changes since then as fork edits.
from=$(git merge-base "$base" HEAD)

# Everything that existed upstream and differs now: edits, deletions, and the
# old side of renames (--no-renames splits a rename into a delete and an add).
diff_args=(--no-renames --diff-filter=a "$from" HEAD -- . ':(exclude,glob)**/tsenta/**')
touched=()
while IFS= read -r file; do touched+=("$file"); done < <(git diff --name-only "${diff_args[@]}")

echo "Upstream files edited since $base (${from:0:9}): ${#touched[@]}"
[ "${#touched[@]}" -eq 0 ] || git diff --stat=200 "${diff_args[@]}"

allowed() {
	local entry
	for entry in "${allowlist[@]}"; do
		# shellcheck disable=SC2254 # entries are patterns on purpose
		case "$1" in $entry) return 0 ;; esac
	done
	return 1
}

unlisted=()
for file in ${touched[@]+"${touched[@]}"}; do
	allowed "$file" || unlisted+=("$file")
done

for entry in "${allowlist[@]}"; do
	used=false
	for file in ${touched[@]+"${touched[@]}"}; do
		# shellcheck disable=SC2254
		case "$file" in $entry) used=true && break ;; esac
	done
	[ "$used" = true ] || echo "note: allowlisted but no longer edited, remove it: $entry"
done

if [ "${#unlisted[@]}" -gt 0 ]; then
	echo
	echo "::error::Upstream files edited but not on the allowlist in $0:"
	printf '  %s\n' "${unlisted[@]}"
	echo "Move the change into a fork-owned file (renderer/tsenta), or add the file to the allowlist."
	exit 1
fi
echo "All upstream edits are on the allowlist."
