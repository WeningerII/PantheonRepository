// corpus.mjs — load the Pantheon Registry corpus exactly as the test/build
// pipeline does (run app/data.js in a VM, read window.__PR) and expose a small
// query API over it. Single source of truth: no data is duplicated here.
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
const IDS = Object.keys(PEOPLE);

const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const primary = (p) => (p.name && p.name.primary) || p.id;
const names = (p) => [primary(p), ...((p.name && p.name.alt) || [])];

// id -> [child figures], built once
const CHILDREN = new Map();
for (const id of IDS) for (const pid of (PEOPLE[id].parentIds || [])) {
  if (!CHILDREN.has(pid)) CHILDREN.set(pid, []);
  CHILDREN.get(pid).push(id);
}

// undirected adjacency for relationship path-finding: parent edges + relations
const ADJ = new Map();
const link = (a, b, label) => {
  if (!a || !b || !PEOPLE[a] || !PEOPLE[b]) return;
  if (!ADJ.has(a)) ADJ.set(a, []);
  ADJ.get(a).push({ to: b, label });
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

const brief = (id) => {
  const p = PEOPLE[id]; if (!p) return null;
  return { id, name: primary(p), tradition: p.tradition, type: p.type, era: p.temporal && p.temporal.era };
};

const sourcesOf = (p) => {
  const out = [];
  for (const s of (p.sources || [])) for (const c of (s.citations || [])) if (c && c.reference) out.push(c.reference);
  return [...new Set(out)];
};

export function getFigure(id) {
  const p = PEOPLE[id]; if (!p) return null;
  const div = (PR.divinity && PR.divinity[id]) || null;
  return {
    id, name: p.name, type: p.type, tradition: p.tradition, sex: p.sex, vitalStatus: p.vitalStatus,
    era: p.temporal && p.temporal.era,
    divinity: div && { fraction: div.fraction, tier: div.tier },
    parents: (p.parentIds || []).map(brief).filter(Boolean),
    children: (CHILDREN.get(id) || []).map(brief).filter(Boolean),
    domains: (p.domains || []).map((d) => ({ sphere: d.sphereId, context: d.contextTag })),
    faculties: (p.faculties || []).map((f) => ({ id: f.id, name: f.name })),
    materialCulture: (p.materialCulture || []).map((m) => ({ id: m.id, name: m.name, kind: m.kind })),
    epithets: (p.epithets || []).map((e) => e.original).filter(Boolean),
    relations: (p.relations || []).filter((r) => r.personId).map((r) => ({ kind: r.kind, ...(brief(r.personId) || { id: r.personId }) })),
    notes: p.notes || '',
    sources: sourcesOf(p),
  };
}

export function searchFigures(q, { tradition, type, era, limit = 25 } = {}) {
  const nq = norm(q);
  const hits = [];
  for (const id of IDS) {
    const p = PEOPLE[id];
    if (tradition && norm(p.tradition) !== norm(tradition)) continue;
    if (type && p.type !== type) continue;
    if (era && (p.temporal && p.temporal.era) !== era) continue;
    if (!nq) { hits.push({ id, score: 0 }); continue; }
    const ns = names(p).map(norm);
    let score = null;
    if (ns.some((n) => n === nq)) score = 0;
    else if (ns.some((n) => n.startsWith(nq))) score = 1;
    else if (ns.some((n) => n.includes(nq))) score = 2;
    else if (norm(p.notes).includes(nq)) score = 3;
    if (score != null) hits.push({ id, score });
  }
  hits.sort((a, b) => a.score - b.score || primary(PEOPLE[a.id]).localeCompare(primary(PEOPLE[b.id])));
  return { total: hits.length, results: hits.slice(0, limit).map((h) => brief(h.id)) };
}

export function relate(aId, bId, { maxHops = 8 } = {}) {
  if (!PEOPLE[aId]) return { error: `unknown id: ${aId}` };
  if (!PEOPLE[bId]) return { error: `unknown id: ${bId}` };
  if (aId === bId) return { path: [brief(aId)], hops: 0 };
  const prev = new Map([[aId, null]]);
  let frontier = [aId], depth = 0;
  while (frontier.length && depth < maxHops) {
    const next = [];
    for (const cur of frontier) for (const { to, label } of (ADJ.get(cur) || [])) {
      if (prev.has(to)) continue;
      prev.set(to, { from: cur, label });
      if (to === bId) {
        const steps = [];
        let n = bId;
        while (prev.get(n)) { const e = prev.get(n); steps.unshift({ ...brief(n), via: e.label }); n = e.from; }
        steps.unshift(brief(aId));
        return { hops: steps.length - 1, path: steps };
      }
      next.push(to);
    }
    frontier = next; depth++;
  }
  return { hops: null, path: null, note: `no path within ${maxHops} hops` };
}

export function lineage(id, { depth = 3 } = {}) {
  if (!PEOPLE[id]) return { error: `unknown id: ${id}` };
  const walk = (start, step) => {
    const out = [], seen = new Set([start]);
    let frontier = [{ id: start, d: 0 }];
    while (frontier.length) {
      const next = [];
      for (const { id: cur, d } of frontier) {
        if (d >= depth) continue;
        for (const nb of step(cur)) if (!seen.has(nb)) { seen.add(nb); out.push({ ...brief(nb), depth: d + 1 }); next.push({ id: nb, d: d + 1 }); }
      }
      frontier = next;
    }
    return out;
  };
  return {
    figure: brief(id),
    ancestors: walk(id, (c) => PEOPLE[c].parentIds || []),
    descendants: walk(id, (c) => CHILDREN.get(c) || []),
  };
}

export function equivalents(id) {
  const p = PEOPLE[id]; if (!p) return { error: `unknown id: ${id}` };
  const seen = new Set(), eq = [];
  for (const r of (p.relations || [])) {
    if (!r.personId || !/equated-with|interpretatio/.test(r.kind) || seen.has(r.personId)) continue;
    seen.add(r.personId);
    eq.push({ kind: r.kind, ...(brief(r.personId) || { id: r.personId }), note: r.notes || '' });
  }
  return { figure: brief(id), equivalents: eq };
}

export function whoGoverns(sphere, { limit = 50 } = {}) {
  const ns = norm(sphere);
  const out = [];
  for (const id of IDS) for (const d of (PEOPLE[id].domains || [])) if (norm(d.sphereId).includes(ns)) { out.push({ ...brief(id), sphere: d.sphereId }); break; }
  return { sphere, total: out.length, results: out.slice(0, limit) };
}

export function whoWields(power, { limit = 50 } = {}) {
  const ns = norm(power);
  const out = [];
  for (const id of IDS) for (const f of (PEOPLE[id].faculties || [])) if (norm(f.id).includes(ns) || norm(f.name).includes(ns)) { out.push({ ...brief(id), faculty: f.name }); break; }
  return { power, total: out.length, results: out.slice(0, limit) };
}

export function listTraditions() {
  const m = new Map();
  for (const id of IDS) { const t = PEOPLE[id].tradition; m.set(t, (m.get(t) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([tradition, figures]) => ({ tradition, figures }));
}

export function traditionOverview(name) {
  const ids = IDS.filter((id) => norm(PEOPLE[id].tradition) === norm(name));
  if (!ids.length) return { error: `no tradition matching "${name}"` };
  const tradition = PEOPLE[ids[0]].tradition;
  const byType = {}; for (const id of ids) { const t = PEOPLE[id].type; byType[t] = (byType[t] || 0) + 1; }
  const eras = PR.ERA_ORDER && PR.ERA_ORDER[tradition] || [];
  const top = ids.map(brief).slice(0, 30);
  const territory = (PR.seedAtlas && PR.seedAtlas[tradition]) ? (PR.seedAtlas[tradition].polygons || []).map((p) => p.period) : [];
  return { tradition, figures: ids.length, byType, eras, territory, sample: top };
}

export const stats = { figures: IDS.length, traditions: new Set(IDS.map((id) => PEOPLE[id].tradition)).size, items: PR.items ? Object.keys(PR.items).length : 0 };
