// The app's script manifest exists in three places that must agree:
//   index.html  — dev entry point (in-browser Babel)
//   build.py    — JSX_FILES baked into the dist artifact
//   boot.cjs    — the test harness boot order
// They have drifted before: index.html shipped without Items.jsx, so the
// documented dev mode crashed on the Items tab while the build and the test
// suite (which both had it) stayed green.
//
// The Pages shell (build.py --pages) shares JSX_FILES and the template, so
// its UI-script list cannot drift on its own — but its data layer is built
// separately and its order is load-bearing: __PR_DATA before core.js before
// pr-boot (pr-boot reads both), and all of it before state.jsx's module-scope
// __PR reads. The artifact's data layer is load-bearing the same way: core +
// __PR_DATA + pr-boot must all precede the UI scripts (main.jsx keys the
// skeleton boot off __PR.ready), and the inert application/json payloads must
// carry the ids __PR_DATA names. Both orders are pinned below.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function indexHtmlManifest() {
  const html = read('index.html');
  return [...html.matchAll(/<script type="text\/babel"[^>]*src="app\/([\w.]+\.jsx)"/g)].map((m) => m[1]);
}

function buildPyManifest() {
  const py = read('build.py');
  const m = py.match(/JSX_FILES = \[([^\]]+)\]/);
  assert.ok(m, 'JSX_FILES not found in build.py');
  return [...m[1].matchAll(/'([\w.]+\.jsx)'/g)].map((x) => x[1]);
}

function bootManifest() {
  const js = read('test/helpers/boot.cjs');
  const m = js.match(/const JSX = \[([^\]]+)\]/);
  assert.ok(m, 'JSX list not found in boot.cjs');
  return [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1] + '.jsx');
}

function appJsxOnDisk() {
  return fs.readdirSync(path.join(ROOT, 'app')).filter((f) => f.endsWith('.jsx'));
}

test('index.html, build.py, and the test harness load the same JSX files in the same order', () => {
  const html = indexHtmlManifest();
  const py = buildPyManifest();
  const boot = bootManifest();
  assert.deepStrictEqual(html, py, 'index.html and build.py manifests differ');
  assert.deepStrictEqual(py, boot, 'build.py and test-harness manifests differ');
});

test('every app/*.jsx on disk is in the manifest (no orphaned components)', () => {
  const onDisk = new Set(appJsxOnDisk());
  const manifest = new Set(buildPyManifest());
  for (const f of onDisk) assert.ok(manifest.has(f), `app/${f} exists but no entry point loads it`);
  for (const f of manifest) assert.ok(onDisk.has(f), `manifest lists app/${f} which does not exist`);
});

// Both data layers are built as one parenthesized literal each; the pages
// one fetches tiers by URL, the artifact one names embedded element ids.
function dataLayers() {
  const py = read('build.py');
  const blocks = [...py.matchAll(/data_layer = \(([\s\S]*?)<\/script>'\)/g)].map((m) => m[1]);
  assert.strictEqual(blocks.length, 2, 'expected exactly two data_layer constructions (artifact + pages)');
  const pages = blocks.find((b) => b.includes('window.__PR_DATA') && !b.includes('embeddedCorpus'));
  const artifact = blocks.find((b) => b.includes('embeddedCorpus'));
  assert.ok(pages, 'pages data_layer not found in build.py');
  assert.ok(artifact, 'artifact (embedded) data_layer not found in build.py');
  return { py, pages, artifact };
}

// Anchors must be present, unique within their block, and in order.
function assertOrdered(layer, order, label) {
  let last = -1;
  for (const anchor of order) {
    const at = layer.indexOf(anchor);
    assert.ok(at !== -1, `${label} data layer is missing: ${anchor}`);
    assert.strictEqual(layer.indexOf(anchor, at + 1), -1, `${label} data layer anchor not unique: ${anchor}`);
    assert.ok(at > last, `${label} data layer out of order at: ${anchor}`);
    last = at;
  }
}

test('the Pages shell keeps pr-boot after core/__PR_DATA and before the UI scripts', () => {
  const { py, pages: pagesLayer } = dataLayers();

  // Emission order inside the pages data layer: the __PR_DATA one-liner
  // (pr-boot reads it), the core.js tag (module-scope __PR constants), then
  // the inlined pr-boot itself.
  assertOrdered(pagesLayer,
    ['window.__PR_DATA', 'window.__PR_REGISTRY_DATA', 'window.__PR_TIER_DATA', 'tiers["core"]', 'pr-boot.js (async data loader, inlined)'], 'pages');
  // Both modes inline the real loader file, not a copy.
  assert.match(py, /data_name = 'pr-boot\.js'/, 'the build must inline app/pr-boot.js');

  // Both modes share one template: the whole data layer slots in once,
  // before the single UI-script block — so the pages shell's UI list is
  // JSX_FILES by construction, and pr-boot always precedes state.jsx (the
  // manifest's mandatory first entry).
  const tmpl = py.match(/template = r"""([\s\S]*?)"""/);
  assert.ok(tmpl, 'template not found in build.py');
  for (const token of ['__DATA_LAYER__', '__UI_SCRIPTS__']) {
    const at = tmpl[1].indexOf(token);
    assert.ok(at !== -1, `template must slot ${token}`);
    assert.strictEqual(tmpl[1].indexOf(token, at + 1), -1, `${token} must appear exactly once in the template`);
  }
  assert.ok(tmpl[1].indexOf('__DATA_LAYER__') < tmpl[1].indexOf('__UI_SCRIPTS__'),
    'the data layer must precede the UI scripts');
  assert.strictEqual(buildPyManifest()[0], 'state.jsx',
    'state.jsx must lead the UI manifest — pr-boot relies on running before it');
});

test('the artifact embeds the tiers as inert JSON: core, __PR_DATA, pr-boot, then the payload blocks', () => {
  const { py, artifact } = dataLayers();

  // Emission order: the inlined core constants and the embedded __PR_DATA
  // one-liner, pr-boot (which reads both), then the application/json blocks
  // whose ids __PR_DATA names. The executable scripts must all precede the
  // 20+ MB payloads so they parse before the tokenizer walks the JSON; the
  // blocks may sit after pr-boot because it reads them at DOMContentLoaded.
  assertOrdered(artifact, [
    'core constants (dist/data core.js, inlined)',
    "embeddedIndex: 'pr-data-index'",
    'pr-boot.js (async data loader, inlined)',
    '<script type="application/json" id="pr-data-index">',
    '<script type="application/json" id="pr-data-corpus">',
  ], 'artifact');

  // The 23 MB executable data.js literal is retired from the artifact: no
  // mode may fall back to inlining it, and the payloads must be escaped
  // (safe() — '<\/script' stays valid JSON) rather than emitted raw.
  assert.doesNotMatch(py, /data_name = 'data\.js'/, 'the artifact must not inline app/data.js');
  assert.match(py, /index_payload = safe\(/, 'the index payload must be safe()-escaped');
  assert.match(py, /corpus_payload = safe\(/, 'the corpus payload must be safe()-escaped');
});
