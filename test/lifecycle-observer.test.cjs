const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const babel = require('@babel/standalone');

test('lifecycle resize callbacks ignore detached and replaced containers', () => {
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'dangerously' });
  const { window } = dom;
  const rootDir = path.resolve(__dirname, '..');
  const observers = [];
  let width = 640;
  let reads = 0;
  window.IS_REACT_ACT_ENVIRONMENT = true;
  window.Element.prototype.getBoundingClientRect = () => { reads++; return { width }; };
  window.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  window.__PR = {
    ERA_ORDER: { T0: ['E0', 'E1'] },
    ERA_DATES: { T0: {
      E0: { mythicStart: 0, mythicEnd: 100 },
      E1: { mythicStart: 100, mythicEnd: 200 },
    } },
  };
  window.formatYearSigned = String;
  for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) {
    window.eval(fs.readFileSync(path.join(rootDir, 'node_modules', file), 'utf8'));
  }
  window.eval(babel.transform(fs.readFileSync(path.join(rootDir, 'app/Lifecycle.jsx'), 'utf8'), {
    presets: ['react'],
  }).code + '\nwindow.TestTimeline = LifecycleTimeline;');
  const root = window.ReactDOM.createRoot(window.document.getElementById('root'));
  const act = window.React.act;
  const render = tradition => act(() => root.render(window.React.createElement(window.TestTimeline, {
    lc: [{ era: 'E0', typeStatus: 'mortal', vitalStatus: 'alive' }], tradition,
  })));
  let mounted = true;
  try {
    render('T0');
    assert.equal(observers.length, 1);
    assert.ok(window.document.querySelector('.lifecycle-svg'));
    const first = observers[0];

    render('T1');
    assert.equal(first.disconnected, true);
    assert.equal(first.target.isConnected, false);
    assert.doesNotThrow(() => first.callback());

    render('T0');
    assert.equal(observers.length, 2);
    const second = observers[1];
    assert.notEqual(second.target, first.target);
    const readsBeforeStaleCallback = reads;
    act(() => first.callback());
    assert.equal(reads, readsBeforeStaleCallback, 'old observer must not measure the replacement');

    width = 900;
    act(() => second.callback());
    assert.equal(window.document.querySelector('.lifecycle-svg').getAttribute('width'), '900');
    act(() => root.unmount());
    mounted = false;
    assert.equal(second.disconnected, true);
    assert.doesNotThrow(() => second.callback());
  } finally {
    if (mounted) act(() => root.unmount());
    window.close();
  }
});
