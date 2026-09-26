const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const babel = require('@babel/standalone');

const citation = { reference: 'Text 1, section 2', url: 'https://example.org/text' };
const record = (id, type = 'mortal', parentIds = []) => ({ id, type, parentIds,
  tradition: 'T0', name: { primary: id }, faculties: [] });
const account = (id, parents, extra = {}) => ({ id, label: id, kind: 'claimed-genealogy',
  lineageGroup: 'G0', description: 'A claimed pedigree with disputed historical value.',
  parents: parents.map(personId => ({ personId, kind: 'parent', sources: [citation] })),
  sources: [citation], ...extra });

async function mounted(records, focusId) {
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'outside-only', url: 'https://example.org/' });
  const w = dom.window;
  w.MessageChannel = class {
    constructor() {
      this.port1 = { onmessage: null };
      this.port2 = { postMessage: () => setTimeout(() => this.port1.onmessage?.(), 0) };
    }
  };
  const modules = path.join(__dirname, '../node_modules');
  for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) {
    w.eval(fs.readFileSync(path.join(modules, file), 'utf8'));
  }
  w.IS_REACT_ACT_ENVIRONMENT = true;
  w.__PR = { divinity: Object.fromEntries(records.map(p => [p.id, {
    fraction: p.type === 'deity' ? 1 : 0, tier: p.type, basis: p.type === 'deity' ? 'axiom-deity' : 'axiom-mortal', contributions: [],
  }])) };
  w.eval(fs.readFileSync(path.join(__dirname, '../app/account-model.js'), 'utf8'));
  for (const file of ['state.jsx', 'Lineage.jsx', 'Detail.jsx']) {
    w.eval(babel.transform(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), { presets: ['react'] }).code);
  }
  const byId = new w.Map(records.map(p => [p.id, p]));
  const childrenOf = new w.Map();
  for (const p of records) for (const pid of p.parentIds) {
    if (!childrenOf.has(pid)) childrenOf.set(pid, []);
    childrenOf.get(pid).push(p.id);
  }
  const root = w.ReactDOM.createRoot(w.document.getElementById('root'));
  const render = async id => w.React.act(async () => root.render(w.React.createElement(w.Detail, {
    entry: byId.get(id), byId, childrenOf, onOpen: render, onClose() {},
  })));
  await render(focusId);
  return { w, render, byId,
    select: async (id, value) => {
      const input = w.document.querySelector(`[aria-label="Parentage account for ${id}"]`);
      assert.ok(input, 'Account selector is available');
      await w.React.act(async () => { input.value = value; input.dispatchEvent(new w.Event('change', { bubbles: true })); });
    },
    close: async () => { await w.React.act(async () => root.unmount()); w.close(); },
  };
}

test('one account selection updates the header, parents, tree, descent and inherited candidates together', async () => {
  const records = ['N0', 'N1', 'N2', 'N3', 'N4', 'N5'].map(id => record(id));
  records[0].parentIds = ['N1', 'N2'];
  records[0].parentageAccounts = [account('A0', ['N3', 'N2'])];
  records[3].parentageAccounts = [account('A1', ['N4', 'N5'])];
  records[4].type = 'deity';
  records[4].faculties = [{ id: 'capacity', inheritability: 'full' }];
  const app = await mounted(records, 'N0');
  const doc = app.w.document;
  try {
    assert.equal(doc.querySelector('.eyebrow-tier').textContent, 'Mortal');
    assert.match(doc.querySelector('.detail-header').textContent, /Claimed genealogy available/);
    await app.select('N0', 'A0');
    assert.equal(doc.querySelector('.eyebrow-tier').textContent, 'Quartigod');
    assert.deepEqual([...doc.querySelectorAll('.parentage .who-name')].map(n => n.textContent), ['N3', 'N2']);
    assert.match(doc.querySelector('.parentage .who-meta').textContent, /Demigod/);
    assert.equal(doc.querySelector('[aria-label="Parentage account for N3"]').value, 'A1');
    assert.match(doc.querySelector('.section-descent').textContent, /0.25/);
    assert.match(doc.querySelector('.section-descent').textContent, /Claimed genealogy/);
    assert.match(doc.querySelector('.power-cand').textContent, /capacity.*N4.*grandparent/);
    records[3].faculties = [{ id: 'new-capacity', inheritability: 'full' }];
    app.w.__PR.detailVersion = 1;
    await app.render('N0');
    assert.match(doc.querySelector('.section-powers').textContent, /new capacity/, 'Late detail hydration refreshes selected inheritance');
    assert.ok([...doc.querySelectorAll('.lineage-account a')].some(a => a.href === citation.url));
    assert.doesNotMatch(doc.querySelector('.detail').textContent, /Descent calculations below use the recorded default/);
    assert.deepEqual(app.byId.get('N0').parentIds, ['N1', 'N2'], 'Selection does not rewrite the corpus');
    await app.select('N0', '');
    assert.equal(doc.querySelector('.eyebrow-tier').textContent, 'Mortal');
    assert.equal(doc.querySelector('.power-cand'), null);
    await app.select('N0', 'A0');
    await app.render('N1');
    assert.equal(doc.querySelector('.eyebrow-tier').textContent, 'Mortal');
    assert.equal(doc.querySelector('.power-cand'), null);
    await app.render('N0');
    assert.equal(doc.querySelector('.eyebrow-tier').textContent, 'Mortal');
    assert.equal(doc.querySelector('[aria-label="Parentage account for N0"]').value, '');
  } finally { await app.close(); }
});

