// corpus.mjs — load the Pantheon Registry corpus exactly as the test/build
// pipeline does (run app/data.js in a VM, read window.__PR) and expose a query
// API over it. Single source of truth: no data is duplicated here.
//
// Design notes (this layer exists to be USED by an LLM through MCP, so):
//   - One round trip per question: batch gets, a 'dossier' view that resolves a
//     figure's whole neighbourhood in one call.
//   - Discoverable vocabulary: vocab() enumerates every controlled vocabulary
//     (relation kinds, spheres, faculty ids, item classes, icon attributes,
//     places, eras); every unknown-id/no-match result carries closest-match
//     suggestions so a wrong guess teaches the next call.
//   - Token economy: compact records, hard limits with total/offset so callers
//     page instead of flooding their own context.
//   - Search where the content lives: full-text over notes, epithet originals
//     AND translations, variant claims, cult attestations — not just names.
//   - Typed edges everywhere: 'path exists' is trivia; killed-by vs mentor vs
//     interpretatio is the answer.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.PANTHEON_DATA || path.join(HERE, '..', 'app', 'data.js');

function loadPR() {
  const ctx = {
    window: { dispatchEvent: () => true, addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    console: { log() {}, warn() {}, error() {}, info() {} },
    CustomEvent: class { constructor(t, o) { Object.assign(this, { type: t }, o || {}); } },
  };
  ctx.window.localStorage = ctx.localStorage; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(DATA, 'utf8'), ctx, { filename: 'data.js' });
  return ctx.window.__PR;
}

const PR = loadPR();
const PEOPLE = PR.seedPeople;
const ITEMS = PR.items || {};
const IDS = Object.keys(PEOPLE);

const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const primary = (p) => (p.name && p.name.primary) || p.id;
const names = (p) => [primary(p), ...((p.name && p.name.alt) || [])];
const clean = (obj) => { // drop null/undefined/empty-array noise before serialization
  if (Array.isArray(obj)) return obj.map(clean);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = clean(v);
    }
    return out;
  }
  return obj;
};
const cap = (arr, limit, offset = 0) => ({
  total: arr.length,
  offset,
  ...(offset + limit < arr.length ? { next_offset: offset + limit } : {}),
  results: arr.slice(offset, offset + limit),
});

// ── indexes (built once at load; corpus is immutable) ───────────────────────

// id -> [child ids]
const CHILDREN = new Map();
for (const id of IDS) for (const pid of (PEOPLE[id].parentIds || [])) {
  if (!CHILDREN.has(pid)) CHILDREN.set(pid, []);
  CHILDREN.get(pid).push(id);
}

// undirected typed adjacency: parent edges + relations
const ADJ = new Map();
const link = (a, b, kind) => {
  if (!a || !b || !PEOPLE[a] || !PEOPLE[b]) return;
  if (!ADJ.has(a)) ADJ.set(a, []);
  ADJ.get(a).push({ to: b, kind });
};
for (const id of IDS) {
  const p = PEOPLE[id];
  for (const pid of (p.parentIds || [])) { link(id, pid, 'child of'); link(pid, id, 'parent of'); }
  for (const r of (p.relations || [])) {
    if (!r || !r.personId) continue;
    link(id, r.personId, r.kind || 'related to');
    link(r.personId, id, r.kind || 'related to');
  }
}

// full-text blob per figure: names, epithets (original + translation), notes,
// variant claims, cult attestations, association places
const FTEXT = new Map();
for (const id of IDS) {
  const p = PEOPLE[id];
  const parts = [
    ...names(p),
    ...((p.names || []).map((n) => [n.value, n.original])).flat(),
    p.notes,
    ...((p.epithets || []).map((e) => [e.original, e.transliteration, e.notes])).flat(),
    ...(((p.linguistic || {}).epithets || []).map((e) => [e.original, e.translation])).flat(),
    ...((p.variants || []).map((v) => [v.claim, v.description])).flat(),
    ...((p.cultRecords || []).map((c) => [c.placeName, c.attestation])).flat(),
    ...((p.associations || []).map((a) => a.placeName)),
  ];
  FTEXT.set(id, norm(parts.filter(Boolean).join(' § ')));
}

