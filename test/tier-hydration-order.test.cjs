const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const BOOT = fs.readFileSync(path.join(__dirname, '../app/pr-boot.js'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const evidence = [{ kind: 'secondary', reference: 'Record 1', url: 'https://example.org/record' }];
const people = {
  N0: { id: 'N0', name: { primary: 'Figure 0' }, parentIds: ['N1'], parentRoles: { N1: 'father' },
    parentageAccounts: [{ id: 'A0', label: 'Reported parentage', description: 'A qualified alternative.',
      parents: [{ kind: 'parent', personId: 'N2', sources: evidence }], sources: evidence }],
    relations: [
      { kind: 'father', personId: 'N1', notes: 'Conventional parentage.', sources: evidence },
      { kind: 'partner', personId: 'N2', notes: 'Marriage remains disputed.', sources: evidence },
      { kind: 'ancestor (claimed)', externalRef: { name: 'Unnamed ancestor', tradition: 'T1' },
        notes: 'Distant claim, not direct parentage.', sources: evidence },
    ] },
  N1: { id: 'N1', name: { primary: 'Figure 1' }, parentIds: [], relations: [
    { kind: 'child', personId: 'N0', notes: 'Recorded child.', sources: evidence },
  ], faculties: [{id: 'F0', inheritability: 'heritable', name: 'Recorded faculty', sources: evidence}],
  lifecycle: [{typeStatus: 'mortal', era: 'E0', eraOrdering: 0, notes: 'Before transformation.'}] },
  N2: { id: 'N2', name: { primary: 'Figure 2' }, parentIds: [], relations: [
    { kind: 'partner', externalRef: { name: 'Unresolved partner', tradition: 'T0' },
      notes: 'Identity unresolved.', sources: evidence },
  ] },
};
for (const p of Object.values(people)) Object.assign(p, { tradition: 'T0', type: 'hero', temporal: { era: '' } });
const index = Object.values(people).map(p => ({ i: p.id, n: p.name.primary, t: 'T0', y: 'hero', e: '', d: null }));
const edges = {
  N0: { p: ['N1'], pr: { N1: 'father' }, pa: people.N0.parentageAccounts,
    r: [{ k: 'father', id: 'N1' }, { k: 'partner', id: 'N2' }] },
  N1: { r: [{ k: 'child', id: 'N0' }], af: [{id: 'F0', inheritability: 'heritable'}],
    al: [{typeStatus: 'mortal', era: 'E0', eraOrdering: 0}] },
};

async function boot({ legacy = false } = {}) {
  const pending = new Map(), fetched = [], events = [];
  let indexInstalled;
  const indexReady = new Promise(resolve => { indexInstalled = resolve; });
  const store = new Map();
  const context = {
    setTimeout,
    console: { log() {}, warn() {}, error() {} },
    document: { getElementById: () => null },
    CustomEvent: class { constructor(type) { this.type = type; } },
    localStorage: { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    fetch: url => {
      fetched.push(url);
      const response = body => ({ ok: true, json: async () => copy(body), text: async () => JSON.stringify(body) });
      if (url === 'index.json') return Promise.resolve(response(index));
      return new Promise(resolve => pending.set(url, body => resolve(response(body))));
    },
    window: {
      __PR_DATA: { index: 'index.json', ...(legacy ? { corpus: 'corpus.json' } : {}) },
      __PR_TIER_DATA: { edges: 'edges.json' },
      __PR_DETAILS_DATA: { dir: 'details/', buckets: 2, shards: ['0.json', '1.json'] },
      dispatchEvent: event => {
        events.push(event.type);
        if (event.type === 'pr:index') indexInstalled();
      },
    },
  };
  vm.runInNewContext(BOOT, context, { filename: 'pr-boot.js' });
  await indexReady;
  return { PR: context.window.__PR, fetched, events,
    respond: (url, body) => { assert.ok(pending.has(url), `request pending: ${url}`); pending.get(url)(body); pending.delete(url); } };
}

for (const order of ['detail-first', 'edges-first']) {
  test(`rich claims survive concurrent tier loading in ${order} response order`, async () => {
    const b = await boot();
    const original = b.PR.seedPeople.N0;
    const edgePromise = b.PR.loadTier('edges');
    const detailPromise = b.PR.loadDetail('N0');
    const detail = { N0: people.N0, N2: people.N2 };
    if (order === 'detail-first') {
      b.respond('details/0.json', detail); await detailPromise;
      b.respond('edges.json', edges); await edgePromise;
    } else {
      b.respond('edges.json', edges); await edgePromise;
      b.respond('details/0.json', detail); await detailPromise;
    }
    assert.equal(b.PR.seedPeople.N0, original, 'hydration preserves existing record identity');
    for (const id of ['N0', 'N2']) {
      assert.deepEqual(copy(b.PR.seedPeople[id]), { ...copy(people[id]), _full: true }, `${id}: no rich fields lost`);
    }
    assert.deepEqual(copy(b.PR.seedPeople.N1.relations), [{ kind: 'child', personId: 'N0' }],
      'edge tier still hydrates records outside the detail shard');
    assert.deepEqual(copy(b.PR.seedPeople.N1.faculties), edges.N1.af,
      'unopened ancestors carry the metadata needed for selected-account inheritance');
    assert.deepEqual(copy(b.PR.seedPeople.N1.lifecycle), edges.N1.al,
      'status at conception does not require a full ancestor biography');
    assert.equal(b.PR.tierReady.edges, true);
    assert.equal(b.PR.dataReady, false, 'loading details never requests the full corpus');
    await b.PR.loadDetail('N0');
    assert.deepEqual(b.fetched, ['index.json', 'edges.json', 'details/0.json'], 'no retry or corpus workaround');
  });
}

test('a late edge response cannot replace claims after the full corpus installs', async () => {
  const b = await boot({ legacy: true });
  const edgePromise = b.PR.loadTier('edges');
  b.respond('corpus.json', { seedPeople: people, seedAtlas: {} });
  await b.PR.ready;
  const before = copy(b.PR.seedPeople);
  const version = b.PR.corpusVersion;
  b.respond('edges.json', edges);
  await edgePromise;
  assert.deepEqual(copy(b.PR.seedPeople), before);
  assert.equal(b.PR.corpusVersion, version, 'redundant projection does not invalidate full-corpus caches');
  assert.equal(b.PR.tierReady.edges, true);
  assert.equal(b.PR.dataReady, true);
});
