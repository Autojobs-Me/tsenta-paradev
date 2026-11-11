#!/usr/bin/env bash
# Live dev build of Paradev Tsenta: the app from this checkout, against Paradev's hosted backend, reloading as
# changes land (renderer changes hot-reload in place; main-process changes restart the app).
#   scripts/fork/dev.sh                          run this checkout as it is
#   scripts/fork/dev.sh --follow tsenta/batch2   also keep this checkout on origin/<branch>, checked every 5 s,
#                                                so pushed changes show up in the running app within seconds.
#                                                --follow DISCARDS local edits: use a checkout you don't edit.
# It has its own home (~/.paradev-tsentadev), so it runs its own host-service: one adopted from Paradev would
# refuse the dev renderer's origin. Sign in once in its window; its URL scheme is superset-tsentadev, so the
# sign-in callback reaches it and not another app. Paradev's hosted API does not accept the dev origin either,
# so the app talks to it through scripts/fork/dev-proxy.ts on 127.0.0.1:5938 (API) and :5939 (streams).
# REMOTE_DEBUGGING_PORT=<port> exposes the window over the Chrome DevTools protocol.
set -euo pipefail
cd "$(dirname "$0")/../.."
follow=""
if [ "${1:-}" = --follow ]; then follow="${2:?--follow needs a branch}"; fi

want_bun="$(cat .bun-version)"
if [ -x "$HOME/.bun-$want_bun/bin/bun" ]; then export PATH="$HOME/.bun-$want_bun/bin:$PATH"; fi
if [ "$(bun --version 2>/dev/null)" != "$want_bun" ]; then
	echo "Bun $want_bun is required: curl -fsSL https://bun.sh/install | BUN_INSTALL=\$HOME/.bun-$want_bun bash -s bun-v$want_bun" >&2
	exit 1
fi
if [ -f .env ]; then
	echo "A root .env would override the hosted URLs (electron.vite.config.ts loads it); move it aside first." >&2
	exit 1
fi

export SUPERSET_WORKSPACE_NAME=tsentadev
export SUPERSET_HOME_DIR="${SUPERSET_HOME_DIR:-$HOME/.paradev-tsentadev}"
export DESKTOP_DISPLAY_NAME=Paradev
export DESKTOP_NOTIFICATIONS_PORT=51762
export DESKTOP_VITE_PORT="${DESKTOP_VITE_PORT:-5937}"
export NEXT_PUBLIC_API_URL=https://api.superset.sh
export NEXT_PUBLIC_WEB_URL=https://app.superset.sh
export NEXT_PUBLIC_STREAMS_URL=https://streams.superset.sh
export NEXT_PUBLIC_ROOT_DOMAIN=paradev.com
export NEXT_PUBLIC_DOCS_URL=https://docs.paradev.com
export NEXT_PUBLIC_MARKETING_URL=https://paradev.com
export RELAY_URL=https://relay.superset.sh
export REALTIME_URL=https://realtime.superset.sh
unset SENTRY_DSN_DESKTOP SENTRY_DSN_HOST_SERVICE SENTRY_AUTH_TOKEN
# Paradev's analytics key, so per-account feature flags match Paradev's app; kept in a private local file.
posthog_env="${TSENTA_DEV_POSTHOG_ENV:-$HOME/.tsenta-dev/posthog.env}"
if [ -r "$posthog_env" ]; then . "$posthog_env"; else echo "[tsenta-dev] no $posthog_env: feature flags stay at their defaults" >&2; fi
# The app reaches Paradev's API through the local dev proxy (see the header).
export NEXT_PUBLIC_API_URL=http://localhost:5938 NEXT_PUBLIC_STREAMS_URL=http://localhost:5939
bun scripts/fork/dev-proxy.ts &
proxy=$!

if [ -n "$follow" ]; then
	git fetch -q origin "$follow"
	git checkout -q -B "$follow" "origin/$follow"
	lock="$(git rev-parse HEAD:bun.lock)"
	(
		while sleep 5; do
			git fetch -q origin "$follow" 2>/dev/null || continue
			[ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$follow")" ] && continue
			git reset -q --hard "origin/$follow"
			echo "[tsenta-dev] now at $(git log -1 --format='%h %s')"
			[ "$(git rev-parse HEAD:bun.lock)" = "$lock" ] || echo "[tsenta-dev] bun.lock changed: stop this and run dev.sh again to reinstall"
		done
	) &
	follower=$!
fi
trap 'kill $proxy ${follower:-} 2>/dev/null || true' EXIT

if [ ! -d node_modules ] || [ ! -d apps/desktop/node_modules ]; then
	bun install --frozen --ignore-scripts
	bun run --filter=@superset/i18n build
	bun run --cwd apps/desktop install:deps
fi
cd apps/desktop
# A scripts-off install skips Electron's own download of its binary, which `electron-vite dev` needs.
node -e "require('electron')" >/dev/null 2>&1 || node "$(node -p "require.resolve('electron/install.js')")"
bun run dev