test('competing grouped pedigrees expose a resolving selector and keep descent uncertain until a choice is made', async () => {
  const records = Array.from({ length: 9 }, (_, i) => record(`N${i}`));
  records[0].parentageAccounts = [account('A0', ['N1', 'N2'])];
  records[1].parentageAccounts = [account('A1', ['N3', 'N4']), account('B1', ['N3', 'N4'], { lineageGroup: 'G1' })];
  records[2].parentageAccounts = [account('A2', ['N3', 'N5'])];
  records[3].parentageAccounts = [account('A3', ['N6', 'N7']), account('B3', ['N8', 'N7'], { lineageGroup: 'G1' })];
  records[6].type = 'deity';
  const app = await mounted(records, 'N0');
  try {
    await app.select('N0', 'A0');
    await app.select('N1', 'B1');
    assert.match(app.w.document.querySelector('[role="status"]').textContent, /Conflicting pedigree accounts for N3/);
    assert.equal(app.w.document.querySelector('.descent-frac').textContent, 'Unquantified');
    await app.select('N3', 'A3');
    assert.equal(app.w.document.querySelector('[role="status"]'), null);
    assert.notEqual(app.w.document.querySelector('.descent-frac').textContent, 'Unquantified');
  } finally { await app.close(); }
});

test('missing co-parents preserve claimed divine ancestry without an invented percentage', async () => {
  const records = [record('N0'), record('N1', 'deity')];
  records[0].parentageAccounts = [account('A0', ['N1'])];
  const app = await mounted(records, 'N0');
  try {
    await app.select('N0', 'A0');
    const doc = app.w.document;
    assert.equal(doc.querySelector('.eyebrow-tier').textContent, 'Claimed divine ancestry');
    assert.equal(doc.querySelector('.descent-frac').textContent, 'Unquantified');
    assert.match(doc.querySelector('.section-descent').textContent, /missing parents are not assumed mortal/);
    assert.match(doc.querySelector('.lineage-account').textContent, /disputed historical value/);
    assert.equal(doc.querySelector('.descent-formula'), null);
    assert.doesNotMatch(doc.querySelector('.section-descent').textContent, /Wholly mortal/);
  } finally { await app.close(); }
});

test('recorded and selected incomplete parentage use the same uncertain arithmetic while preserving the recorded heading', async () => {
  const records = [record('N0', 'demigod', ['N1']), record('N1', 'deity')];
  records[0].parentageAccounts = [account('A0', ['N1']), account('A1', [])];
  const app = await mounted(records, 'N0');
  try {
    const doc = app.w.document;
    assert.equal(doc.querySelector('.eyebrow-tier').textContent, 'Demigod');
    assert.match(doc.querySelector('.eyebrow').textContent, /recorded classification/);
    assert.equal(doc.querySelector('.descent-frac').textContent, 'Unquantified');
    assert.doesNotMatch(doc.querySelector('.section-descent').textContent, /Selected parentage/);
    await app.select('N0', 'A0');
    assert.equal(doc.querySelector('.descent-frac').textContent, 'Unquantified');
    assert.equal(doc.querySelector('.eyebrow-tier').textContent, 'Claimed divine ancestry');
    await app.select('N0', 'A1');
    assert.match(doc.querySelector('.detail').textContent, /This account explicitly records no parents/);
  } finally { await app.close(); }
});

test('claimed pedigree access stays bounded initially and one explicit action reveals every reachable generation', async () => {
  const records = Array.from({ length: 12 }, (_, i) => record(`N${i}`, i ? 'mortal' : 'deity'));
  for (let i = 1; i < records.length; i++) records[i].parentageAccounts = [account(`A${i}`, [`N${i - 1}`])];
  const app = await mounted(records, 'N11');
  try {
    const doc = app.w.document;
    const shortcut = [...doc.querySelectorAll('.detail-header button')].find(b => b.textContent === 'A11');
    assert.ok(shortcut, 'A claimed account can be opened directly from the profile header');
    await app.w.React.act(async () => shortcut.click());
    assert.equal(doc.querySelectorAll('.lineage-card').length, 3, 'Initial depth remains bounded');
    const expand = [...doc.querySelectorAll('.lineage-controls button')].find(b => b.textContent === 'Show all ancestors');
    assert.equal(expand.disabled, false);
    await app.w.React.act(async () => expand.click());
    assert.equal(doc.querySelectorAll('.lineage-card').length, 12);
    assert.equal(expand.disabled, true);
    assert.match(doc.querySelector('.lineage-controls').textContent, /11↑/);
    assert.equal(doc.querySelector('[aria-label="More ancestor generations"]').disabled, true);
    await app.render('N10');
    assert.match(doc.querySelector('.lineage-controls').textContent, /2↑/);
  } finally { await app.close(); }
});
