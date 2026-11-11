# Tsenta Paradev

Tsenta's fork of [Paradev](https://github.com/ParadevAI/Paradev), the desktop
app for running coding agents in workspaces. It is Paradev's canary plus a
short stack of Tsenta commits, rebased onto upstream twice a day. It installs
beside Paradev as **Superset Tsenta** (`com.tsenta.paradev`) and shares
Paradev's app home (`~/.paradev`), so projects, workspaces and sign-in carry
over.

Not affiliated with Superset Inc. or the Paradev project. MIT, like upstream.

## Download

| Where | What |
| --- | --- |
| [Releases → `boxes-canary`](https://github.com/Autojobs-Me/tsenta-paradev/releases/tag/boxes-canary) | The latest synced build: macOS arm64 (`.dmg`, `.zip`) and Windows x64 (`.exe`). |
| Actions → **Tsenta preview** → artifacts | A build of each push to a `tsenta/*` branch: `tsenta-preview-mac-arm64`, `tsenta-preview-win-x64`. |

- **macOS**: signed and notarized when the signing secrets are set; otherwise right-click → Open the first time.
- **Windows**: a client for boxes and other remote hosts. Local workspaces do not work, because Paradev's terminal daemon has no Windows support. SmartScreen warns on unsigned builds.

## What differs from Paradev

All UI changes sit behind the **Conductor skin** (`<html data-skin="conductor">`,
on by default). `localStorage["tsenta-skin"] = "paradev"` and a reload give
stock Paradev back.

| Change | Code |
| --- | --- |
| Conductor-style layout: sidebar, workspace header, tab strip, transcript, composer | `apps/desktop/src/renderer/tsenta/` |
| Tsenta's logo: app icon, dock, sign-in, loading, empty workspace | `apps/desktop/fork/icons/`, `scripts/fork/build.sh`, `tsenta/components/TsentaLogo` |
| `+` in the tab strip opens a chat with the default model, no menu | `tsenta/components/TsentaWorkspace` |
| The pull request shows at the top of the Changes pane; no PR button in the header | `tsenta/components/TsentaChangesPrBar` |
| ⌘N opens the new-workspace popup over the current view | `tsenta/components/TsentaNewWorkspaceDialog` |
| Model pickers show "Ultracode" on Claude models (on through `"ultracode": true` in `~/.claude/settings.json`) | `tsenta/composer/ultracode` |
| Paradev Boxes: workspaces on Daytona, E2B or Blaxel sandboxes | [BOXES.md](BOXES.md) |

Every change the fork makes to Paradev's own files is in one diff:
[`upstream.patch`](upstream.patch).

## How it stays on upstream

- The `fork-base` branch is the upstream commit the fork sits on. Every commit after it on `main` is Tsenta's.
- [`fork-sync.yml`](workflows/fork-sync.yml) runs at 02:00 and 14:00 UTC. It rebases those commits onto Paradev's `desktop-canary` tag, pushes `main` and `fork-base`, keeps upstream's workflows disabled, then builds and publishes `boxes-canary`. On a conflict it stops and changes nothing.
- It needs the secret `FORK_SYNC_TOKEN` (fine-grained, this repository: Contents, Workflows, Actions read and write). Without it, a push that touches upstream's workflow files fails.

To sync by hand:

```sh
git remote add upstream https://github.com/ParadevAI/Paradev.git
git fetch upstream tag desktop-canary && git fetch origin fork-base
git rebase --onto desktop-canary origin/fork-base main   # fix conflicts, keep both sides' intent
git push --force-with-lease origin main
git push --force origin desktop-canary^{commit}:refs/heads/fork-base
```

## Changing the fork (rules for people and agents)

1. **Put new code in fork-owned files.** UI goes in `apps/desktop/src/renderer/tsenta/` and checks `isConductorSkin()` (`renderer/tsenta/skin`), or uses CSS under `html[data-skin="conductor"]`.
2. **Touch upstream files only with small hooks.** Use an import plus a line, or swap a component in its `index.ts` barrel. Mark the hook with a `// tsenta:conductor` comment. Do not reformat or rewrite upstream lines: every changed line can conflict on the next rebase.
3. **List every upstream file you edit** in `scripts/fork/check-upstream-touchpoints.sh`, then regenerate the diff with `scripts/fork/upstream-patch.sh`. Commit both.
4. **Add no npm dependencies** and do not touch `bun.lock`. Upstream changes it many times a week, so a fork edit would conflict on almost every sync.
5. **Strings** use Lingui. Reuse a message that is already translated, or translate the new one into every locale. The build fails on a missing translation.
6. **Verify** before you push:

```sh
# bun must match .bun-version (1.4.3)
bun install --frozen --ignore-scripts && bun run --filter=@superset/i18n build
(cd apps/desktop && bun run typecheck && bun test src/renderer/tsenta)
scripts/fork/check-upstream-touchpoints.sh
```

Commit messages: `feat(fork): …` or `fix(fork): …`, one change per commit, in plain words.

## Build locally

```sh
scripts/fork/build.sh                  # this machine's platform and arch
scripts/fork/build.sh win x64          # or: mac|linux|win, arm64|x64
FORK_DIR_ONLY=1 scripts/fork/build.sh  # just the unpacked app
```

Installers land in `apps/desktop/release`. `scripts/fork/smoke.sh <platform>`
launches the packaged app and checks that it stays up.

## CI

| Workflow | When | Does |
| --- | --- | --- |
| `fork-sync.yml` | 02:00 and 14:00 UTC, or by hand (`force_build` builds without an upstream change) | Rebase onto canary, touchpoint check, build mac arm64 and win x64, publish `boxes-canary` |
| `tsenta-preview.yml` | Push to `tsenta/*` (not `tsenta/wip-*`), or by hand | Build mac arm64 and win x64 previews as artifacts |

All other workflows are upstream's and stay disabled.

### Signing

| Platform | Secrets (repository settings) | Without them |
| --- | --- | --- |
| macOS | `MAC_CERTIFICATE`, `MAC_CERTIFICATE_PASSWORD`, `CSC_NAME`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | Ad-hoc signed, not notarized, no self-update |
| Windows | Secrets `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`; variables `AZURE_SIGNING_ENDPOINT`, `AZURE_SIGNING_ACCOUNT`, `AZURE_SIGNING_PROFILE`, `AZURE_PUBLISHER_NAME` | Unsigned; SmartScreen warns |

An update manifest is published only for a signed build, so an unsigned
build finds no update instead of failing to install one.