// reverse indexes
const BY_DOMAIN = new Map();     // sphereId -> [{id, contextTag, term}]
const BY_FACULTY = new Map();    // facultyId -> [{id, inheritability, scopeTags, domainTag}]
const BY_ICON = new Map();       // attributeId -> [id]
const BY_PLACE = new Map();      // norm(place) -> [{id, kind, period|era, place}]
const BY_RELKIND = new Map();    // kind -> [{from, to, era}]
const BY_ITEMCLASS = new Map();  // classId -> [itemId]
const EPITHET_TAG = new Map();   // semanticTag -> Set(id)
const addTo = (map, key, val) => { if (!map.has(key)) map.set(key, []); map.get(key).push(val); };

for (const id of IDS) {
  const p = PEOPLE[id];
  for (const d of (p.domains || [])) { const k = d.sphereId || d.id; if (k) addTo(BY_DOMAIN, k, { id, contextTag: d.contextTag, term: d.term && d.term.value }); }
  for (const f of (p.faculties || [])) if (f.id) addTo(BY_FACULTY, f.id, { id, inheritability: f.inheritability, scopeTags: f.scopeTags, domainTag: f.domainTag });
  for (const a of (((p.iconography || {}).attributes) || [])) if (a.id) addTo(BY_ICON, a.id, id);
  for (const c of (p.cultRecords || [])) if (c.placeName) addTo(BY_PLACE, norm(c.placeName), { id, kind: c.kind, period: c.period, place: c.placeName });
  for (const c of (((p.cult || {}).centers) || [])) if (c.placeName) addTo(BY_PLACE, norm(c.placeName), { id, kind: 'cult-center', period: c.period, place: c.placeName });
  for (const a of (p.associations || [])) if (a.placeName) addTo(BY_PLACE, norm(a.placeName), { id, kind: a.kind, period: a.era, place: a.placeName });
  for (const r of (p.relations || [])) if (r.personId && r.kind) addTo(BY_RELKIND, r.kind, { from: id, to: r.personId, era: r.era });
  for (const e of (p.epithets || [])) for (const t of (e.semanticTags || [])) { if (!EPITHET_TAG.has(t)) EPITHET_TAG.set(t, new Set()); EPITHET_TAG.get(t).add(id); }
}
for (const [iid, it] of Object.entries(ITEMS)) if (it.classId) addTo(BY_ITEMCLASS, it.classId, iid);

// Relation-kind canonicalization: the corpus's raw kinds fragment the same
// concept across separator variants ("killed-by" / "killed by") and near
// synonyms. Queries resolve against the canonical form so any variant finds
// all of them, and see_also surfaces sibling concepts (killer-of, slayer-of)
// the caller probably also wants.
const canonKind = (k) => norm(k).replace(/[-_]+/g, ' ');
const KIND_CANON = new Map(); // canon -> [raw kinds]
for (const k of BY_RELKIND.keys()) addTo(KIND_CANON, canonKind(k), k);
function resolveKinds(query) {
  const cq = canonKind(query || '');
  let keys = KIND_CANON.get(cq) || [];
  if (!keys.length) keys = [...KIND_CANON.entries()].filter(([c]) => c.includes(cq)).flatMap(([, raws]) => raws);
  const stems = cq.split(' ').filter((w) => w.length >= 4).map((w) => w.slice(0, 4));
  const matchedCanons = new Set(keys.map(canonKind));
  const see_also = stems.length ? [...KIND_CANON.keys()]
    .filter((c) => !matchedCanons.has(c) && c.split(' ').some((w) => stems.includes(w.slice(0, 4))))
    .flatMap((c) => KIND_CANON.get(c)) : [];
  return { keys, see_also };
}

// items held per figure (from the item registry, which includes lore/custody)
const ITEMS_HELD = new Map(); // personId -> [itemId]
for (const [iid, it] of Object.entries(ITEMS)) {
  for (const h of (it.holders || [])) if (h.personId) addTo(ITEMS_HELD, h.personId, iid);
}

// inheritors per faculty (PR.inheritedPowers: descendantId -> [{facultyId, fromAncestorId, generation, level}])
const INHERITORS = new Map(); // facultyId -> [{id, from, generation, level}]
for (const [did, list] of Object.entries(PR.inheritedPowers || {})) {
  for (const ip of list) addTo(INHERITORS, ip.facultyId, { id: did, from: ip.fromAncestorId, generation: ip.generation, level: ip.level });
}

// ── shared shapes ────────────────────────────────────────────────────────────

const brief = (id) => {
  const p = PEOPLE[id]; if (!p) return null;
  return { id, name: primary(p), tradition: p.tradition, type: p.type, era: p.temporal && p.temporal.era };
};

