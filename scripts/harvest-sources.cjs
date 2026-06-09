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
// All non-empty assistant text blocks, in order.
function assistantTexts(file) {
  const out = [];
  for (const ln of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!ln.trim()) continue;
    let o; try { o = JSON.parse(ln); } catch { continue; }
    if (o.type !== 'assistant' || !o.message) continue;
    const c = o.message.content;
    let t = '';
    if (typeof c === 'string') t = c;
    else if (Array.isArray(c)) t = c.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
    if (t.trim()) out.push(t);
  }
  return out;
}
// Largest figure array (by element count) anywhere in a message, fenced or inline.
function figureCount(text) {
  const count = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((f) => f && f.id && (f.type || f.domains || f.faculties)).length : 0; } catch { return 0; } };
  let best = 0, m; const re = /```(?:json)?\s*([\s\S]*?)```/g;
  while ((m = re.exec(text))) best = Math.max(best, count(m[1].trim()));
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  if (a >= 0 && b > a) best = Math.max(best, count(text.slice(a, b + 1)));
  return best;
}
function powerTermScore(text) {
  return (text.match(/::\s*(POWER|ITEM)\s/g) || []).length + (text.match(/::[^\n]*\|\s*term=/g) || []).length;
}
// Pick the assistant message that best represents this transcript's contribution.
// Agents sometimes emit the figure array in one message and a summary in a later
// one; lastAssistantText would miss the array. Prefer the message with the most
// figures (ties → longest, so a full array beats a skeleton); else the most
// power/term lines; else the final message. For wave-1/2 transcripts (array was
// already last) this returns the same text, preserving byte-exact regeneration.
function bestText(file) {
  const texts = assistantTexts(file);
  if (!texts.length) return '';
  const scored = texts.map((t) => ({ t, fig: figureCount(t), pow: powerTermScore(t), len: t.length }));
  const fig = scored.filter((s) => s.fig > 0);
  if (fig.length) { fig.sort((a, b) => b.fig - a.fig || b.len - a.len); return fig[0].t; }
  const pow = scored.filter((s) => s.pow > 0);
  if (pow.length) { pow.sort((a, b) => b.pow - a.pow || b.len - a.len); return pow[0].t; }
  return texts[texts.length - 1];
}
// Does this text feed any generator? (mirrors each generator's inclusion test)
function contributes(text) {
  if (/::\s*(POWER|ITEM)\s/.test(text)) return true;                       // gen-powers-items
  if ((text.match(/::[^\n]*\|\s*term=/g) || []).length >= 4) return true;  // gen-powers-terms
  const figureArray = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) && v.some((f) => f && f.id && (f.type || f.domains || f.faculties)); } catch { return false; } };
  const re = /```(?:json)?\s*([\s\S]*?)```/g; let m, fenced = false;       // gen-new-figures (fenced)
  while ((m = re.exec(text))) { if (figureArray(m[1].trim())) return true; fenced = fenced || /```/.test(m[0]); }
  // Fallback to an inline (un-fenced) array, exactly as gen-new-figures.extractFigures does,
  // so harvest and the generator agree on what counts as a figure transcript.
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  if (a >= 0 && b > a && figureArray(text.slice(a, b + 1))) return true;
  return false;
}

fs.rmSync(OUT_TX, { recursive: true, force: true });
fs.mkdirSync(OUT_TX, { recursive: true });
let kept = 0, bytes = 0;
for (const name of fs.readdirSync(TASKS).sort()) {
  if (!name.endsWith('.output')) continue;
  let text; try { text = bestText(path.join(TASKS, name)); } catch { continue; }
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
const people = JSON.parse(ctx.localStorage.getItem('pantheon_registry_v9'));
const dataSrc = fs.readFileSync(DATA, 'utf8');
const nfBlock = dataSrc.match(/NEW_FIGURES_START \*\/[\s\S]*?\/\* NEW_FIGURES_END/)[0];
const nfArr = JSON.parse(nfBlock.replace(/^NEW_FIGURES_START \*\/\s*const NEW_FIGURES =/, '').replace(/;\s*\/\* NEW_FIGURES_END$/, ''));
const nfIds = new Set(nfArr.map((f) => f.id));
const baseIds = Object.keys(people).filter((id) => !nfIds.has(id)).sort();
fs.writeFileSync(path.join(ROOT, 'data-sources', 'existing-ids.json'), JSON.stringify(baseIds, null, 0));

console.log(`harvested ${kept} transcripts (${(bytes / 1024).toFixed(0)} KB) -> data-sources/transcripts/`);
console.log(`base-id snapshot: ${baseIds.length} ids (corpus ${Object.keys(people).length} - NEW_FIGURES ${nfIds.size})`);
