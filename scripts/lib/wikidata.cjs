/*
 * wikidata.cjs — entity resolution for the image pipeline (docs/image-pipeline.md).
 *
 * The consensus design's core move: identification JOINS on data Wikimedia's
 * editors already curated instead of guessing from free-text search. A figure
 * maps to a Wikidata entity (Zeus → Q34201); the entity's P18 "image" claim is
 * a human-chosen canonical depiction; Commons files also carry P180 "depicts"
 * statements. This module holds the thin network calls (wbsearchentities +
 * wbgetentities, batched 50 QIDs/call — no SPARQL endpoint needed) and the
 * PURE decision logic (name matching, myth-description scoring, wrong-entity
 * rejection, intra-corpus collision detection), so every decision is
 * unit-testable offline — the dev sandbox cannot reach Wikimedia; only CI
 * runs the network side.
 */
'use strict';
const { getJSON, sleep } = require('./wiki-http.cjs');
const nn = require('./native-names.cjs');

const API = 'https://www.wikidata.org/w/api.php';

// ── network (thin, CI-only) ─────────────────────────────────────────────────

// Name → up to `limit` candidate entities, in Wikidata's relevance order.
// `lang` selects WHICH language's labels/aliases are searched (Wikidata's
// labels are multilingual): searching a Lithuanian deity in 'lt', a Japanese
// figure by kanji in 'ja', or an Andean figure in 'es' resolves entities the
// English romanization never finds. Defaults to English.
async function searchEntities(name, limit = 7, lang = 'en') {
  const u = new URL(API);
  u.search = new URLSearchParams({
    action: 'wbsearchentities', search: name, language: lang, uselang: lang,
    type: 'item', limit: String(limit), format: 'json',
  }).toString();
  const data = await getJSON(u.toString());
  return (data.search || []).map((s) => ({
    qid: s.id,
    label: s.label || '',
    description: s.description || '',
    aliases: Array.isArray(s.aliases) ? s.aliases : [],
    matchText: (s.match && s.match.text) || '',
  }));
}

// QIDs → entities with claims, batched 50/call (the API's cap for anonymous
// callers), 250ms courtesy pacing between batches. Returns {qid: entity}.
async function getEntities(qids, props = 'claims|descriptions') {
  const out = {};
  for (let i = 0; i < qids.length; i += 50) {
    const chunk = qids.slice(i, i + 50);
    const u = new URL(API);
    u.search = new URLSearchParams({
      action: 'wbgetentities', ids: chunk.join('|'), props, languages: 'en',
      format: 'json', formatversion: '2',
    }).toString();
    const data = await getJSON(u.toString());
    Object.assign(out, data.entities || {});
    if (i + 50 < qids.length) await sleep(250);
  }
  return out;
}

// ── pure extractors ─────────────────────────────────────────────────────────

// P18 "image": the curated canonical depiction. Value is a bare Commons
// filename (no "File:" prefix).
const p18Of = (entity) => {
  const c = entity && entity.claims && entity.claims.P18;
  const v = c && c[0] && c[0].mainsnak && c[0].mainsnak.datavalue && c[0].mainsnak.datavalue.value;
  return typeof v === 'string' && v ? v : null;
};
// P31 "instance of" class QIDs.
const p31Of = (entity) => {
  const cs = (entity && entity.claims && entity.claims.P31) || [];
  return cs.map((c) => c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id)
    .filter(Boolean);
};
// P373 "Commons category" — the human-curated category holding images OF the
// entity (Category:Zeus). Its file members are the single richest image source,
// far better than a blind text search. Value is a bare category name.
const p373Of = (entity) => {
  const c = entity && entity.claims && entity.claims.P373;
  const v = c && c[0] && c[0].mainsnak && c[0].mainsnak.datavalue && c[0].mainsnak.datavalue.value;
  return typeof v === 'string' && v ? v : null;
};
// The Commons sitelink title (e.g. "Category:Zeus" or a gallery page), a
// fallback when P373 is absent but the entity links Commons directly.
const commonsSitelink = (entity) => {
  const s = entity && entity.sitelinks && (entity.sitelinks.commonswiki || entity.sitelinks.commons);
  return (s && s.title) || null;
};

// P31 classes that mean we matched the WRONG KIND of entity (a film named
// Thor, an asteroid named Iris, a genus named Iris…). Deliberately a SMALL,
// high-confidence set: a wrong entry here merely demotes a figure to human
// review (safe); a missing entry is caught by the description gates below.
const NEGATIVE_P31 = new Set([
  'Q11424',   // film
  'Q5398426', // television series
  'Q482994',  // album
  'Q7889',    // video game
  'Q16521',   // taxon (genus/species — Iris, Calypso, Nerine…)
  'Q571',     // book
  'Q3305213', // painting (the artwork entity, not the person it depicts)
  'Q3863',    // asteroid
]);

// ── pure decision logic ─────────────────────────────────────────────────────

