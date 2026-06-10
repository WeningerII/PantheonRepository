// The app's script manifest exists in three places that must agree:
//   index.html  — dev entry point (in-browser Babel)
//   build.py    — JSX_FILES baked into the dist artifact
//   boot.cjs    — the test harness boot order
// They have drifted before: index.html shipped without Items.jsx, so the
// documented dev mode crashed on the Items tab while the build and the test
// suite (which both had it) stayed green.
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
