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
const fs = require('fs');
const path = require('path');

const TASKS = process.env.TASKS_DIR ||
  '/tmp/claude-0/-home-user-PantheonRepository/9979a762-a2ad-53fd-85cf-871f7627ba99/tasks';
const DATA = path.join(__dirname, '..', 'app', 'data.js');
const SRC = path.join(__dirname, '..', 'data-sources', 'transcripts');

// Pull the last assistant text message out of a JSONL transcript.
function lastAssistantText(file) {
  let txt = '';
  for (const ln of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!ln.trim()) continue;
    let o; try { o = JSON.parse(ln); } catch { continue; }
    if (o.type !== 'assistant' || !o.message) continue;
    const c = o.message.content;
    let t = '';
    if (typeof c === 'string') t = c;
    else if (Array.isArray(c)) t = c.filter(b => b && b.type === 'text').map(b => b.text).join('\n');
    if (t.trim()) txt = t; // keep the latest
  }
  return txt;
}
// Prefer the committed research-output snapshot (reproducible on a clean
// checkout); fall back to the live /tmp session transcripts when absent.
function sources() {
  if (fs.existsSync(SRC)) {
    return fs.readdirSync(SRC).filter((n) => n.endsWith('.txt')).sort()
      .map((n) => ({ name: n, text: fs.readFileSync(path.join(SRC, n), 'utf8') }));
  }
  return fs.readdirSync(TASKS).filter((n) => n.endsWith('.output')).sort()
    .map((n) => { try { return { name: n, text: lastAssistantText(path.join(TASKS, n)) }; } catch { return { name: n, text: '' }; } });
}

const SECONDARY = /\bWb\b|Wilkinson|LSJ|eDIL|GPC|CAD|PSD|ETCSL|Rilly|Britannica|Wikipedia|Healey|Ivanov|Toporov|Afanasyev|Rybakov|Bonfante|Pallottino|de Grummond|Dum[eé]zil|Nimuendaj|Koch-Gr[üu]nberg|Propp|Abaev|Charachidz[eé]|Tuite|Tedlock|Taube|Jansen|Caso|Zuidema|Hyslop|Christenson|Alvarado|Vocabulario|dictionary|Stetkevych|Westenholz|Frayne|grammar|ethnograph|Garcilaso|Sarmiento|Betanzos|Cobo|Cieza|Guaman Poma/i;
const srcKind = (s) => (SECONDARY.test(s) ? 'secondary' : 'primary');
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
const body = figs.map((fig) =>
  `${JSON.stringify(fig)}: [\n` +
  out[fig].slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((f) => '  ' + JSON.stringify(f)).join(',\n') +
  '\n]').join(',\n');
const block = `/* POWERS_TERMS_START */\nconst POWERS_TERMS = {\n${body}\n};\n/* POWERS_TERMS_END */`;

let data = fs.readFileSync(DATA, 'utf8');
const re = /\/\* POWERS_TERMS_START \*\/[\s\S]*?\/\* POWERS_TERMS_END \*\//;
if (!re.test(data)) { console.error('sentinels not found in data.js'); process.exit(1); }
data = data.replace(re, block);
fs.writeFileSync(DATA, data);

console.log(`transcripts parsed: ${stats.files}`);
console.log(`figures: ${figs.length} | faculties termed: ${stats.count} | em-dash (no native word): ${stats.emdash} | dups skipped: ${stats.dups}`);
console.log('scripts:', Object.entries(stats.scripts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(', '));