const fmtFrac = (x) => (PR.formatFraction ? PR.formatFraction(x) : String(x));

const divinityOf = (id) => {
  const d = PR.divinity && PR.divinity[id];
  if (!d) return null;
  return clean({
    tier: d.tier,
    fraction: fmtFrac(d.fraction),
    basis: d.basis,
    from: (d.contributions || []).map((c) => ({ id: c.id, name: PEOPLE[c.id] ? primary(PEOPLE[c.id]) : c.id, share: fmtFrac(c.fraction) })),
  });
};

const sourcesByClaim = (p) => (p.sources || []).map((s) => ({
  claim: s.claim, weight: s.weight,
  citations: (s.citations || []).map((c) => c.reference).filter(Boolean),
}));
const flatSources = (p) => {
  const out = [];
  for (const s of (p.sources || [])) for (const c of (s.citations || [])) if (c && c.reference) out.push(c.reference);
  return [...new Set(out)];
};

// suggestions: closest names/ids for a failed lookup so the next call succeeds
function suggestFigures(q, n = 5) {
  const nq = norm(q).replace(/[_-]+/g, ' ');
  const hits = [];
  for (const id of IDS) {
    const cands = [norm(id).replace(/[_-]+/g, ' '), ...names(PEOPLE[id]).map(norm)];
    if (cands.some((c) => c.includes(nq) || nq.includes(c))) hits.push(brief(id));
    if (hits.length >= n) break;
  }
  return hits;
}
const suggestKeys = (map, q, n = 8) => {
  const nq = norm(q);
  return [...map.keys()].filter((k) => norm(k).includes(nq) || nq.includes(norm(k))).slice(0, n);
};
const unknownFigure = (id) => ({ error: `unknown figure id: ${id}`, suggestions: suggestFigures(id) });

// ── figures ──────────────────────────────────────────────────────────────────

function figureView(id, view = 'standard') {
  const p = PEOPLE[id]; if (!p) return unknownFigure(id);
  const dates = PR.getEntryDates ? PR.getEntryDates(p) : null;

  if (view === 'card') {
    return clean({ ...brief(id), divinity: (PR.divinity[id] || {}).tier, note: p.notes ? String(p.notes).slice(0, 160) : undefined });
  }

  const standard = clean({
    id, name: p.name, tradition: p.tradition, type: p.type, sex: p.sex, vitalStatus: p.vitalStatus,
    era: p.temporal && p.temporal.era,
    dates: dates && clean({ mythic: dates.mythicStart != null ? [dates.mythicStart, dates.mythicEnd] : undefined, attested: dates.textualStart != null ? [dates.textualStart, dates.textualEnd] : undefined, precision: dates.precision }),
    divinity: divinityOf(id),
    parents: (p.parentIds || []).map(brief).filter(Boolean),
    children: (CHILDREN.get(id) || []).map(brief).filter(Boolean),
    domains: (p.domains || []).map((d) => clean({ sphere: d.sphereId, context: d.contextTag, term: d.term && `${d.term.value}${d.term.rom ? ` (${d.term.rom})` : ''}`, note: d.notes })),
    powers: (p.faculties || []).map((f) => clean({ id: f.id, scope: f.scopeTags, inheritability: f.inheritability })),
    items: (ITEMS_HELD.get(id) || []).map((iid) => ({ id: iid, name: ITEMS[iid].displayName, kind: ITEMS[iid].kind })),
    epithets: (p.epithets || []).map((e) => clean({ original: e.original, translation: e.notes, tags: e.semanticTags })),
    relations: (p.relations || []).map((r) => clean(r.personId
      ? { kind: r.kind, ...(brief(r.personId) || { id: r.personId }), note: r.notes }
      : { kind: r.kind, external: r.externalRef && r.externalRef.name })),
    notes: p.notes || undefined,
    sources: flatSources(p),
  });
  if (view === 'standard') return standard;

  if (view === 'full') {
    return clean({
      ...standard,
      names: p.names,
      lifecycle: (p.lifecycle || []).map((s) => clean({ phase: s.typeStatus || s.vitalStatus, event: s.startEvent, era: s.era, order: s.eraOrdering, note: s.notes })),
      iconography: p.iconography && clean({
        attributes: ((p.iconography.attributes) || []).map((a) => clean({ id: a.id, name: a.name, note: a.notes })),
        sacredAnimals: p.iconography.sacredAnimals, sacredPlants: p.iconography.sacredPlants,
      }),
      cult: clean({
        centers: (((p.cult || {}).centers) || []).map((c) => clean({ place: c.placeName, period: c.period })),
        records: (p.cultRecords || []).map((c) => clean({ place: c.placeName, kind: c.kind, period: c.period, attestation: c.attestation })),
      }),
      death: p.death && clean({
        manner: p.death.manner && p.death.manner.classId, weapon: p.death.manner && p.death.manner.weaponId,
        place: p.death.place && p.death.place.placeName, era: p.death.era,
      }),
      associations: (p.associations || []).map((a) => clean({ kind: a.kind, place: a.placeName, era: a.era })),
      variants: (p.variants || []).map((v) => clean({ claim: v.claim, description: v.description, weight: v.weight })),
      traditionMix: PR.traditionMix && PR.traditionMix[id],
      sources_by_claim: sourcesByClaim(p),
    });
  }

  if (view === 'dossier') {
    // Everything an answer usually needs, one call: standard + inherited
    // powers + cross-tradition equivalents + typed relation neighbourhood.
    const inh = (PR.inheritedPowers && PR.inheritedPowers[id]) || [];
    return clean({
      ...standard,
      inherited_powers: inh.map((x) => ({ power: x.facultyId, from: PEOPLE[x.fromAncestorId] ? primary(PEOPLE[x.fromAncestorId]) : x.fromAncestorId, generations_removed: x.generation, level: x.level })),
      equivalents: equivalents(id).equivalents,
      lifecycle: (p.lifecycle || []).map((s) => clean({ phase: s.typeStatus || s.vitalStatus, event: s.startEvent, era: s.era })),
      cult_places: [...new Set([...(p.cultRecords || []), ...(((p.cult || {}).centers) || [])].map((c) => c.placeName).filter(Boolean))],
      death: p.death && p.death.manner && `${p.death.manner.classId}${p.death.place ? ` at ${p.death.place.placeName}` : ''}`,
    });
  }
  return { error: `unknown view: ${view} (card | standard | full | dossier)` };
}

