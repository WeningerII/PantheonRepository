// Name-collision gates. These guard three defect classes that lanes 29-32 found
// BY HAND and that nothing else in this suite catches — a name search returning
// the wrong figure produces no test failure, no id collision and no build error,
// so without these the whole class can silently regress on the next ingest.
//
//   A  two records of ONE tradition sharing a primary name        (lanes 31, 32)
//   B  an alias that is another record's primary, same tradition  (lane 30)
//   C  a record whose own prose flags one of its aliases as a
//      separate figure — the shape of lane 29's hidden Barons     (heuristic)
//
// C is explicitly a HEURISTIC and is honest about it: the class it proxies for —
// a figure that exists ONLY as a string in someone else's alias list — is not
// decidable from the data, because the missing figure has no record to collide
// with. It caught vodou_bawon_samdi, which is the case that started this work.
//
// CROSS-TRADITION collisions are deliberately NOT gated. 685 of the 710 alias
// shadows and 235 of the 254 primary collisions are the one-cult-two-keys
// pattern (Ogun under Yoruba, Santeria and Vodou keys), which this corpus holds
// on purpose; gating them would fail on correct data.
//
// Exceptions live in data-sources/name-collision-allowlist.json with a written
// reason each. A stale entry fails too — an allowlist nobody prunes is how a
// ratchet quietly stops ratcheting.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadCorpus } = require('../scripts/build-tiers.cjs');

const ALLOW = require('../data-sources/name-collision-allowlist.json');
const MIN_REASON = 20;
const P = loadCorpus({ quiet: true }).seedPeople;

// Same normalisation the ingest sweeps use: NFKD, strip combining marks, fold
// case and punctuation. "Mentōr" and "Mentor" collide; that is the point.
const norm = (s) => String(s || '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const tradition = (id) => P[id].tradition || '';
const aliases = (id) => (P[id].name && P[id].name.alt) || [];

const byPrimary = new Map();
for (const id of Object.keys(P)) {
  const n = norm(P[id].name && P[id].name.primary);
  if (!n) continue;
  if (!byPrimary.has(n)) byPrimary.set(n, []);
  byPrimary.get(n).push(id);
}

// Every gate returns keys; the allowlist is keyed identically so that a CHANGE
// to an accepted group (a third record joining a known pair, say) produces a new
// key and fails rather than being silently covered by the old entry.
const findPrimaryCollisions = () => [...byPrimary]
  .filter(([, ids]) => ids.length > 1 && new Set(ids.map(tradition)).size === 1)
  .map(([n, ids]) => `${n}::${[...ids].sort().join('|')}`);

const findAliasShadows = () => {
  const out = [];
  for (const id of Object.keys(P)) {
    for (const a of aliases(id)) {
      const n = norm(a);
      if (!n) continue;
      for (const other of byPrimary.get(n) || []) {
        if (other !== id && tradition(other) === tradition(id)) out.push(`${id}::${a}->${other}`);
      }
    }
  }
  return out;
};

const TELL = /conflated with|whose aspects are|not to be confused with/i;
const findConflationAliases = () => {
  const out = [];
  for (const id of Object.keys(P)) {
    const notes = String(P[id].notes || '');
    if (!TELL.test(notes)) continue;
    for (const a of aliases(id)) {
      const bare = String(a).trim();
      if (bare.length <= 3) continue;
      const esc = bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // the alias must appear close after the tell, not merely somewhere in the prose
      if (new RegExp(`(conflated with|aspects are|not to be confused with)[^.]{0,120}${esc}`, 'i').test(notes)) {
        out.push(`${id}::${a}`);
      }
    }
  }
  return out;
};

const GATES = [
  ['primaryCollisions', findPrimaryCollisions,
   'two records of the same tradition share a primary name — a reader sees two identical titles. Disambiguate the MINOR bearer from its own parentIds or place (the corpus pattern: "Polydorus of Thebes", "Amenhotep son of Hapu", "Mentor the Thespiad"), or allowlist it with a reason'],
  ['aliasShadows', findAliasShadows,
   'an alias resolves onto a DIFFERENT record of the same tradition — a search for that name answers with the wrong figure. Remove the alias if it is another figure\'s name, or qualify it in place ("Phoebe (epithet of Artemis)"), or allowlist it with a reason'],
  ['conflationAliases', findConflationAliases,
   'this record\'s own prose flags one of its aliases as a separate figure. That is how three real figures were found hiding inside other records\' alias lists. Either give the figure its own record and drop the alias, or allowlist it with a reason'],
];

for (const [key, find, guidance] of GATES) {
  test(`name collisions: no unlisted ${key}`, () => {
    const allowed = ALLOW[key] || {};
    const found = find();
    const unlisted = found.filter((k) => !(k in allowed));
    assert.deepStrictEqual(unlisted, [],
      `${unlisted.length} unlisted ${key}:\n  ${unlisted.join('\n  ')}\n\n${guidance}.`);
  });

  test(`name collisions: no stale ${key} allowlist entries`, () => {
    const found = new Set(find());
    const stale = Object.keys(ALLOW[key] || {}).filter((k) => !found.has(k));
    assert.deepStrictEqual(stale, [],
      `${stale.length} allowlist entr${stale.length === 1 ? 'y' : 'ies'} under ${key} no longer match${stale.length === 1 ? 'es' : ''} anything — the underlying collision was fixed. Delete them from data-sources/name-collision-allowlist.json:\n  ${stale.join('\n  ')}`);
  });
}

test('name collisions: every allowlist entry carries a real reason', () => {
  const bad = [];
  for (const [key] of GATES) {
    for (const [entry, reason] of Object.entries(ALLOW[key] || {})) {
      if (typeof reason !== 'string' || reason.trim().length < MIN_REASON) bad.push(`${key}/${entry}`);
    }
  }
  assert.deepStrictEqual(bad, [],
    `allowlist entries with a missing or too-short reason (min ${MIN_REASON} chars), which defeats the point of an allowlist:\n  ${bad.join('\n  ')}`);
});
