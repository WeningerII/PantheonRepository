// Shared test harness: boots the real app inside jsdom using the same React /
// d3 / topojson UMD builds the page loads from a CDN (pinned as devDependencies),
// transforming app/*.jsx with @babel/standalone exactly as build.py does.
//
// jsdom has no layout engine, so we (a) stub the browser APIs the app touches
// that jsdom lacks (ResizeObserver, requestAnimationFrame, MessageChannel,
// scrollIntoView) and (b) report a realistic element size via
// getBoundingClientRect so size-driven views (Graph, Atlas, Lifecycle) lay out
// as they would in a real ~1200px panel. React effects are flushed with
// React.act so effect-based code actually runs.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const babel = require('@babel/standalone');

const ROOT = path.resolve(__dirname, '..', '..');
const NM = path.join(ROOT, 'node_modules');
const APP = path.join(ROOT, 'app');
const read = (p) => fs.readFileSync(p, 'utf8');

const LIB_FILES = [
  'react/umd/react.development.js',
  'react-dom/umd/react-dom.development.js',
  'd3/dist/d3.min.js',
  'topojson/dist/topojson.min.js',
].map((p) => path.join(NM, p));

// Same order build.py / index.html load them in.
const JSX = ['state', 'Browse', 'Lineage', 'Lifecycle', 'Detail', 'Items', 'Graph',
            'Atlas', 'CommandPalette', 'Shell', 'main'];

async function bootApp({ panelWidth = 1200, preSeedStorage = null } = {}) {
  const libCode = LIB_FILES.map(read);
  const dataJs = read(path.join(APP, 'data.js'));
  const ui = JSX.map((f) => babel.transform(read(path.join(APP, `${f}.jsx`)), {
    presets: [['react', { runtime: 'classic' }]], filename: `${f}.jsx`, compact: false,
  }).code);

  const dom = new JSDOM(
    '<!doctype html><html><body>'
    + '<div id="boot"><div id="boot-step"></div><div id="boot-bar"></div><div id="boot-err"></div></div>'
    + '<div id="app"></div></body></html>',
    { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;

  const errors = [];
  window.addEventListener('error', (e) => errors.push('error: ' + (e.error?.stack || e.message)));
  window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + (e.reason?.stack || e.reason)));
  // React reports render crashes swallowed by the ErrorBoundary through
  // console.error, never through a window 'error' event — capture those too
  // so a boundary-eaten crash can't pass as a clean boot.
  {
    const realErr = window.console.error.bind(window.console);
    window.console.error = (...a) => {
      const line = a.map(String).join(' ');
      // Expected: the initial mount runs at module scope (main.jsx), outside act().
      if (!/not wrapped in act/.test(line)) errors.push('console.error: ' + line);
      realErr(...a);
    };
  }

  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  // Serve the Atlas basemap from a committed fixture so the map view renders
  // real territory paths under test (a blanket rejection made the Atlas
  // assertion pass vacuously against its error placeholder). Everything else
  // stays offline.
  window.fetch = (url) => {
    if (String(url).includes('countries-110m.json')) {
      const body = read(path.join(ROOT, 'test', 'fixtures', 'countries-110m.json'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(body)) });
    }
    return Promise.reject(new Error('no network in tests: ' + url));
  };
  window.MessageChannel = require('worker_threads').MessageChannel; // React scheduler
  window.Element.prototype.scrollIntoView = function () {};
  window.Element.prototype.getBoundingClientRect = function () {
    return { width: panelWidth, height: 600, top: 0, left: 0, right: panelWidth, bottom: 600, x: 0, y: 0, toJSON() {} };
  };
  window.IS_REACT_ACT_ENVIRONMENT = true;

  // Let storage tests stage localStorage contents BEFORE data.js's
  // seed-if-empty pass and state.jsx's loaders run.
  if (preSeedStorage) preSeedStorage(window);

  const runScript = (code) => {
    const s = window.document.createElement('script');
    s.textContent = code;
    window.document.body.appendChild(s);
  };
  libCode.forEach(runScript);
  runScript(dataJs);
  ui.forEach(runScript);

  const act = window.React.act;
  const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  await flush(); // flush mount + passive effects

  const D = window.document;
  const key = (k, o = {}) => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, ...o }));
  const clickButton = async (label) => {
    await act(async () => {
      [...D.querySelectorAll('button')].find((b) => b.textContent.trim() === label)?.click();
    });
    await flush();
  };
  const openFirstFigure = async () => {
    await act(async () => { D.querySelector('.browse-table tbody tr:not(.browse-group-header)')?.click(); });
    await flush();
  };
  const openFigure = async (id) => {
    await act(async () => {
      window.location.hash = '#/browse/' + encodeURIComponent(id);
      window.dispatchEvent(new window.Event('hashchange'));
    });
    await flush();
  };
  const openItem = async (id) => {
    await act(async () => {
      window.location.hash = '#/items/' + encodeURIComponent(id);
      window.dispatchEvent(new window.Event('hashchange'));
    });
    await flush();
  };

  const close = () => { try { dom.window.close(); } catch (_) {} };

  return { dom, window, document: D, act, flush, errors, key, clickButton, openFirstFigure, openFigure, openItem, close };
}

module.exports = { bootApp };
