#!/usr/bin/env bash
# Builds Paradev Tsenta from this checkout, against Paradev's hosted backend.
# Analytics follow Paradev's app when NEXT_PUBLIC_POSTHOG_KEY/HOST are set (CI
# passes them from secrets): its per-account feature flags (cloud workspaces,
# channels, plugins, ...) need them. Sentry stays off. Installers land in apps/desktop/release.
#   scripts/fork/build.sh [mac|linux|win] [arm64|x64]   defaults: this machine
#   FORK_DIR_ONLY=1 scripts/fork/build.sh               just the unpacked app
# Signing: CSC_NAME="Apple Development: ..." (or a Developer ID) signs with that
# keychain identity; unset, the app is ad-hoc signed. APPLE_ID,
# APPLE_APP_SPECIFIC_PASSWORD and APPLE_TEAM_ID notarize.
# The app shares Paradev's home (~/.paradev): its entry point,
# apps/desktop/fork/main.cjs, sets that and writes the paradev-boxes launcher.
set -euo pipefail
cd "$(dirname "$0")/../.."

case "${1:-$(uname -s)}" in
	mac | Darwin) platform=mac ;;
	linux | Linux) platform=linux ;;
	win | MINGW* | MSYS* | CYGWIN* | Windows_NT) platform=win ;;
	*) echo "Unknown platform: $1 (use mac, linux or win)" >&2; exit 1 ;;
esac
arch="${2:-$(uname -m)}"
case "$arch" in x86_64 | amd64) arch=x64 ;; aarch64) arch=arm64 ;; esac

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
# Only picks the URL scheme (superset-tsenta, as in electron-builder.fork.ts),
# so sign-in callbacks reach this
# app rather than Paradev. The home is Paradev's ~/.paradev, set at launch by
# apps/desktop/fork/main.cjs before the main bundle reads this name.
export SUPERSET_WORKSPACE_NAME=tsenta
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
# Sentry stays off: no DSN, no sourcemap upload. PostHog comes from the environment (see the header).
unset SENTRY_DSN_DESKTOP SENTRY_DSN_HOST_SERVICE SENTRY_AUTH_TOKEN

# Tsenta's icons (apps/desktop/fork/icons) replace Paradev's for the build:
# the installer, dock and window icons all come from build/icons. Restored on exit.
icons="$PWD/apps/desktop/src/resources/build/icons"
trap 'git checkout -q -- "$icons"' EXIT
for name in icon icon-canary; do
	for ext in icns ico png; do cp "apps/desktop/fork/icons/icon.$ext" "$icons/$name.$ext"; done
done

cd apps/desktop
bun run clean:dev
bun run generate:icons
bun run compile:app
CSC_IDENTITY_AUTO_DISCOVERY=false bun run package -- \
	--publish never --config electron-builder.fork.ts "--$platform" "--$arch" ${FORK_DIR_ONLY:+--dir}
ls release
