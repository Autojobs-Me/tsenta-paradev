#!/usr/bin/env bash
# Builds Paradev Boxes for macOS from this checkout, against Paradev's hosted
# backend, with telemetry off.
#   scripts/fork/build-mac.sh [arm64|x64]      dmg + zip in apps/desktop/release
#   FORK_DIR_ONLY=1 scripts/fork/build-mac.sh  just the .app (faster)
# Signing: CSC_NAME="Apple Development: ..." (or a Developer ID) signs with that
# keychain identity; unset, the app is ad-hoc signed. APPLE_ID,
# APPLE_APP_SPECIFIC_PASSWORD and APPLE_TEAM_ID notarize.
set -euo pipefail
cd "$(dirname "$0")/../.."

arch="${1:-$(uname -m)}"
[ "$arch" = x86_64 ] && arch=x64
[ "$arch" = aarch64 ] && arch=arm64

want_bun="$(cat .bun-version)"
if [ "$(bun --version)" != "$want_bun" ]; then
	echo "Bun $want_bun is required (found $(bun --version)): curl -fsSL https://bun.sh/install | bash -s bun-v$want_bun" >&2
	exit 1
fi
if [ -f .env ]; then
	echo "A root .env would override the hosted URLs (electron.vite.config.ts loads it); move it aside first." >&2
	exit 1
fi

export TARGET_ARCH="$arch"
export SUPERSET_WORKSPACE_NAME=boxes
export DESKTOP_DISPLAY_NAME=Paradev
export DESKTOP_NOTIFICATIONS_PORT=51761
export NEXT_PUBLIC_API_URL=https://api.superset.sh
export NEXT_PUBLIC_WEB_URL=https://app.superset.sh
export NEXT_PUBLIC_STREAMS_URL=https://streams.superset.sh
export NEXT_PUBLIC_ROOT_DOMAIN=paradev.com
export NEXT_PUBLIC_DOCS_URL=https://docs.paradev.com
export NEXT_PUBLIC_MARKETING_URL=https://paradev.com
export RELAY_URL=https://relay.superset.sh
export REALTIME_URL=https://realtime.superset.sh
# Telemetry stays off: no PostHog key, no Sentry DSN, no sourcemap upload.
unset NEXT_PUBLIC_POSTHOG_KEY NEXT_PUBLIC_POSTHOG_HOST SENTRY_DSN_DESKTOP SENTRY_DSN_HOST_SERVICE SENTRY_AUTH_TOKEN

cd apps/desktop
bun run clean:dev
bun run generate:icons
bun run compile:app
CSC_IDENTITY_AUTO_DISCOVERY=false bun run package -- \
	--publish never --config electron-builder.fork.ts "--$arch" ${FORK_DIR_ONLY:+--dir}
ls -d release/mac*/*.app
