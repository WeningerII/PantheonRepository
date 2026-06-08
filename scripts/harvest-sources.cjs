#!/usr/bin/env node
/*
 * Harvest the cited research-agent outputs that the three generators consume
 * out of the ephemeral session transcripts (/tmp) and into a COMMITTED
 * data-sources/ tree, so the corpus is reproducible on a clean checkout (CI)
 * with no /tmp dependency. For each contributing transcript we store its final
 * assistant message verbatim (data-sources/transcripts/<id>.txt); the
 * generators read these raw when present (see each gen-*.cjs). Also writes the
 * base-id snapshot the new-figures generator dedups against
 * (data-sources/existing-ids.json = every seed id NOT introduced via
 * NEW_FIGURES). Run once from the live session: node scripts/harvest-sources.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TASKS = process.env.TASKS_DIR ||
  '/tmp/claude-0/-home-user-PantheonRepository/9979a762-a2ad-53fd-85cf-871f7627ba99/tasks';
const ROOT = path.join(__dirname, '..');
const OUT_TX = path.join(ROOT, 'data-sources', 'transcripts');
const DATA = path.join(ROOT, 'app', 'data.js');

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
// Does this text feed any generator? (mirrors each generator's inclusion test)
function contributes(text) {
  if (/::\s*(POWER|ITEM)\s/.test(text)) return true;                       // gen-powers-items
  if ((text.match(/::[^\n]*\|\s*term=/g) || []).length >= 4) return true;  // gen-powers-terms
  const re = /```(?:json)?\s*([\s\S]*?)```/g; let m;                       // gen-new-figures
  while ((m = re.exec(text))) {
    try { const v = JSON.parse(m[1].trim()); if (Array.isArray(v) && v.some((f) => f && f.id && (f.type || f.domains || f.faculties))) return true; } catch { /* skip */ }
  }
  return false;
}

fs.rmSync(OUT_TX, { recursive: true, force: true });
fs.mkdirSync(OUT_TX, { recursive: true });
let kept = 0, bytes = 0;
for (const name of fs.readdirSync(TASKS).sort()) {
  if (!name.endsWith('.output')) continue;
  let text; try { text = lastAssistantText(path.join(TASKS, name)); } catch { continue; }
  if (!text.trim() || !contributes(text)) continue;
  const out = path.join(OUT_TX, name.replace(/\.output$/, '.txt'));
  fs.writeFileSync(out, text);
  kept++; bytes += Buffer.byteLength(text);
}

// Reconstruct the base-id snapshot: load the current seed, drop the ids the
// NEW_FIGURES block introduces -> the set the new-figures generator must treat
// as already-present so it re-emits exactly those NEW_FIGURES.
const store = new Map();
const ctx = { window: { dispatchEvent: () => true }, localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }, console: { log() {}, warn() {}, error() {}, info() {} }, CustomEvent: class { constructor(t, o) { Object.assign(this, { type: t }, o || {}); } } };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(DATA, 'utf8'), ctx, { filename: 'data.js' });
const people = JSON.parse(ctx.localStorage.getItem('pantheon_registry_v8'));
const dataSrc = fs.readFileSync(DATA, 'utf8');
const nfBlock = dataSrc.match(/NEW_FIGURES_START \*\/[\s\S]*?\/\* NEW_FIGURES_END/)[0];
const nfArr = JSON.parse(nfBlock.replace(/^NEW_FIGURES_START \*\/\s*const NEW_FIGURES =/, '').replace(/;\s*\/\* NEW_FIGURES_END$/, ''));
const nfIds = new Set(nfArr.map((f) => f.id));
const baseIds = Object.keys(people).filter((id) => !nfIds.has(id)).sort();
fs.writeFileSync(path.join(ROOT, 'data-sources', 'existing-ids.json'), JSON.stringify(baseIds, null, 0));

console.log(`harvested ${kept} transcripts (${(bytes / 1024).toFixed(0)} KB) -> data-sources/transcripts/`);
console.log(`base-id snapshot: ${baseIds.length} ids (corpus ${Object.keys(people).length} - NEW_FIGURES ${nfIds.size})`);
