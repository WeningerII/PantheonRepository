#!/usr/bin/env node
/*
 * Generate the POWERS_TERMS block in app/data.js from the native-term research
 * agents' transcripts. Reads each agent's FINAL assistant message straight off
 * disk, parses the strict line format
 *
 *   <figure_id> :: <faculty_id> | term=<native> | script=<s> | rom=<r> | gloss=<g> | inherit=<i> | src=<c>
 *   <figure_id> :: +<new_id> | name=<English> | term=... | ...   (appended ability)
 *
 * and rewrites data.js between the POWERS_TERMS sentinels. Idempotent: re-run as
 * more agents complete. Run: node scripts/gen-powers-terms.cjs
 */
const { sources, makeSrcKind, serializeFigureMap, writeSentinelBlock } = require('./gen-lib.cjs');

const SECONDARY = /\bWb\b|Wilkinson|LSJ|eDIL|GPC|CAD|PSD|ETCSL|Rilly|Britannica|Wikipedia|Healey|Ivanov|Toporov|Afanasyev|Rybakov|Bonfante|Pallottino|de Grummond|Dum[eé]zil|Nimuendaj|Koch-Gr[üu]nberg|Propp|Abaev|Charachidz[eé]|Tuite|Tedlock|Taube|Jansen|Caso|Zuidema|Hyslop|Christenson|Alvarado|Vocabulario|dictionary|Stetkevych|Westenholz|Frayne|grammar|ethnograph|Garcilaso|Sarmiento|Betanzos|Cobo|Cieza|Guaman Poma/i;
const srcKind = makeSrcKind(SECONDARY);
const INH = new Set(['none', 'partial', 'full', 'trace']);
const isDash = (v) => {
  if (!v) return true;
  const t = String(v).trim();
  return !t || t === '—' || t === '-' || t === '–' || t.startsWith('—') || t.includes('=—');
};

function parseInto(text, out, stats) {
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let m = line.match(/^===\s*([A-Za-z0-9_]+)\b/);
    if (m) { cur = m[1]; continue; }
    let figId, rest;
    const dc = line.indexOf('::');
    if (dc > 0 && /^[A-Za-z0-9_]+$/.test(line.slice(0, dc).trim())) {
      figId = line.slice(0, dc).trim(); rest = line.slice(dc + 2).trim(); cur = figId;
    } else if (line[0] === '+' && cur) {
      figId = cur; rest = line;
    } else continue;
    const parts = rest.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const facId = parts[0].replace(/^\+/, '').trim();
    if (!facId || /\s/.test(facId)) continue;
    const f = {};
    for (const p of parts.slice(1)) {
      const i = p.indexOf('=');
      if (i > 0) f[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim();
    }
    const obj = { id: facId };
    if (f.name) obj.name = f.name;
    if (!isDash(f.term)) {
      obj.term = { value: f.term };
      if (f.script) obj.term.script = f.script;
      if (!isDash(f.rom)) obj.term.rom = f.rom;
    } else { stats.emdash++; }
    if (f.gloss && !isDash(f.gloss)) obj.notes = f.gloss;
    obj.inheritability = INH.has((f.inherit || '').toLowerCase()) ? f.inherit.toLowerCase() : 'none';
    if (f.src) obj.sources = [{ kind: srcKind(f.src), reference: f.src }];
    out[figId] = out[figId] || [];
    if (out[figId].some((x) => x.id === obj.id)) { stats.dups++; continue; }
    out[figId].push(obj);
    stats.count++;
    if (obj.term) stats.scripts[obj.term.script || '?'] = (stats.scripts[obj.term.script || '?'] || 0) + 1;
  }
}

const out = {};
const stats = { count: 0, emdash: 0, dups: 0, files: 0, scripts: {} };
for (const { text } of sources()) {
  // Only powers-research transcripts: many lines of the "id :: faculty | term=" form.
  const hits = (text.match(/::[^\n]*\|\s*term=/g) || []).length;
  if (hits < 4) continue;
  parseInto(text, out, stats);
  stats.files++;
}

// Serialize: one line per faculty, grouped by figure (diff-friendly).
const figs = Object.keys(out).sort();
const block = `/* POWERS_TERMS_START */\nconst POWERS_TERMS = {\n${serializeFigureMap(out)}\n};\n/* POWERS_TERMS_END */`;
writeSentinelBlock('POWERS_TERMS', block);

console.log(`transcripts parsed: ${stats.files}`);
console.log(`figures: ${figs.length} | faculties termed: ${stats.count} | em-dash (no native word): ${stats.emdash} | dups skipped: ${stats.dups}`);
console.log('scripts:', Object.entries(stats.scripts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(', '));
