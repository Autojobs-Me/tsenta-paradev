# Paradev Boxes

Run [Paradev](https://github.com/ParadevAI/Paradev) workspaces on sandboxes you
already pay for at **Daytona**, **E2B** or **Blaxel**, in the same Paradev app,
instead of Paradev's own cloud boxes.

This is a fork of Paradev's canary that rebases onto upstream twice a day, plus
a small harness. Each box runs Paradev's stock host-service and joins your
Paradev organization as an ordinary host. It reaches the app through Paradev's
relay, the same way a machine you own over SSH does. Nothing on Paradev's
servers changes, and you keep your Paradev account, projects and automations.

Not affiliated with Superset Inc. or the Paradev project. MIT, like upstream.

## What you get

```
superset boxes create my-box --provider daytona --cpu 4 --memory 8
superset boxes list
superset boxes stop my-box          # stops billing compute; the disk stays
superset boxes start my-box         # wake: about 6 s back to online
superset boxes delete my-box --yes  # box, its API key and its host row
```

In the app (the Paradev Boxes build), go to Settings, then Hosts, then
**Create a box**. You pick the box like any other host when you create a
workspace, and an offline box shows a **Wake box** button.

Measured on 2026-11-08, from India, against Paradev's own published numbers:

| | Daytona (`us`) | Blaxel (`eu-fra-1`) | Paradev cloud box |
| --- | --- | --- | --- |
| Create to online | 57 s first time (image build), then about 20 s | 27 s | 15.6 s median |
| Wake from stopped | 6.2 to 6.8 s | 6.5 s | 16.4 s median |
| Processes across sleep | lost (stop) | kept (standby) | lost |
| tRPC through the relay, p50 | 518 ms | 243 ms | n/a (gate path, nearest region) |

The latency row is mostly geography. Paradev places a cloud box in the
nearest of 19 regions, Mumbai included. Daytona offers `us` and `eu`, Blaxel
offers US and EU, and E2B's Singapore region needs a request to E2B support.
Pick the region nearest you with `--region`.

## How it works

1. `boxes create` picks a fresh machine id and derives the host id from it,
   then stores both in the box's labels. Every box is therefore its own host,
   and list and delete never have to wake a box.
2. It creates the sandbox from [`box.Dockerfile`](../packages/cli/src/lib/boxes/box.Dockerfile).
   That image is what a Paradev cloud box ships (Node 24, git, gh, Claude Code,
   Codex, bun, build tools, user `ubuntu` with sudo), minus the VNC desktop.
3. Through the provider's exec API it pins the machine id, writes the cgroup's
   CPU and memory for shells, installs the stock Paradev CLI and signs it in
   with a new per-box API key (sent over env, never argv).
4. It runs `superset start --daemon`. host-service binds 127.0.0.1 and dials
   out to the relay, so the box needs no public port.
5. It stores `superset boxes start <provider>:<id>` as the host's wake command.
   The app only ever runs wake commands of exactly that shape.
6. It starts a **keeper**, because providers judge idleness by inbound traffic
   and a host's traffic rides its outbound tunnel. While an app or agent is
   using the box:
   - on Daytona, the keeper holds a websocket to the box's own preview URL,
     which Daytona counts as activity;
   - on Blaxel, it holds a `keepAlive` process through the box's sandbox-api.

   When nobody is using the box, the provider stops it, or puts it in standby,
   after `--idle` minutes.

A failed create deletes the box and revokes its key, because a box bills from
the moment it exists.

## Providers

Keys come from the environment or `~/.config/paradev-boxes/providers.env`
(dotenv, mode 0600). In a terminal, `boxes create` asks for a missing key and
saves it there.

| | Credentials | Notes |
| --- | --- | --- |
| Daytona | `DAYTONA_API_KEY` (`DAYTONA_API_URL` defaults to `https://app.daytona.io/api`) | Built from `box.Dockerfile` with the size you ask for. The build is cached by content. Tier 3+ for open egress. Per-sandbox limits are per org: ask Daytona support for 8 vCPU, 16 GB and 50+ GB disk. |
| Blaxel | `bl login <workspace>`, or `BL_API_KEY` + `BL_WORKSPACE` | Needs a glibc image with Blaxel's sandbox-api. Build it once with `bl push` (below). Disk is RAM-backed (about half of memory), so `--memory` is the size knob. Regions: `us-pdx-1`, `us-was-1`, `eu-lon-1`, `eu-fra-1`. |
| E2B | `E2B_API_KEY` (`E2B_DOMAIN` for another region, `E2B_TEMPLATE` for your template) | The size comes from the template. The timeout is a TTL that pauses the box with memory kept, and `boxes start` re-arms it. Hobby caps a box at 1 h, so use Pro. **Not yet tested against a live account.** |

Blaxel image, once per workspace:

```sh
d=$(mktemp -d) && cp packages/cli/src/lib/boxes/box.Dockerfile "$d/Dockerfile" && cat >> "$d/Dockerfile" <<'EOF'
USER root
COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api
ENTRYPOINT ["/usr/local/bin/sandbox-api"]
EOF
printf 'name = "paradev-box"\ntype = "sandbox"\n' > "$d/blaxel.toml"
(cd "$d" && bl push --type sandbox --name paradev-box -y)
```

## Signing a box in

Sign the box in to GitHub and your agents once, from a terminal in a workspace
on it: `gh auth login`, then `claude` or `codex login --device-auth`. The
sign-ins live on the box's disk. Don't copy your laptop's `~/.codex/auth.json`:
its refresh token is single-use, so the two copies would sign each other out.

These are real credentials on a machine an agent controls. Prefer scoped,
expiring GitHub tokens. Delete a box (which also revokes its Paradev key)
rather than abandoning it.

## Build the macOS app

```sh
curl -fsSL https://bun.sh/install | bash -s bun-v1.4.3   # the version in .bun-version
bun install
scripts/fork/build-mac.sh            # apps/desktop/release/Paradev-Boxes-*.dmg
FORK_DIR_ONLY=1 scripts/fork/build-mac.sh   # just the .app
```

The result is "Paradev Boxes" with its own bundle id, URL scheme
(`superset-boxes`), app data (`~/.paradev-boxes`) and notification port, so it
installs beside Paradev and Paradev Canary. Telemetry is off: no PostHog key
and no Sentry DSN. It signs you in to Paradev's hosted backend like the
official app.

The app is ad-hoc signed unless `CSC_NAME` names a keychain identity. An
ad-hoc build cannot update itself, so CI publishes an update feed only for
signed builds. Paradev and Paradev Boxes on one Mac register the same local
host, so quit one before opening the other.

## Staying on canary

[`fork-sync.yml`](workflows/fork-sync.yml) runs at 02:00 and 14:00 UTC, two
hours after Paradev rebuilds its canary. It rebases this fork's commits (all
of them after the `fork-base` branch) onto `desktop-canary`, pushes `main`,
re-disables upstream's workflows, and publishes the `boxes-canary` build. A
conflict opens an issue instead.

It needs the secret `FORK_SYNC_TOKEN`: a fine-grained token for this
repository with Contents, Workflows and Issues set to read and write.
`GITHUB_TOKEN` cannot push upstream commits that change workflow files.

The fork is built to rebase cleanly:
- Its changes are new files: `packages/cli/src/{lib,commands}/boxes`,
  `electron-builder.fork.ts`, `scripts/fork`, this README and NOTICE.
- It edits one constant in `auto-updater.ts`, plus a few lines in three
  settings and connection components.
- It adds no npm dependencies, so `bun.lock` is untouched.
- Boxes run upstream's CLI and host-service, never a patched one.

## Known gaps

- E2B has not been exercised live yet.
- The keeper's "in use" test is a heuristic: host-service holding more than
  one relay connection, or an agent CLI running. With any Paradev app open on
  your org, your boxes stay awake.
- Daytona `linux-vm` boxes would keep processes across sleep (pause), but the
  class is not enabled on every org. Container boxes lose running processes on
  stop, like Paradev's own boxes.
- No VNC desktop pane on boxes. Paradev only shows it for its own cloud boxes.
