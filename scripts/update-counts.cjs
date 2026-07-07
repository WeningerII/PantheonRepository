#!/usr/bin/env node
/*
 * update-counts.cjs — the single writer of corpus counts into committed prose.
 *
 * The corpus grows constantly, and any figure/tradition/item count typed by
 * hand into a doc goes stale the next time something is added — the "wake of
 * stale output" problem. This computes the counts from the one source of truth
 * (app/data.js via window.__PR) and rewrites them everywhere they appear as
 * literal text, so a human never maintains a number.
 *
 * It is idempotent, so it doubles as a drift GUARD: verify-regen.sh runs it and
 * fails the build if the committed files don't already match — you cannot merge
 * a corpus change that leaves a stale count. Run standalone to fix drift:
 *   node scripts/update-counts.cjs      (or: npm run counts)
 */
const fs = require('fs');
const path = require('path');
const { loadCorpus } = require('./build-tiers.cjs');

const ROOT = path.resolve(__dirname, '..');
const PR = loadCorpus();
const people = PR.seedPeople;
const figures = Object.keys(people).length;
const traditions = new Set(Object.values(people).map((p) => p.tradition).filter(Boolean)).size;
const items = Object.keys(PR.items || {}).length;
const fmt = (n) => n.toLocaleString('en-US');

// Each target: a file and number-adjacent substitutions. The regexes match the
// numbers next to their unit words, so only the count changes — surrounding
// prose (and formatting/line breaks) is preserved. If a sentence is reworded so
// a regex stops matching, this prints "no match" for that target and the guard
// catches it, prompting an update here — the number is never silently wrong.
const TARGETS = [
  { file: 'README.md', subs: [
    [/(\*\*)[\d,]+(\s+entries)/, `$1${fmt(figures)}$2`],
    [/(across\s+)[\d,]+(\s+traditions\*\*)/, `$1${fmt(traditions)}$2`],
  ] },
  { file: 'package.json', subs: [
    [/[\d,]+\+? entries across [\d,]+ traditions/, `${fmt(figures)} entries across ${fmt(traditions)} traditions`],
  ] },
  { file: 'mcp/README.md', subs: [
    [/[\d,]+\+?( cited figures across )[\d,]+\+?( traditions)/, `${fmt(figures)}$1${fmt(traditions)}$2`],
  ] },
];

let changed = 0;
const misses = [];
for (const { file, subs } of TARGETS) {
  const p = path.join(ROOT, file);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  for (const [re, rep] of subs) {
    if (!re.test(s)) misses.push(`${file}: pattern ${re} did not match — reword lost the count anchor?`);
    s = s.replace(re, rep);
  }
  if (s !== before) { fs.writeFileSync(p, s); changed++; }
}

if (misses.length) {
  for (const m of misses) console.error('!! ' + m);
  process.exit(2);
}
console.log(changed
  ? `updated corpus counts (${fmt(figures)} figures / ${traditions} traditions / ${fmt(items)} items) in ${changed} file(s)`
  : `corpus counts already current (${fmt(figures)} figures / ${traditions} traditions)`);

module.exports = { figures, traditions, items };