// Diacritic-insensitive, punctuation-insensitive name form ("Mjǫllnir" ≈
// "Mjollnir", "A'amo" ≈ "a amo").
const normName = (s) => String(s || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// The positive identity signal: a description that reads like OUR domain —
// deities, myth, legend, folklore, epic heroes, saints, venerated rulers.
const MYTH_DESC = /\b(deit\w*|god|goddess|myth\w*|legend\w*|folklor\w*|epic|hero|heroine|demigod|spirit|demon|daimon|giant|titan|nymph|saint|prophet|orisha|vodun|loa|lwa|kami|yokai|asura|deva|bodhisattva|ancestor|trickster|personificat\w*|culture hero|king of|queen of|ruler of|pharaoh|emperor|deified|patriarch|matriarch|monster|creature|serpent|dragon)\b/i;

// A description that means the entity is a different KIND of thing entirely.
// Backstop to NEGATIVE_P31 for entities whose P31 we never fetch.
const WRONG_DESC = /\b(film|movie|television|tv series|episode|album|song|single|band|musical|video game|comics?|manga|anime|novel|painting by|sculpture by|asteroid|minor planet|crater|genus|species|plant|moth|butterfly|beetle|ship|vessel|locomotive|automobile|company|brand|typeface|font|programming language|footballer|wrestler|album by|surname|given name|family name)\b/i;

// All the names a figure legitimately answers to.
const figureNames = (fig) => {
  const n = fig && fig.name;
  const names = [(n && n.primary) || fig.id];
  if (n && Array.isArray(n.alt)) for (const a of n.alt) if (typeof a === 'string') names.push(a);
  return names.map(normName).filter(Boolean);
};

// Does a search candidate's label/alias exactly match one of the figure's names?
const nameMatches = (names, cand) => {
  const candNames = [cand.label, cand.matchText, ...(cand.aliases || [])].map(normName).filter(Boolean);
  return candNames.some((c) => names.includes(c));
};

// The figure's NATIVE-script forms, raw. normName() strips non-ASCII, so
// native strings (Ἀκεσώ, 하백, Батраз) can never match through it — they need
// exact string comparison against the candidate's own labels/aliases.
const nativeNameSet = (fig) => {
  const set = new Set();
  for (const f of nn.nativeForms(fig)) if (f.script !== 'latin') set.add(f.text);
  return set;
};

/**
 * How a candidate matches the figure: 'latin' (normalized romanized match),
 * 'native' (exact native-script match), 'native-short' (native match on a
 * string under 3 characters — real, but too dense a namespace to be
 * confident: 2-character CJK strings collide heavily), or null.
 */
const matchKind = (names, natives, cand) => {
  const raw = [cand.label, cand.matchText, ...(cand.aliases || [])].filter((s) => typeof s === 'string' && s);
  if (raw.map(normName).filter(Boolean).some((c) => names.includes(c))) return 'latin';
  for (const c of raw) {
    const t = c.trim();
    if (natives.has(t)) return t.length >= 3 ? 'native' : 'native-short';
  }
  return null;
};

/**
 * Choose a QID for a figure from its search candidates. Pure.
 * @param fig          corpus figure record (name.primary / name.alt / id)
 * @param candidates   from searchEntities(), relevance-ordered
 * @param isCollision  the figure's primary name appears under >1 tradition in
 *                     OUR corpus (the Mara/Tara/Set hazard) — never confident
 * @returns {qid, label, description, confidence:'high'|'ambiguous', reason} | null
 */
function pickQid(fig, candidates, isCollision) {
  if (!candidates || !candidates.length) return null;
  const names = figureNames(fig);
  const natives = nativeNameSet(fig);
  const primary = names[0] || '';

  const kinds = new Map(candidates.map((c) => [c, matchKind(names, natives, c)]));
  const named = candidates.filter((c) => kinds.get(c));
  // No exact name match at all → at best a weak review-tier suggestion.
  const pool = (named.length ? named : candidates.slice(0, 3))
    .filter((c) => !WRONG_DESC.test(c.description || ''));
  if (!pool.length) return null;

  const mythy = pool.filter((c) => MYTH_DESC.test(c.description || ''));
  const best = (mythy[0] || pool[0]);
  const base = { qid: best.qid, label: best.label, description: best.description };
  // A match resting ONLY on a sub-3-character native string (dense CJK
  // namespace) is real evidence but never confident evidence.
  const solidMatch = named.some((c) => kinds.get(c) !== 'native-short');

  // Confident only when EVERY hazard is absent: exactly one myth-flavored
  // exact-name match, no intra-corpus name collision, not a trivially short
  // name (\"Al\", \"Set\" as 2-3 letters collide with the whole dictionary).
  if (mythy.length === 1 && named.length && solidMatch && !isCollision && primary.length > 3) {
    return { ...base, confidence: 'high', reason: 'unique myth-description exact-name match' };
  }
  if (mythy.length >= 1) {
    return {
      ...base, confidence: 'ambiguous',
      reason: isCollision ? 'name appears under multiple traditions in corpus'
        : mythy.length > 1 ? `${mythy.length} myth-flavored candidates`
        : !named.length ? 'no exact name match'
        : 'short/hazardous name',
    };
  }
  return { ...base, confidence: 'ambiguous', reason: 'no myth-flavored description' };
}

// Names appearing under more than one tradition in OUR corpus — computable
// offline, and the direct fix for the cross-tradition collision hazard (the
// shared al/azhdaha folk-beings, Mara, Tara…). Returns a Set of normName forms.
function corpusCollisions(figures) {
  const byName = new Map();
  for (const f of figures) {
    const n = normName((f.name && f.name.primary) || f.id);
    if (!n) continue;
    if (!byName.has(n)) byName.set(n, new Set());
    byName.get(n).add(f.tradition || '');
  }
  const out = new Set();
  for (const [n, trads] of byName) if (trads.size > 1) out.add(n);
  return out;
}

module.exports = {
  searchEntities, getEntities, p18Of, p31Of, p373Of, commonsSitelink, NEGATIVE_P31,
  normName, figureNames, nameMatches, matchKind, nativeNameSet, pickQid, corpusCollisions,
  MYTH_DESC, WRONG_DESC,
};
