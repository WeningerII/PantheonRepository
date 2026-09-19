const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const babel = require('@babel/standalone');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const scope = { React, window: {
  TYPE_TIER: {}, displayName: p => p.id, TierIcon: () => null,
} };
vm.createContext(scope);
vm.runInContext(babel.transform(fs.readFileSync(path.join(__dirname, '../app/Lineage.jsx'), 'utf8'), {
  presets: ['react'],
}).code, scope);

function graph(records) {
  const byId = new Map(records.map(p => [p.id, p]));
  const childrenOf = new Map();
  for (const p of records) for (const id of p.parentIds || []) {
    if (!childrenOf.has(id)) childrenOf.set(id, []);
    childrenOf.get(id).push(p.id);
  }
  return { byId, childrenOf };
}
const record = (id, parentIds = [], tradition = 'T0') => ({ id, parentIds, tradition });
const ids = tree => Array.from(tree.rows.flat());
const build = (g, id, up = 2, down = 2) =>
  scope.buildLineageTree(g.byId.get(id), g.byId, g.childrenOf, up, down);

test('arbitrary depth remains reachable in both directions and terminates at the boundary', () => {
  const g = graph(Array.from({ length: 13 }, (_, i) => record(`N${i}`, i ? [`N${i - 1}`] : [])));
  const bounded = build(g, 'N6');
  assert.equal(bounded.hasMoreUp, true);
  assert.equal(bounded.hasMoreDown, true);
  const full = build(g, 'N6', 20, 20);
  assert.equal(ids(full).length, 13);
  assert.equal(full.hasMoreUp, false);
  assert.equal(full.hasMoreDown, false);
  const html = renderToStaticMarkup(React.createElement(scope.window.Lineage, {
    entry: g.byId.get('N6'), ...g, onPick() {},
  }));
  assert.match(html, /aria-label="More ancestor generations"/);
  assert.match(html, /aria-label="More descendant generations"/);
});

test('shared ancestry, duplicate parent references and cycles never duplicate cards or edges', () => {
  const g = graph([record('N0', ['N2']), record('N1', ['N0']),
    record('N2', ['N0']), record('N3', ['N1', 'N2', 'N2'])]);
  const tree = build(g, 'N3', 30, 30);
  assert.equal(new Set(ids(tree)).size, ids(tree).length);
  assert.equal(ids(tree).length, 4);
  const layout = scope.layoutTree(tree, new Set());
  assert.equal(scope.computeEdges(layout.nodes, g.byId).length, 5);
});

test('cross-context parentage is traversed; equivalence never imports another genealogy', () => {
  const g = graph([record('N0'), record('N1', ['N0'], 'T1'),
    { ...record('N2', [], 'T2'), relations: [{ kind: 'equated with', personId: 'N0' }] },
    record('N3', ['N2'], 'T2')]);
  assert.deepEqual(ids(build(g, 'N0')), ['N0', 'N1']);
  assert.deepEqual(ids(build(g, 'N2')), ['N2', 'N3']);
});

test('collapsed branches retain connectors through aggregate cards and expand without edge loss', () => {
  const g = graph([record('N0'), ...Array.from({ length: 12 }, (_, i) => record(`C${i}`, ['N0'])),
    record('D0', ['C11'])]);
  const tree = build(g, 'N0');
  const collapsed = scope.layoutTree(tree, new Set());
  const d = collapsed.nodes.find(n => n.id === 'D0');
  const edges = scope.computeEdges(collapsed.nodes, g.byId);
  assert.ok(edges.some(e => e.aggregated && e.x2 === d.x + 76 && e.y2 === d.y));
  const expanded = scope.layoutTree(tree, new Set([1]));
  const allEdges = scope.computeEdges(expanded.nodes, g.byId);
  assert.equal(allEdges.length, 13);
  assert.equal(allEdges.some(e => e.aggregated), false);
});

test('wide sibling rows retain the focus and every hidden identifier is recoverable', () => {
  const g = graph([record('N0'), ...Array.from({ length: 40 }, (_, i) => record(`C${i}`, ['N0']))]);
  const tree = build(g, 'C20');
  const layout = scope.layoutTree(tree, new Set());
  assert.equal(layout.nodes.filter(n => n.id === 'C20').length, 1);
  const represented = layout.nodes.flatMap(n => n.id ? [n.id] : n.hiddenIds || []);
  assert.deepEqual(new Set(represented), new Set(ids(tree)));
});

