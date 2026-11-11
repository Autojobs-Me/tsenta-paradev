#!/usr/bin/env bash
# Writes .github/upstream.patch: every change this fork makes to Paradev's own
# files (the ones check-upstream-touchpoints.sh allowlists), as one diff
# against the upstream commit the fork sits on. Fork-owned new files and
# translation catalogs are left out. Run it after editing an upstream file and
# commit the result, so the patch always shows what a rebase has to carry.
#   scripts/fork/upstream-patch.sh [base]   default: fork-base, else origin/fork-base
set -euo pipefail
cd "$(dirname "$0")/../.."
base="${1:-fork-base}"
git rev-parse -q --verify "$base^{commit}" >/dev/null || base=origin/fork-base
from=$(git merge-base "$base" HEAD)
args=(--no-renames --diff-filter=a "$from" HEAD -- . ':(exclude,glob)**/tsenta/**' ':(exclude)packages/i18n/locales')
git diff "${args[@]}" > .github/upstream.patch
git diff --stat=120 "${args[@]}" | tail -1
