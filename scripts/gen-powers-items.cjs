#!/usr/bin/env node
/*
 * Parse the powers/items re-authoring agents' output into two maps:
 *   ABILITIES_BY_FIGURE — real powers (verbs the figure can DO), distinct from domains
 *   ITEMS_BY_FIGURE     — objects owned/wielded
 * Line format (one per record), emitted by the agents:
 *   <fig> :: POWER <id> | name=.. | term=.. | script=.. | rom=.. | gloss=.. | inherit=.. | src=..
 *   <fig> :: ITEM  <id> | name=.. | term=.. | script=.. | rom=.. | kind=.. | role=.. | gloss=.. | src=..
 * Reads each agent's final assistant message straight off the transcript on disk.
 * Writes /tmp/powers-items-parsed.json and prints stats. (Integration into data.js
 * is a separate step once the shape is validated.)
 */
const fs = require('fs');
const path = require('path');
const TASKS = process.env.TASKS_DIR ||
  '/tmp/claude-0/-home-user-PantheonRepository/9979a762-a2ad-53fd-85cf-871f7627ba99/tasks';

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
const SECONDARY = /\bWb\b|Wikipedia|Britannica|Dum[eé]zil|Lincoln|Lindow|Simek|Ellis Davidson|Abraham|Idowu|encyclopedia|dictionary|grammar|ethnograph/i;
const srcKind = (s) => (SECONDARY.test(s) ? 'secondary' : 'primary');
const isDash = (v) => { const t = String(v || '').trim(); return !t || t === '—' || t === '-' || t.startsWith('—'); };

const powers = {}, items = {};
const stats = { files: 0, powers: 0, items: 0, pTermed: 0, iTermed: 0, figs: new Set() };

for (const name of fs.readdirSync(TASKS)) {
  if (!name.endsWith('.output')) continue;
  let text; try { text = lastAssistantText(path.join(TASKS, name)); } catch { continue; }
  if (!/::\s*(POWER|ITEM)\s/.test(text)) continue;
  let hit = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const dc = line.indexOf('::');
    if (dc <= 0) continue;
    const figId = line.slice(0, dc).trim();
    if (!/^[A-Za-z0-9_]+$/.test(figId)) continue;
    const rest = line.slice(dc + 2).trim();
    const m = rest.match(/^(POWER|ITEM)\s+(\S+)\s*\|(.*)$/);
    if (!m) continue;
    hit = true;
    const [, kind, id, fieldStr] = m;
    const f = {};
    for (const p of fieldStr.split(/\s*\|\s*/)) {
      const i = p.indexOf('='); if (i > 0) f[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim();
    }
    const term = isDash(f.term) ? null : { value: f.term, script: f.script || undefined, rom: isDash(f.rom) ? undefined : f.rom };
    const src = f.src ? [{ kind: srcKind(f.src), reference: f.src }] : undefined;
    stats.figs.add(figId);
    if (kind === 'POWER') {
      const o = { id, name: f.name || undefined, term: term || undefined, notes: isDash(f.gloss) ? undefined : f.gloss,
        inheritability: ['none', 'partial', 'full', 'trace'].includes((f.inherit || '').toLowerCase()) ? f.inherit.toLowerCase() : 'none',
        sources: src, ability: true };
      (powers[figId] = powers[figId] || []);
      if (!powers[figId].some((x) => x.id === id)) { powers[figId].push(o); stats.powers++; if (term) stats.pTermed++; }
    } else {
      const o = { id, name: f.name || undefined, term: term || undefined, kind: f.kind || undefined, role: f.role || undefined,
        notes: isDash(f.gloss) ? undefined : f.gloss, sources: src };
      (items[figId] = items[figId] || []);
      if (!items[figId].some((x) => x.id === id)) { items[figId].push(o); stats.items++; if (term) stats.iTermed++; }
    }
  }
  if (hit) stats.files++;
}

fs.writeFileSync('/tmp/powers-items-parsed.json', JSON.stringify({ powers, items }, null, 1));
console.log(`transcripts: ${stats.files} | figures: ${stats.figs.size}`);
console.log(`POWERS (abilities): ${stats.powers}  (with native term: ${stats.pTermed})`);
console.log(`ITEMS: ${stats.items}  (with native term: ${stats.iTermed})`);
// sample one figure if present
const sampleFig = process.argv[2];
if (sampleFig && (powers[sampleFig] || items[sampleFig])) {
  console.log(`\n${sampleFig} powers:`, (powers[sampleFig] || []).map((p) => `${p.name || p.id}${p.term ? ' [' + p.term.value + ']' : ''}`).join('; '));
  console.log(`${sampleFig} items:`, (items[sampleFig] || []).map((i) => `${i.name || i.id}${i.term ? ' [' + i.term.value + ']' : ''}`).join('; '));
}