test('isolated and unresolved records remain visible without asserting absence of historical parentage', () => {
  for (const entry of [record('N0'), record('N0', ['MISSING'])]) {
    const g = graph([entry]);
    const html = renderToStaticMarkup(React.createElement(scope.window.Lineage, { entry, ...g, onPick() {} }));
    assert.match(html, /No connected parentage records available/);
    assert.match(html, /lineage-card-name">N0/);
    assert.match(html, /Fewer ancestor generations/);
  }
});

test('identifier renaming preserves topology, layout and boundary flags', () => {
  const records = [record('N0'), record('N1', ['N0']), record('N2', ['N0']), record('N3', ['N1', 'N2'])];
  const renamed = records.map(p => ({ ...p, id: `X${p.id}`, parentIds: p.parentIds.map(id => `X${id}`) }));
  const a = graph(records), b = graph(renamed);
  const ta = build(a, 'N1'), tb = build(b, 'XN1');
  assert.deepEqual(ids(tb).map(id => id.slice(1)), ids(ta));
  const la = scope.layoutTree(ta, new Set()), lb = scope.layoutTree(tb, new Set());
  assert.equal(la.width, lb.width);
  assert.equal(la.height, lb.height);
  assert.deepEqual(scope.computeEdges(la.nodes, a.byId), scope.computeEdges(lb.nodes, b.byId));
});

test('generation controls pass four, stop at exhaustion, and recover from zero in the mounted component', async () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'outside-only' });
  const w = dom.window;
  w.MessageChannel = class {
    constructor() {
      this.port1 = { onmessage: null };
      this.port2 = { postMessage: () => setTimeout(() => this.port1.onmessage?.(), 0) };
    }
  };
  const nm = path.join(__dirname, '../node_modules');
  w.eval(fs.readFileSync(path.join(nm, 'react/umd/react.development.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(nm, 'react-dom/umd/react-dom.development.js'), 'utf8'));
  w.IS_REACT_ACT_ENVIRONMENT = true;
  w.TYPE_TIER = {};
  w.displayName = p => p.id;
  w.TierIcon = () => null;
  w.eval(babel.transform(fs.readFileSync(path.join(__dirname, '../app/Lineage.jsx'), 'utf8'), { presets: ['react'] }).code);
  const g = graph(Array.from({ length: 13 }, (_, i) => record(`N${i}`, i ? [`N${i - 1}`] : [])));
  const root = w.ReactDOM.createRoot(w.document.getElementById('root'));
  let picked;
  const click = async label => {
    const button = w.document.querySelector(`[aria-label="${label}"]`);
    assert.ok(button, label);
    await w.React.act(async () => button.click());
    return button;
  };
  try {
    await w.React.act(async () => root.render(w.React.createElement(w.Lineage, {
      entry: g.byId.get('N6'), ...g, onPick: id => { picked = id; },
    })));
    for (const direction of ['ancestor', 'descendant']) {
      for (let i = 0; i < 4; i++) await click(`More ${direction} generations`);
      assert.equal(w.document.querySelector(`[aria-label="More ${direction} generations"]`).disabled, true);
    }
    assert.equal(w.document.querySelectorAll('.lineage-card').length, 13);
    const other = w.document.querySelector('.lineage-card[role="button"]');
    await w.React.act(async () => other.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.equal(picked, other.querySelector('.lineage-card-name').textContent);
    for (const direction of ['ancestor', 'descendant']) {
      for (let i = 0; i < 6; i++) await click(`Fewer ${direction} generations`);
    }
    assert.equal(w.document.querySelectorAll('.lineage-card').length, 1);
    assert.match(w.document.querySelector('.lineage-status').textContent, /Generations are hidden/);
    await click('More ancestor generations');
    await click('More descendant generations');
    assert.equal(w.document.querySelectorAll('.lineage-card').length, 3);
  } finally {
    await w.React.act(async () => root.unmount());
    w.close();
  }
});
