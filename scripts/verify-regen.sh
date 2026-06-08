#!/usr/bin/env bash
# Byte-exact regeneration guarantee: the committed corpus must be exactly what
# the generators + build produce from the committed data-sources/ — never a
# hand-edited blob. Re-runs all three generators and the build on the current
# checkout and fails if anything drifts. Run: bash scripts/verify-regen.sh
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/gen-new-figures.cjs   >/dev/null
node scripts/gen-powers-terms.cjs  >/dev/null
node scripts/gen-powers-items.cjs  >/dev/null
python3 build.py                   >/dev/null

if ! git diff --quiet -- app/data.js dist/pantheon-registry.html; then
  echo "✗ regeneration drift — committed data is not reproducible from data-sources/:"
  git --no-pager diff --stat -- app/data.js dist/pantheon-registry.html
  exit 1
fi
echo "✓ byte-exact: app/data.js and dist/pantheon-registry.html reproduce from committed data-sources/"