export function getFigure(idOrIds, { view = 'standard' } = {}) {
  if (Array.isArray(idOrIds)) {
    if (idOrIds.length > 20) return { error: 'max 20 ids per call' };
    return { figures: idOrIds.map((id) => figureView(id, view)) };
  }
  return figureView(idOrIds, view);
}

// ── search ───────────────────────────────────────────────────────────────────

export function searchFigures(q, {
  tradition, type, era, domain, power, item_class, icon, place, relation_kind, relation_to,
  alive_in_year, limit = 25, offset = 0,
} = {}) {
  limit = Math.min(limit || 25, 100);
  const nq = norm(q || '');

  // structured pre-filters narrow the candidate set cheaply
  let candidates = IDS;
  const intersect = (ids) => { const s = new Set(ids); candidates = candidates.filter((x) => s.has(x)); };
  if (domain) {
    const keys = BY_DOMAIN.has(domain) ? [domain] : suggestKeys(BY_DOMAIN, domain, 50);
    if (!keys.length) return { total: 0, results: [], note: `no sphere matching "${domain}"`, sphere_suggestions: suggestKeys(BY_DOMAIN, domain.slice(0, 4), 8) };
    intersect(keys.flatMap((k) => BY_DOMAIN.get(k).map((x) => x.id)));
  }
  if (power) {
    const keys = BY_FACULTY.has(power) ? [power] : suggestKeys(BY_FACULTY, power, 50);
    if (!keys.length) return { total: 0, results: [], note: `no power matching "${power}"`, power_suggestions: suggestKeys(BY_FACULTY, power.slice(0, 4), 8) };
    intersect(keys.flatMap((k) => BY_FACULTY.get(k).map((x) => x.id)));
  }
  if (icon) {
    const keys = BY_ICON.has(icon) ? [icon] : suggestKeys(BY_ICON, icon, 50);
    if (!keys.length) return { total: 0, results: [], note: `no iconographic attribute matching "${icon}"`, icon_suggestions: suggestKeys(BY_ICON, icon.slice(0, 4), 8) };
    intersect(keys.flatMap((k) => BY_ICON.get(k)));
  }
  if (place) {
    const keys = suggestKeys(BY_PLACE, place, 50);
    if (!keys.length) return { total: 0, results: [], note: `no recorded place matching "${place}"` };
    intersect(keys.flatMap((k) => BY_PLACE.get(k).map((x) => x.id)));
  }
  if (item_class) {
    const keys = BY_ITEMCLASS.has(item_class) ? [item_class] : suggestKeys(BY_ITEMCLASS, item_class, 50);
    if (!keys.length) return { total: 0, results: [], note: `no item class matching "${item_class}"`, class_suggestions: suggestKeys(BY_ITEMCLASS, item_class.slice(0, 4), 8) };
    const holderIds = keys.flatMap((k) => BY_ITEMCLASS.get(k)).flatMap((iid) => (ITEMS[iid].holders || []).map((h) => h.personId)).filter(Boolean);
    intersect(holderIds);
  }
  if (relation_kind) {
    const keys = resolveKinds(relation_kind).keys;
    if (!keys.length) return { total: 0, results: [], note: `no relation kind matching "${relation_kind}"`, kind_suggestions: suggestKeys(BY_RELKIND, relation_kind.slice(0, 4), 10) };
    let edges = keys.flatMap((k) => BY_RELKIND.get(k));
    if (relation_to) {
      const target = PEOPLE[relation_to] ? relation_to : (suggestFigures(relation_to, 1)[0] || {}).id;
      if (!target) return { total: 0, results: [], ...unknownFigure(relation_to) };
      edges = edges.filter((e) => e.to === target || e.from === target);
      intersect(edges.map((e) => (e.to === target ? e.from : e.to)));
    } else {
      intersect(edges.flatMap((e) => [e.from, e.to]));
    }
  }

  const hits = [];
  for (const id of candidates) {
    const p = PEOPLE[id];
    if (tradition && norm(p.tradition) !== norm(tradition)) continue;
    if (type && p.type !== type) continue;
    if (era && (p.temporal && p.temporal.era) !== era) continue;
    if (alive_in_year != null) {
      const d = PR.getEntryDates ? PR.getEntryDates(p) : null;
      const s = d && (d.mythicStart ?? d.textualStart);
      const e = d && (d.mythicEnd ?? d.textualEnd);
      if (s == null || e == null || alive_in_year < s || alive_in_year > e) continue;
    }
    if (!nq) { hits.push({ score: 5, hit: brief(id) }); continue; }
    const ns = names(p).map(norm);
    let score = null, matched;
    if (ns.some((n) => n === nq)) { score = 0; matched = 'name'; }
    else if (ns.some((n) => n.startsWith(nq))) { score = 1; matched = 'name'; }
    else if (ns.some((n) => n.includes(nq))) { score = 2; matched = 'name'; }
    else if (FTEXT.get(id).includes(nq)) {
      score = 3;
      const blob = FTEXT.get(id);
      const at = blob.indexOf(nq);
      matched = 'text: …' + blob.slice(Math.max(0, at - 40), at + nq.length + 40).replace(/§/g, '·') + '…';
    }
    if (score != null) hits.push({ score, hit: { ...brief(id), matched } });
  }
  hits.sort((a, b) => a.score - b.score || primary(PEOPLE[a.hit.id]).localeCompare(primary(PEOPLE[b.hit.id])));
  const out = cap(hits.map((h) => h.hit), limit, offset);
  if (out.total === 0 && nq) out.suggestions = suggestFigures(q);
  return out;
}

