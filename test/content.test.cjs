// Content-truth tests: assert the *scholarly* integrity of the seed, not just
// its shape. The shape tests (seed.test.cjs) would happily pass a fabricated
// figure — these would not. Loads app/data.js in an isolated VM (same approach
// as seed.test.cjs) and asserts every figure/faculty/domain/item is
// term-clean, fully cited, and free of fabrication markers and modern coinages.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA = path.resolve(__dirname, '..', 'app', 'data.js');

function loadPeople() {
  const store = new Map();
  const ctx = {
    window: { dispatchEvent: () => true },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    console: { log() {}, warn() {}, error() {}, info() {} },
    CustomEvent: class { constructor(t, o) { Object.assign(this, { type: t }, o || {}); } },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(DATA, 'utf8'), ctx, { filename: 'data.js' });
  return JSON.parse(ctx.localStorage.getItem('pantheon_registry_v9'));
}

const people = loadPeople();
const entries = Object.entries(people);

// What we refuse to ship.
const BANNED_COINAGE = /(kinesis|mancy|pathy|portation|kinetic|telepath)/i;
const FABRICATION = /series canon|original character|not (mythologically )?attested|fan-?fic|homebrew|\bOC\b/i;
// A term VALUE that isn't a usable native word (empty / bare language label +
// dash / authored disclaimer). Mirrors the runtime scrub and the generators.
const isBadTerm = (v) => {
  const t = String(v == null ? '' : v).trim();
  if (!t) return true;
  if (/\s[—–-]\s*$/.test(t) || /\s[—–]\s/.test(t) || /\(no\b/i.test(t)) return true;
  if (/no (recorded|distinct|specific|fixed|known|attested)|not attested|unknown|n\/a/i.test(t)) return true;
  return false;
};
const claims = (p) => [
  ...(p.faculties || []).map((f) => ['faculty', f])
  , ...(p.domains || []).map((d) => ['domain', d])
  , ...(p.materialCulture || []).map((m) => ['item', m]),
];
const figCitations = (p) => (p.sources || []).flatMap((s) => (s && s.citations) || []);

test('no modern coinages in any power or item name/term', () => {
  const bad = [];
  for (const [id, p] of entries) {
    for (const [kind, e] of claims(p)) {
      const fields = [e.name, e.term && e.term.value].filter(Boolean);
      for (const f of fields) if (BANNED_COINAGE.test(f)) bad.push(`${id} ${kind} "${f}"`);
    }
  }
  assert.deepStrictEqual(bad, [], `banned coinages found:\n${bad.join('\n')}`);
});

test('every native term value is a real word, not an empty/disclaimer string', () => {
  const bad = [];
  for (const [id, p] of entries) {
    for (const [kind, e] of claims(p)) {
      if (e.term && isBadTerm(e.term.value)) bad.push(`${id} ${kind} ${e.id || e.sphereId} = ${JSON.stringify(e.term.value)}`);
    }
  }
  assert.deepStrictEqual(bad, [], `unusable term values:\n${bad.slice(0, 20).join('\n')}`);
});

test('every faculty, domain, and item carries a non-empty sources[]', () => {
  const bad = [];
  for (const [id, p] of entries) {
    for (const [kind, e] of claims(p)) {
      if (!(Array.isArray(e.sources) && e.sources.length && e.sources.every((s) => s && s.reference))) {
        bad.push(`${id} ${kind} ${e.id || e.sphereId || ''}`);
      }
    }
  }
  assert.deepStrictEqual(bad, [], `claims with empty/invalid sources (${bad.length}):\n${bad.slice(0, 20).join('\n')}`);
});

test('every canonical figure carries at least one citation', () => {
  const bad = [];
  for (const [id, p] of entries) {
    if (p.origin === 'canon' && !figCitations(p).some((c) => c && c.reference)) bad.push(id);
  }
  assert.deepStrictEqual(bad, [], `origin:'canon' figures with zero citations:\n${bad.join('\n')}`);
});

test('no citation anywhere is a fabrication marker (series canon / original character / "not attested")', () => {
  const bad = [];
  for (const [id, p] of entries) {
    for (const c of figCitations(p)) if (c.reference && FABRICATION.test(c.reference)) bad.push(`${id}: ${c.reference}`);
    for (const [kind, e] of claims(p)) {
      for (const s of (e.sources || [])) if (s.reference && FABRICATION.test(s.reference)) bad.push(`${id} ${kind}: ${s.reference}`);
    }
  }
  assert.deepStrictEqual(bad, [], `fabrication-marker citations found:\n${bad.slice(0, 20).join('\n')}`);
});

test('the corpus is non-trivially populated (regression floor)', () => {
  assert.ok(entries.length >= 1850, `expected >= 1850 figures, got ${entries.length}`);
  let fac = 0, item = 0;
  for (const [, p] of entries) { fac += (p.faculties || []).length; item += (p.materialCulture || []).length; }
  assert.ok(fac >= 2600, `expected >= 2600 faculties, got ${fac}`);
  assert.ok(item >= 1290, `expected >= 1290 material-culture entries, got ${item}`);
});
