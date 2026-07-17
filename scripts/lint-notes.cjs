#!/usr/bin/env node
/*
 * Cleanliness lint for figure prose: flags authoring-meta / "lazy-intern"
 * scaffolding that the deterministic sanitizer (sanitize-notes.cjs) does NOT
 * catch — process-talk that should never reach a public detail page.
 * Scans notes + lifecycle/relations/faculties/materialCulture/domain notes.
 * Usage: node scripts/lint-notes.cjs <transcript.txt | figures.json> [...]
 * Exit 1 if any violation found. No repo state touched.
 */
const fs = require('fs');

// Phrases that are authoring meta, not encyclopedic content.
const META = /\b(foregrounded|per the (prompt|brief)|of the batch|the batch|classified here|included (here|to register)|the (registry|corpus) (wants|also records|records|uses)|for the (set|batch)|as requested|requested (by|in) the brief|this (entry|record|figure) (follows|covers|is included)|kept distinct here|disambiguat\w*)\b/i;
// Raw internal ids leaking into prose (tradition_name style refs).
const RAWID = /\b(?:greek|roman|norse|hindu|egyptian|thracian|[a-z]{3,})_[a-z][a-z0-9_]{2,}\b/;
// ALL-CAPS authoring tags mid-note ("SOLITARY:", "SOURCE DIVERGENCE:", ...),
// whitelisting real abbreviations that legitimately precede a colon.
const CAPTAG = /(^|\s)([A-Z][A-Z-]{3,}(?:\s+[A-Z&][A-Z-]{1,})*):/;
const CAP_OK = /^(BCE|CE|AD|BC|CE-|BCE-|USA|UK|UNESCO)\b/;

function collectNotes(fig) {
  const out = [];
  const push = (v, where) => { if (typeof v === 'string' && v.trim()) out.push([where, v]); };
  push(fig.notes, 'notes');
  for (const a of (fig.lifecycle || [])) push(a && a.notes, 'lifecycle');
  for (const a of (fig.relations || [])) push(a && a.notes, 'relations');
  for (const a of (fig.faculties || [])) push(a && a.notes, 'faculty');
  for (const a of (fig.materialCulture || [])) push(a && a.notes, 'materialCulture');
  for (const a of (fig.domains || [])) push(a && a.notes, 'domain');
  return out;
}

function figuresFrom(text) {
  const re = /```(?:json)?\s*([\s\S]*?)```/g; let m;
  while ((m = re.exec(text))) {
    try { const a = JSON.parse(m[1]); if (Array.isArray(a) && a[0] && (a[0].tradition || a[0].id)) return a; } catch (_) {}
  }
  try { const a = JSON.parse(text); if (Array.isArray(a)) return a; } catch (_) {}
  return [];
}

let violations = 0;
for (const file of process.argv.slice(2)) {
  const text = fs.readFileSync(file, 'utf8');
  const figs = figuresFrom(text);
  for (const f of figs) {
    for (const [where, note] of collectNotes(f)) {
      const hits = [];
      let mm;
      if ((mm = note.match(META))) hits.push(`meta:"${mm[0]}"`);
      if ((mm = note.match(RAWID))) hits.push(`raw-id:"${mm[0]}"`);
      const cap = note.match(CAPTAG);
      if (cap && !CAP_OK.test(cap[2])) hits.push(`caps-tag:"${cap[2]}:"`);
      if (hits.length) {
        violations++;
        console.log(`  ✗ ${f.id || '?'} [${where}] ${hits.join(', ')}`);
        console.log(`      "${note.slice(0, 140)}${note.length > 140 ? '…' : ''}"`);
      }
    }
  }
}
if (violations) { console.log(`\n✗ ${violations} prose-cleanliness violation(s) — fix before merge.`); process.exit(1); }
console.log('✓ notes clean: no authoring-meta, raw ids, or caps-tags.');