// ── graph ────────────────────────────────────────────────────────────────────

export function relate(aId, bId, { maxHops = 8, via } = {}) {
  if (!PEOPLE[aId]) return unknownFigure(aId);
  if (!PEOPLE[bId]) return unknownFigure(bId);
  if (aId === bId) return { path: [brief(aId)], hops: 0 };
  const allow = via && via.length ? new Set(via.flatMap((k) => [k, ...resolveKinds(k).keys])) : null;
  const prev = new Map([[aId, null]]);
  let frontier = [aId], depth = 0;
  while (frontier.length && depth < maxHops) {
    const next = [];
    for (const cur of frontier) for (const { to, kind } of (ADJ.get(cur) || [])) {
      if (allow && !allow.has(kind) && kind !== 'parent of' && kind !== 'child of') continue;
      if (prev.has(to)) continue;
      prev.set(to, { from: cur, kind });
      if (to === bId) {
        const steps = [];
        let n = bId;
        while (prev.get(n)) { const e = prev.get(n); steps.unshift({ ...brief(n), via: e.kind }); n = e.from; }
        steps.unshift(brief(aId));
        return { hops: steps.length - 1, path: steps };
      }
      next.push(to);
    }
    frontier = next; depth++;
  }
  return { hops: null, path: null, note: `no path within ${maxHops} hops${allow ? ' via the requested kinds' : ''}` };
}

