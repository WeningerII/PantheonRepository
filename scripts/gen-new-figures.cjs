#!/usr/bin/env node
/*
 * Build the NEW_FIGURES block in app/data.js from the figure-authoring agents'
 * transcripts. Each agent returns a fenced ```json [ ...figure objects... ] ```
 * block (full schema: id, name{primary,alt,transliterations}, type, tradition,
 * parentIds, domains[], faculties[], materialCulture[], sources[]). We extract,
 * parse, dedup by id, drop ids already in the corpus, and rewrite the block.
 * Idempotent. Run: node scripts/gen-new-figures.cjs
 */
const fs = require('fs');
const path = require('path');
const TASKS = process.env.TASKS_DIR ||
  '/tmp/claude-0/-home-user-PantheonRepository/9979a762-a2ad-53fd-85cf-871f7627ba99/tasks';
const DATA = path.join(__dirname, '..', 'app', 'data.js');
const VALID = new Set(['deity', 'demigod', 'quartigod', 'scion', 'mortal']);
const existing = new Set(JSON.parse(fs.readFileSync('/tmp/existing-ids.json', 'utf8')));

function lastAssistantText(file) {
  let txt = '';
  for (const ln of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!ln.trim()) continue;
    let o; try { o = JSON.parse(ln); } catch { continue; }
    if (o.type !== 'assistant' || !o.message) continue;
    const c = o.message.content;
    let t = '';
    if (typeof c === 'string') t = c;
    else if (Array.isArray(c)) t = c.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
    if (t.trim()) txt = t;
  }
  return txt;
}
function extractFigures(text) {
  const out = [];
  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const re = /```(?:json)?\s*([\s\S]*?)```/g;
  let m, found = false;
  while ((m = re.exec(text))) {
    const v = tryParse(m[1].trim());
    if (Array.isArray(v)) { out.push(...v); found = true; }
  }
  if (!found) {
    const a = text.indexOf('['), b = text.lastIndexOf(']');
    if (a >= 0 && b > a) { const v = tryParse(text.slice(a, b + 1)); if (Array.isArray(v)) out.push(...v); }
  }
  return out;
}

const all = new Map();
const stats = { files: 0, raw: 0, dups: 0, exist: 0, invalid: 0 };
for (const name of fs.readdirSync(TASKS)) {
  if (!name.endsWith('.output')) continue;
  let text; try { text = lastAssistantText(path.join(TASKS, name)); } catch { continue; }
  const figs = extractFigures(text);
  if (!figs.length) continue;
  // Only count transcripts that look like figure-authoring (objects with id+type/domains)
  const looksLikeFigures = figs.some((f) => f && f.id && (f.type || f.domains || f.faculties));
  if (!looksLikeFigures) continue;
  stats.files++;
  for (const f of figs) {
    stats.raw++;
    if (!f || typeof f !== 'object' || typeof f.id !== 'string' || !f.id) { stats.invalid++; continue; }
    if (!f.name && !f.names) { stats.invalid++; continue; }
    if (!f.type || !VALID.has(f.type)) f.type = 'deity';
    if (existing.has(f.id)) { stats.exist++; continue; }
    if (all.has(f.id)) { stats.dups++; continue; }
    all.set(f.id, f);
  }
}
const arr = [...all.values()];
const block = `/* NEW_FIGURES_START */\nconst NEW_FIGURES = ${JSON.stringify(arr, null, 1)};\n/* NEW_FIGURES_END */`;
let data = fs.readFileSync(DATA, 'utf8');
const re = /\/\* NEW_FIGURES_START \*\/[\s\S]*?\/\* NEW_FIGURES_END \*\//;
if (!re.test(data)) { console.error('NEW_FIGURES sentinels not found'); process.exit(1); }
fs.writeFileSync(DATA, data.replace(re, block));
let pw = 0, it = 0; for (const f of arr) { pw += (f.faculties || []).length; it += (f.materialCulture || []).length; }
console.log(`transcripts: ${stats.files} | new figures: ${arr.length} (raw ${stats.raw}, skipped: existing ${stats.exist}, dup ${stats.dups}, invalid ${stats.invalid})`);
console.log(`  carrying ${pw} powers + ${it} items`);
