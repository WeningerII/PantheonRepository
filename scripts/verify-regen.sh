#!/usr/bin/env bash
# Byte-exact regeneration guarantee: the committed corpus must be exactly what
# the generators + build produce from the committed data-sources/ — never a
# hand-edited blob. Re-runs all three generators and the build on the current
# checkout and fails if anything drifts. Run: bash scripts/verify-regen.sh
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/gen-new-figures.cjs   >/dev/null
node scripts/gen-enrich.cjs        >/dev/null
node scripts/gen-powers-terms.cjs  >/dev/null
node scripts/gen-powers-items.cjs  >/dev/null
python3 build.py                   >/dev/null

# Corpus counts are computed into committed prose (README, package.json,
# mcp/README) by update-counts, never typed by hand — so re-run it and fold the
# result into the same drift gate. A corpus change that leaves a stale count in
# any doc fails here instead of shipping. Fix locally with: npm run counts
node scripts/update-counts.cjs     >/dev/null

GUARDED='app/data.js dist/pantheon-registry.html README.md package.json mcp/README.md'
if ! git diff --quiet -- $GUARDED; then
  echo "✗ regeneration drift — committed output is not reproducible from data-sources/ + the corpus:"
  git --no-pager diff --stat -- $GUARDED
  echo "  (run the generators + \`npm run counts\`, then commit)"
  exit 1
fi
echo "✓ byte-exact: corpus, artifact, and all committed counts reproduce from source"