export function neighbors(id, { kinds, limit = 50 } = {}) {
  if (!PEOPLE[id]) return unknownFigure(id);
  // union: keep the literal kind (covers the synthetic genealogy edges
  // 'parent of'/'child of', which aren't authored relations) plus every
  // canonical variant of it.
  const allow = kinds && kinds.length ? new Set(kinds.flatMap((k) => [k, ...resolveKinds(k).keys])) : null;
  const seen = new Set();
  const out = [];
  for (const { to, kind } of (ADJ.get(id) || [])) {
    if (allow && !allow.has(kind)) continue;
    const key = `${to}|${kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind, ...brief(to) });
  }
  out.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  const kindCounts = {};
  for (const { kind } of (ADJ.get(id) || [])) kindCounts[kind] = (kindCounts[kind] || 0) + 1;
  return { figure: brief(id), kinds_present: kindCounts, ...cap(out, Math.min(limit, 200)) };
}

export function lineage(id, { depth = 3 } = {}) {
  if (!PEOPLE[id]) return unknownFigure(id);
  const annotate = (bid) => ({ ...brief(bid), divinity: (PR.divinity[bid] || {}).tier });
  const walk = (start, step) => {
    const out = [], seen = new Set([start]);
    let frontier = [{ id: start, d: 0 }];
    while (frontier.length) {
      const next = [];
      for (const { id: cur, d } of frontier) {
        if (d >= depth) continue;
        for (const nb of step(cur)) if (!seen.has(nb)) { seen.add(nb); out.push({ ...annotate(nb), depth: d + 1 }); next.push({ id: nb, d: d + 1 }); }
      }
      frontier = next;
    }
    return out;
  };
  return {
    figure: { ...brief(id), divinity: divinityOf(id) },
    ancestors: walk(id, (c) => PEOPLE[c].parentIds || []),
    descendants: walk(id, (c) => CHILDREN.get(c) || []),
  };
}

export function equivalents(id) {
  const p = PEOPLE[id]; if (!p) return unknownFigure(id);
  const seen = new Set(), eq = [];
  const scan = (pid) => {
    for (const r of (PEOPLE[pid].relations || [])) {
      if (!r.personId || !/equated-with|interpretatio|syncretism/.test(r.kind) || seen.has(r.personId) || r.personId === id) continue;
      seen.add(r.personId);
      eq.push({ kind: r.kind, ...(brief(r.personId) || { id: r.personId }), note: r.notes || undefined });
    }
  };
  scan(id);
  // one transitive hop: equivalents of equivalents (Zeus→Jupiter→…)
  for (const e of [...eq]) if (PEOPLE[e.id]) scan(e.id);
  return { figure: brief(id), equivalents: clean(eq) };
}

export function queryRelations(kind, { tradition, era, limit = 50, offset = 0 } = {}) {
  const { keys, see_also } = resolveKinds(kind);
  if (!keys.length) return { total: 0, results: [], kind_suggestions: suggestKeys(BY_RELKIND, (kind || '').slice(0, 4), 12) };
  let edges = keys.flatMap((k) => BY_RELKIND.get(k).map((e) => ({ kind: k, ...e })));
  if (tradition) edges = edges.filter((e) => norm(PEOPLE[e.from].tradition) === norm(tradition) || (PEOPLE[e.to] && norm(PEOPLE[e.to].tradition) === norm(tradition)));
  if (era) edges = edges.filter((e) => e.era === era || (PEOPLE[e.from].temporal || {}).era === era);
  const shaped = edges.map((e) => clean({ kind: e.kind, from: brief(e.from), to: brief(e.to), era: e.era }));
  return clean({ matched_kinds: keys, see_also: see_also.length ? see_also : undefined, ...cap(shaped, Math.min(limit, 100), offset) });
}

// ── registries ───────────────────────────────────────────────────────────────

export function whoGoverns(sphere, { limit = 50 } = {}) {
  const keys = BY_DOMAIN.has(sphere) ? [sphere] : suggestKeys(BY_DOMAIN, sphere, 30);
  if (!keys.length) return { total: 0, results: [], sphere_suggestions: suggestKeys(BY_DOMAIN, (sphere || '').slice(0, 4), 12) };
  const out = keys.flatMap((k) => BY_DOMAIN.get(k).map((x) => clean({ ...brief(x.id), sphere: k, context: x.contextTag, term: x.term })));
  return { matched_spheres: keys, ...cap(out, Math.min(limit, 200)) };
}

export function whoWields(power, { limit = 50 } = {}) {
  const keys = BY_FACULTY.has(power) ? [power] : suggestKeys(BY_FACULTY, power, 30);
  if (!keys.length) return { total: 0, results: [], power_suggestions: suggestKeys(BY_FACULTY, (power || '').slice(0, 4), 12) };
  const holders = keys.flatMap((k) => BY_FACULTY.get(k).map((x) => clean({ ...brief(x.id), power: k, inheritability: x.inheritability, scope: x.scopeTags })));
  const inheritors = keys.flatMap((k) => (INHERITORS.get(k) || []).map((x) => clean({ ...brief(x.id), power: k, inherited_from: PEOPLE[x.from] ? primary(PEOPLE[x.from]) : x.from, generations_removed: x.generation, level: x.level })));
  return { matched_powers: keys, holders: cap(holders, Math.min(limit, 200)), inheritors: cap(inheritors, Math.min(limit, 200)) };
}

export function getItem(idOrQuery, { item_class, limit = 25 } = {}) {
  const shape = (iid) => {
    const it = ITEMS[iid];
    return clean({
      id: iid, name: it.displayName, class: it.classId, kind: it.kind,
      names: (it.names || []).map((n) => n.value),
      lore: it.lore,
      maker: it.maker && (it.maker.name || (it.maker.externalRef && it.maker.externalRef.name)),
      location: it.location && (it.location.placeName || it.location),
      holders: (it.holders || []).map((h) => clean(h.personId ? { ...brief(h.personId), note: h.notes } : { external: h.externalRef && h.externalRef.name })),
      custody: (it.custody || []).map((c) => clean({
        role: c.role, era: c.era,
        who: c.personId ? primary(PEOPLE[c.personId] || { id: c.personId }) : (c.externalRef && c.externalRef.name),
        id: c.personId,
        sources: (c.sources || []).map((s) => s.reference),
      })),
      sources: (it.sources || []).map((s) => s.reference || (s.citations || []).map((c) => c.reference)).flat().filter(Boolean),
    });
  };
  if (idOrQuery && ITEMS[idOrQuery]) return shape(idOrQuery);
  const nq = norm(idOrQuery || '');
  let pool = Object.keys(ITEMS);
  if (item_class) {
    const keys = BY_ITEMCLASS.has(item_class) ? [item_class] : suggestKeys(BY_ITEMCLASS, item_class, 20);
    if (!keys.length) return { total: 0, results: [], class_suggestions: suggestKeys(BY_ITEMCLASS, item_class.slice(0, 4), 12) };
    pool = keys.flatMap((k) => BY_ITEMCLASS.get(k));
  }
  const hits = pool.filter((iid) => {
    if (!nq) return true;
    const it = ITEMS[iid];
    const hay = norm([iid, it.displayName, ...(it.names || []).map((n) => n.value), it.lore].filter(Boolean).join(' '));
    return hay.includes(nq);
  });
  if (hits.length === 1) return shape(hits[0]);
  return cap(hits.map((iid) => ({ id: iid, name: ITEMS[iid].displayName, class: ITEMS[iid].classId, kind: ITEMS[iid].kind, holders: (ITEMS[iid].holders || []).length, custody_steps: (ITEMS[iid].custody || []).length })), Math.min(limit, 100));
}

// ── vocabulary & aggregates ──────────────────────────────────────────────────

export function vocab(kind, { prefix, limit = 50 } = {}) {
  limit = Math.min(limit || 50, 500);
  const np = norm(prefix || '');
  const fromMap = (m, val = (v) => v.length) =>
    [...m.entries()].map(([k, v]) => ({ key: k, count: val(v) }))
      .filter((x) => !np || norm(x.key).includes(np))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  switch (kind) {
    case 'relation_kinds': return cap(fromMap(BY_RELKIND), limit);
    case 'domains': return cap(fromMap(BY_DOMAIN), limit);
    case 'powers': return cap(fromMap(BY_FACULTY), limit);
    case 'item_classes': return cap(fromMap(BY_ITEMCLASS), limit);
    case 'iconography': return cap(fromMap(BY_ICON), limit);
    case 'places': return cap(fromMap(BY_PLACE), limit);
    case 'epithet_tags': return cap(fromMap(EPITHET_TAG, (v) => v.size), limit);
    case 'eras': {
      const rows = Object.entries(PR.ERA_ORDER || {}).map(([tradition, eras]) => ({ tradition, eras }))
        .filter((x) => !np || norm(x.tradition).includes(np));
      return cap(rows, limit);
    }
    case 'traditions': return cap(listTraditions().filter((x) => !np || norm(x.tradition).includes(np)).map((x) => ({ key: x.tradition, count: x.figures })), limit);
    default: return { error: `unknown vocabulary: ${kind}`, vocabularies: ['relation_kinds', 'domains', 'powers', 'item_classes', 'iconography', 'places', 'epithet_tags', 'eras', 'traditions'] };
  }
}

export function aggregate(group_by, { tradition, type, era, limit = 50 } = {}) {
  const dims = ['tradition', 'type', 'era', 'domain', 'power', 'item_class', 'relation_kind', 'death_manner'];
  if (!dims.includes(group_by)) return { error: `unknown group_by: ${group_by}`, dimensions: dims };
  const pass = (p) => (!tradition || norm(p.tradition) === norm(tradition)) && (!type || p.type === type) && (!era || (p.temporal || {}).era === era);
  const counts = new Map();
  const bump = (k) => { if (k) counts.set(k, (counts.get(k) || 0) + 1); };
  for (const id of IDS) {
    const p = PEOPLE[id];
    if (!pass(p)) continue;
    if (group_by === 'tradition') bump(p.tradition);
    else if (group_by === 'type') bump(p.type);
    else if (group_by === 'era') bump((p.temporal || {}).era);
    else if (group_by === 'domain') for (const d of (p.domains || [])) bump(d.sphereId || d.id);
    else if (group_by === 'power') for (const f of (p.faculties || [])) bump(f.id);
    else if (group_by === 'relation_kind') for (const r of (p.relations || [])) bump(r.kind);
    else if (group_by === 'death_manner') bump(p.death && p.death.manner && p.death.manner.classId);
  }
  if (group_by === 'item_class') for (const it of Object.values(ITEMS)) bump(it.classId);
  const rows = [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return cap(rows, Math.min(limit, 500));
}

// ── traditions ───────────────────────────────────────────────────────────────

export function listTraditions() {
  const m = new Map();
  for (const id of IDS) { const t = PEOPLE[id].tradition; m.set(t, (m.get(t) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([tradition, figures]) => ({ tradition, figures }));
}

export function traditionOverview(name) {
  const ids = IDS.filter((id) => norm(PEOPLE[id].tradition) === norm(name));
  if (!ids.length) {
    const cands = listTraditions().filter((t) => norm(t.tradition).includes(norm(name))).slice(0, 8);
    return { error: `no tradition matching "${name}"`, suggestions: cands };
  }
  const tradition = PEOPLE[ids[0]].tradition;
  const byType = {}; for (const id of ids) { const t = PEOPLE[id].type; byType[t] = (byType[t] || 0) + 1; }
  const eras = (PR.ERA_ORDER && PR.ERA_ORDER[tradition]) || [];
  const domainCount = new Map();
  for (const id of ids) for (const d of (PEOPLE[id].domains || [])) { const k = d.sphereId || d.id; if (k) domainCount.set(k, (domainCount.get(k) || 0) + 1); }
  const topDomains = [...domainCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, c]) => ({ sphere: k, figures: c }));
  const territory = (PR.seedAtlas && PR.seedAtlas[tradition]) ? (PR.seedAtlas[tradition].polygons || []).map((pg) => pg.period) : [];
  const top = ids.map((id) => ({ ...brief(id), divinity: (PR.divinity[id] || {}).tier })).slice(0, 30);
  return { tradition, figures: ids.length, byType, eras, top_domains: topDomains, territory, sample: top };
}

export const stats = {
  figures: IDS.length,
  traditions: new Set(IDS.map((id) => PEOPLE[id].tradition)).size,
  items: Object.keys(ITEMS).length,
  relation_kinds: BY_RELKIND.size,
  domains: BY_DOMAIN.size,
  powers: BY_FACULTY.size,
  places: BY_PLACE.size,
};
