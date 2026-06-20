#!/usr/bin/env node
/*
 * Shared infrastructure for the three app/data.js block generators
 * (gen-new-figures, gen-powers-terms, gen-powers-items). Each generator parses
 * its OWN line/JSON format and builds its own block string; this module holds
 * only the parts that were byte-for-byte identical across all three: locating
 * the research transcripts, reading an agent's final message, source-kind
 * tagging, the {figureId:[obj,…]} serializer, and the in-place sentinel rewrite.
 *
 * __dirname is scripts/, so the path constants resolve exactly as they did when
 * inlined in each generator — the regenerated data.js stays byte-identical
 * (guaranteed by scripts/verify-regen.sh).
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
    else if (Array.isArray(c)) t = c.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
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

// Build a primary/secondary source classifier from a "looks secondary" regex.
const makeSrcKind = (secondary) => (s) => (secondary.test(s) ? 'secondary' : 'primary');

// Serialize a { figureId: [obj, …] } map to the diff-friendly block body:
// one figure per key, one record per line, records sorted by id.
const serializeFigureMap = (map) => Object.keys(map).sort().map((fig) =>
  `${JSON.stringify(fig)}: [\n` +
  map[fig].slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((o) => '  ' + JSON.stringify(o)).join(',\n') +
  '\n]').join(',\n');

// Replace the `/* <NAME>_START */ … /* <NAME>_END */` span in app/data.js with
// `block` in place. Exits(1) if the sentinels are absent.
function writeSentinelBlock(name, block) {
  const re = new RegExp(`/\\* ${name}_START \\*/[\\s\\S]*?/\\* ${name}_END \\*/`);
  const data = fs.readFileSync(DATA, 'utf8');
  if (!re.test(data)) { console.error(`${name} sentinels not found in data.js`); process.exit(1); }
  fs.writeFileSync(DATA, data.replace(re, block));
}

module.exports = { TASKS, DATA, SRC, lastAssistantText, sources, makeSrcKind, serializeFigureMap, writeSentinelBlock };
