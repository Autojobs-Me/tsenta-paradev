#!/usr/bin/env bash
# After scripts/fork/build.sh: checks the packaged app on this runner.
#   1. the bundled CLI runs and carries the fork's `boxes` commands;
#   2. the app launches and is still running 30 s later (a crash on startup,
#      a missing native module or a bad asar fails here, not on a user's machine).
#   scripts/fork/smoke.sh [mac|linux|win]
set -euo pipefail
cd "$(dirname "$0")/../../apps/desktop/release"
platform="${1:?mac, linux or win}"

cli=$(find . -type f \( -name superset -o -name superset.exe \) -path "*/bin/*" | head -n 1)
[ -n "$cli" ] || { echo "::error::bundled CLI not found"; exit 1; }
"$cli" --version
"$cli" boxes --help | grep -q "create" || { echo "::error::bundled CLI has no boxes commands"; exit 1; }

case "$platform" in
	mac) app=$(find . -path "*.app/Contents/MacOS/*" -type f -perm -111 -maxdepth 5 | grep -v Helper | head -n 1) ;;
	linux) app=$(find . -maxdepth 2 -path "*-unpacked/paradev-boxes" -type f | head -n 1) ;;
	win) app=$(find . -maxdepth 2 -path "*win-unpacked/*.exe" -name "Superset Boxes.exe" | head -n 1) ;;
esac
[ -n "$app" ] || { echo "::error::packaged app not found"; exit 1; }

log=$(mktemp)
if [ "$platform" = linux ]; then
	# Unpacked builds have no SUID chrome-sandbox; the AppImage defaults to this too.
	env -u ELECTRON_RUN_AS_NODE xvfb-run -a "$app" --no-sandbox >"$log" 2>&1 &
else
	env -u ELECTRON_RUN_AS_NODE "$app" >"$log" 2>&1 &
fi
pid=$!
sleep 30
if kill -0 "$pid" 2>/dev/null; then
	echo "App still running after 30 s"
	kill "$pid" 2>/dev/null || true
	[ "$platform" = win ] && taskkill //F //IM "Superset Boxes.exe" >/dev/null 2>&1 || true
else
	echo "::error::app exited during startup"
	tail -n 60 "$log"
	exit 1
fi
tail -n 20 "$log"
