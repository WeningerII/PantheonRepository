#!/usr/bin/env python3
"""
Build script for the single-file deployable artifact.

Pre-transforms each app/*.jsx through Babel (no in-browser transformer),
inlines everything alongside app/data.js and app/styles.css, and writes
dist/pantheon-registry.html — a self-contained HTML file you can open
from disk, host as a static file, or drop into a Claude.ai artifact.

Prerequisites:
  npm install            # installs @babel/standalone

Usage:
  python3 build.py
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP  = ROOT / 'app'
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)

JSX_FILES = [
    'state.jsx', 'Browse.jsx', 'Lineage.jsx', 'Lifecycle.jsx', 'Detail.jsx',
    'Items.jsx', 'Graph.jsx', 'Atlas.jsx', 'CommandPalette.jsx', 'Shell.jsx', 'main.jsx',
]


def transform_jsx(filename: str) -> str:
    """Run app/<filename> through Babel via Node and return the transformed code."""
    node_script = """
const babel = require('@babel/standalone');
const src = require('fs').readFileSync(process.argv[1], 'utf8');
const out = babel.transform(src, {
  presets: [['react', { runtime: 'classic' }]],
  filename: process.argv[1],
  sourceMaps: false,
  compact: false,
});
process.stdout.write(out.code);
"""
    full_path = str(APP / filename)
    proc = subprocess.run(
        ['node', '-e', node_script, full_path],
        capture_output=True, text=True, cwd=ROOT,
    )
    if proc.returncode != 0:
        print(f'!! Babel failed on {filename}:\n{proc.stderr}', file=sys.stderr)
        sys.exit(1)
    return proc.stdout


def safe(src: str) -> str:
    """Escape any literal </script in an inline payload."""
    return src.replace('</script', '<\\/script')


def main() -> None:
    print('Pre-transforming JSX...')
    transformed = {}
    for f in JSX_FILES:
        src = (APP / f).read_text()
        code = transform_jsx(f)
        transformed[f] = code
        print(f'  {f:24s}  {len(src):>7,} → {len(code):>7,} bytes')

    styles_css = (APP / 'styles.css').read_text()
    data_js    = (APP / 'data.js').read_text()

    # Sanity: no payload may contain </script>
    for name, body in [('styles.css', styles_css), ('data.js', data_js),
                       *((f, transformed[f]) for f in JSX_FILES)]:
        if '</script>' in body.lower():
            print(f'!! {name} contains </script>', file=sys.stderr)
            sys.exit(1)

    script_blocks = '\n'.join(
        f'<!-- {f} (pre-transformed) -->\n<script>\n{safe(transformed[f])}\n</script>'
        for f in JSX_FILES
    )

    template = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pantheon Registry</title>

<!-- Early error trap. Surfaces boot-time errors into the visible boot overlay. -->
<script>
(function () {
  function show(msg) {
    var step = document.getElementById('boot-step');
    var err  = document.getElementById('boot-err');
    if (step) step.textContent = 'failed';
    if (err)  { err.style.display = 'block'; err.textContent = String(msg); }
  }
  window.addEventListener('error', function (e) {
    if (window.__bootDone) return;
    show((e.error && (e.error.stack || e.error.message)) || e.message || 'unknown error');
  });
  window.addEventListener('unhandledrejection', function (e) {
    if (window.__bootDone) return;
    var r = e.reason;
    show((r && (r.stack || r.message)) || String(r) || 'unhandled rejection');
  });
})();
</script>

<!-- Storage shim — activates only when real localStorage throws (artifact srcdoc). -->
<script>
(function () {
  try {
    localStorage.setItem('__storageProbe__', '1');
    localStorage.removeItem('__storageProbe__');
    return;
  } catch (_) {}
  var store = new Map();
  var mem = {
    getItem:    function (k) { return store.has(k) ? store.get(k) : null; },
    setItem:    function (k, v) { store.set(k, String(v)); },
    removeItem: function (k) { store.delete(k); },
    clear:      function () { store.clear(); },
    key:        function (i) { return Array.from(store.keys())[i] || null; },
  };
  Object.defineProperty(mem, 'length', { get: function () { return store.size; } });
  try { Object.defineProperty(window, 'localStorage',   { value: mem, configurable: true, writable: true }); } catch (e) {}
  try { Object.defineProperty(window, 'sessionStorage', { value: mem, configurable: true, writable: true }); } catch (e) {}
})();
</script>

<!-- History shim. about:srcdoc iframes refuse hash routing with SecurityError. -->
<script>
(function () {
  var origReplace = window.history.replaceState.bind(window.history);
  var origPush    = window.history.pushState.bind(window.history);
  function safe(fn) {
    return function () {
      try { return fn.apply(null, arguments); }
      catch (e) { if (e && e.name === 'SecurityError') return; throw e; }
    };
  }
  window.history.replaceState = safe(origReplace);
  window.history.pushState    = safe(origPush);
})();
</script>

<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">

<style id="app-styles">
__STYLES_CSS__
</style>

<style>
  #boot {
    position: fixed; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 18px; padding: 24px;
    background: #FAFAF7; color: #0B0B0B; z-index: 9999;
    transition: opacity .35s ease;
  }
  #boot.hidden { opacity: 0; pointer-events: none; }
  #boot .boot-mark {
    width: 44px; height: 44px;
    border: 2px solid #0B0B0B;
    border-radius: 50%;
    position: relative;
    margin-bottom: 6px;
  }
  #boot .boot-mark::after {
    content: ''; position: absolute;
    top: 50%; left: 50%; width: 6px; height: 6px;
    background: #0B0B0B; border-radius: 50%;
    transform: translate(-50%, -50%);
  }
  #boot .boot-mark::before {
    content: ''; position: absolute;
    inset: -8px;
    border: 1px solid rgba(11,11,11,0.18);
    border-radius: 50%;
    animation: boot-pulse 2.2s ease-in-out infinite;
  }
  #boot.complete .boot-mark::before { animation: none; opacity: 0; }
  @keyframes boot-pulse {
    0%, 100% { transform: scale(1); opacity: 0.4; }
    50%      { transform: scale(1.15); opacity: 0; }
  }
  #boot .title {
    font: 500 22px/1.2 'Newsreader', Georgia, serif;
    letter-spacing: -0.015em;
  }
  #boot .subtitle {
    font: italic 400 13px/1.4 'Newsreader', Georgia, serif;
    color: #777472;
    margin-top: -10px;
    max-width: 280px;
    text-align: center;
  }
  #boot .step {
    font: 400 12px/1.4 'Geist Mono', ui-monospace, monospace;
    color: #555555;
    min-height: 1.4em;
    margin-top: 4px;
  }
  #boot .bar {
    width: 240px; height: 2px;
    background: rgba(0,0,0,0.08);
    border-radius: 1px;
    overflow: hidden;
  }
  #boot .bar > div {
    height: 100%;
    background: #0B0B0B;
    width: 0%;
    transition: width .25s ease;
  }
  #boot .err {
    max-width: 720px; max-height: 320px; overflow: auto;
    white-space: pre-wrap; word-break: break-word;
    background: #fff; color: #0B0B0B; padding: 12px 14px; border-radius: 4px;
    font: 400 12px/1.5 'Geist Mono', ui-monospace, monospace;
    border-left: 2px solid #B5371F;
  }
</style>

<!-- React + ReactDOM + d3 + topojson (no in-browser Babel — JSX is pre-transformed).
     Production React builds for the shipped artifact; every tag is pinned with a
     Subresource Integrity sha384 hash + crossorigin so a tampered CDN response
     is rejected by the browser. -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js" integrity="sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js" integrity="sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js" integrity="sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js" integrity="sha384-9dCJK6nh7skY14HrcvlLYlFga9/MehJjL9ONWRflmiXNRuf8p2jiF4Y5PR881PTq" crossorigin="anonymous"></script>

</head>
<body>

<div id="boot" role="status" aria-live="polite">
  <div class="boot-mark" aria-hidden="true"></div>
  <div class="title">Pantheon Registry</div>
  <div class="subtitle">602 figures, 50 traditions, one index.</div>
  <div class="step" id="boot-step">loading…</div>
  <div class="bar"><div id="boot-bar" style="width:30%"></div></div>
  <div id="boot-err" class="err" style="display:none"></div>
</div>

<div id="app"></div>

<!-- Data layer (IIFE-wrapped, plain JS) -->
<script>
__DATA_JS__
</script>

<!-- UI scripts (pre-transformed from JSX at build time) -->
__UI_SCRIPTS__

</body>
</html>
"""

    out = template.replace('__STYLES_CSS__', safe(styles_css))
    out = out.replace('__DATA_JS__',    safe(data_js))
    out = out.replace('__UI_SCRIPTS__', script_blocks)

    # Verify no template tokens remain. /*#__PURE__*/ is Babel output, not a token.
    leftover = [x for x in re.findall(r'__[A-Z_]+__', out) if x != '__PURE__']
    if leftover:
        print(f'!! Leftover template tokens: {set(leftover)}', file=sys.stderr)
        sys.exit(1)

    out_path = DIST / 'pantheon-registry.html'
    out_path.write_text(out)

    print()
    print(f'output: {out_path.relative_to(ROOT)} ({len(out)/1024/1024:.2f} MB)')


if __name__ == '__main__':
    main()
