#!/usr/bin/env python3
"""
Build script for the deployable artifacts.

Pre-transforms each app/*.jsx through Babel (no in-browser transformer),
inlines them alongside app/styles.css, and swaps the data layer per mode.
Both modes regenerate the schema-4 tiers (scripts/build-tiers.cjs) first and
ship the SAME post-pipeline snapshot through the same inlined app/pr-boot.js:

  python3 build.py          dist/pantheon-registry.html — the single-file
                            artifact: open from disk, host as a static file,
                            or drop into a Claude.ai artifact. Committed and
                            byte-exact-gated. The corpus is embedded as inert
                            <script type="application/json"> payloads the JS
                            parser never tokenizes; pr-boot JSON.parses them
                            off the critical path. No fetch() — file:// and
                            srcdoc keep working.
  python3 build.py --pages  dist/site/index.html — the multi-file Pages
                            shell: same template, but the corpus arrives as
                            the hashed dist/data tiers fetched by pr-boot.
                            Gitignored, CI-built.

Prerequisites:
  npm install            # installs @babel/standalone

Usage:
  python3 build.py [--pages]
"""
import json
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
    'Items.jsx', 'Powers.jsx', 'Domains.jsx', 'Graph.jsx', 'Atlas.jsx', 'CommandPalette.jsx', 'Shell.jsx', 'main.jsx',
]

# ── Web analytics (Google Analytics 4) ──────────────────────────────────────
# Set to the GA4 Measurement ID ('G-XXXXXXXXXX') to enable traffic analytics on
# the DEPLOYED site. The snippet ships only in the Pages shell (build --pages),
# never in the offline single-file artifact, and at runtime it no-ops on
# localhost / 127.0.0.1 / file:// so dev builds and the render harness never
# reach Google or pollute the numbers. While the ID is the placeholder below,
# nothing is injected at all — the site is byte-identical to no-analytics.
GA_MEASUREMENT_ID = 'G-K33CL0JZ0V'

# gtag.js with hash-router support: GA4's built-in page_view fires once on load
# and its enhanced-measurement history tracking watches the History API, not
# '#/' hash routes — so we disable the auto page_view and emit one ourselves on
# load and on every hashchange, giving each view (#/browse, #/atlas, a figure)
# its own entry in the reports. __GA_ID__ is substituted at build time.
_GA_SNIPPET = r"""<!-- Google Analytics 4 (deployed site only; hash-router aware) -->
<script>
(function () {
  var ID = '__GA_ID__';
  if (ID.indexOf('XXXX') !== -1) return;                       // unset placeholder
  if (location.protocol === 'file:') return;                   // offline artifact
  var host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '') return;  // dev
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', ID, { send_page_view: false });              // we send views ourselves
  function sendView() {
    gtag('event', 'page_view', {
      page_location: location.href,
      page_path: location.pathname + location.search + location.hash,
      page_title: document.title
    });
  }
  sendView();
  window.addEventListener('hashchange', sendView);
})();
</script>
"""


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
    try:
        proc = subprocess.run(
            ['node', '-e', node_script, full_path],
            capture_output=True, text=True, encoding='utf-8', cwd=ROOT,
        )
    except FileNotFoundError:
        sys.exit('!! node is required: install Node.js, then run `npm install` and retry.')
    if proc.returncode != 0:
        print(f'!! Babel failed on {filename}:\n{proc.stderr}', file=sys.stderr)
        sys.exit(1)
    return proc.stdout


# Per the HTML spec, script content also terminates at case/whitespace
# variants of the close tag (</ScRiPt , </SCRIPT/ …), and a literal `<!--`
# flips the parser into the script-data-double-escaped state — both would
# silently corrupt the 7+ MB inline payload. The corpus is regenerated from
# research transcripts, so treat the payloads as untrusted text.
_SCRIPT_BREAK = re.compile(r'(?i)</script')
_PARSE_HAZARD = re.compile(r'(?i)<!--|</script[\s/>]')


def safe(src: str) -> str:
    """Escape any literal </script (any case) in an inline payload."""
    return _SCRIPT_BREAK.sub('<\\\\/script', src)


def main() -> None:
    args = sys.argv[1:]
    pages = '--pages' in args
    unknown = [a for a in args if a != '--pages']
    if unknown:
        sys.exit(f'usage: python3 build.py [--pages]  (unrecognized: {", ".join(unknown)})')

    print('Pre-transforming JSX...')
    transformed = {}
    for f in JSX_FILES:
        src = (APP / f).read_text(encoding='utf-8')
        code = transform_jsx(f)
        transformed[f] = code
        print(f'  {f:24s}  {len(src):>7,} → {len(code):>7,} bytes')

    styles_css = (APP / 'styles.css').read_text(encoding='utf-8')
    # Shared citation-link resolver (window.PRCite). A plain classic script,
    # inlined raw before the JSX like pr-boot.js — never Babel-transformed.
    cite_links = (APP / 'cite-links.js').read_text(encoding='utf-8')

    # The two modes differ only in the data layer: embedded inert JSON
    # (artifact) vs the hashed tiers fetched over HTTP (Pages shell) — both
    # loaded by the same inlined app/pr-boot.js. dist/data is gitignored and
    # the generator is deterministic and cheap (~2.5 s), so always
    # regenerate: the hashed names pinned into the shell — and the payloads
    # inlined into the artifact — can never go stale against app/data.js.
    print('Building data tiers (scripts/build-tiers.cjs)...')
    proc = subprocess.run(['node', 'scripts/build-tiers.cjs'], cwd=ROOT)
    if proc.returncode != 0:
        sys.exit('!! scripts/build-tiers.cjs failed')
    meta = json.loads((DIST / 'data' / 'meta.json').read_text(encoding='utf-8'))
    tiers = meta['files']
    registry = meta['registry']
    data_name = 'pr-boot.js'
    data_body = (APP / data_name).read_text(encoding='utf-8')

    # Sanity: abort on anything that would terminate or mis-parse the inline
    # script element (case-insensitive close tags, comment-open sequences).
    hazard_checks = [('styles.css', styles_css), (data_name, data_body),
                     ('cite-links.js', cite_links),
                     *((f, transformed[f]) for f in JSX_FILES)]
    if not pages:
        core_body = (DIST / 'data' / tiers['core']).read_text(encoding='utf-8')
        # The JSON payloads are safe()-escaped BEFORE the check: '<\/script'
        # inside a JSON string literal still parses to '</script', so the
        # corpus keeps its bytes while the element survives the HTML
        # tokenizer. '<!--' has no JSON-transparent escape — it aborts here.
        index_payload = safe((DIST / 'data' / tiers['index']).read_text(encoding='utf-8'))
        corpus_payload = safe((DIST / 'data' / tiers['corpus']).read_text(encoding='utf-8'))
        hazard_checks += [(tiers['core'], core_body),
                          (tiers['index'] + ' (escaped)', index_payload),
                          (tiers['corpus'] + ' (escaped)', corpus_payload)]
    for name, body in hazard_checks:
        hit = _PARSE_HAZARD.search(body)
        if hit:
            print(f'!! {name} contains a script-breaking sequence at offset {hit.start()}: {hit.group()!r}', file=sys.stderr)
            sys.exit(1)

    script_blocks = (
        f'<!-- cite-links.js (window.PRCite, inlined raw) -->\n<script>\n{safe(cite_links)}\n</script>\n'
        + '\n'.join(
            f'<!-- {f} (pre-transformed) -->\n<script>\n{safe(transformed[f])}\n</script>'
            for f in JSX_FILES
        )
    )

    template = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pantheon Registry</title>
<meta name="description" content="A browsable, source-cited index of the world's mythological and historical figures — their genealogies, domains, epithets, iconography, and cult (sites, festivals, priesthoods, offerings) — across hundreds of traditions. Client-rendered single-page app." />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Pantheon Registry" />
<meta property="og:title" content="Pantheon Registry — the gods, mapped" />
<meta property="og:description" content="A source-cited index of the world's mythological and historical figures — genealogies, domains, epithets, iconography, and cult — across hundreds of traditions." />
<meta property="og:url" content="https://www.listofgods.com/" />
<meta property="og:image" content="https://www.listofgods.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Pantheon Registry — the gods, mapped" />
<meta name="twitter:description" content="A source-cited index of the world's mythological and historical figures across hundreds of traditions." />
<meta name="twitter:image" content="https://www.listofgods.com/og-image.png" />
__ANALYTICS__
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

<!-- Fonts. Loaded async via the media swap: a render-blocking font stylesheet
     stalls first paint for the full fetch (12.66 s measured on a degraded
     network) while display=swap already keeps text readable without it. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<noscript><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet"></noscript>

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
     is rejected by the browser.

     React + ReactDOM load synchronously: the inline UI scripts destructure React
     at module-eval time (e.g. Shell.jsx's `const { useState } = React`), so both
     must exist before those scripts run.

     d3 + topojson are `defer`red — they were the two heaviest render-blockers
     (d3 alone ~4 s on emulated Slow 4G) yet are used only INSIDE Graph.jsx and
     Atlas.jsx, and only in effects/handlers, never at eval time. Both views are
     gated behind `dataReady` (the ~22 MB corpus), so a deferred 76 KB d3 always
     finishes long before either can render — deferring drops them off the
     first-paint critical path with no functional risk. -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js" integrity="sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js" integrity="sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1" crossorigin="anonymous"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js" integrity="sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i" crossorigin="anonymous"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js" integrity="sha384-9dCJK6nh7skY14HrcvlLYlFga9/MehJjL9ONWRflmiXNRuf8p2jiF4Y5PR881PTq" crossorigin="anonymous"></script>

</head>
<body>

<div id="boot" role="status" aria-live="polite">
  <div class="boot-mark" aria-hidden="true"></div>
  <div class="title">Pantheon Registry</div>
  <div class="subtitle">One index of the world's mythologies.</div>
  <div class="step" id="boot-step">loading…</div>
  <div class="bar"><div id="boot-bar" style="width:30%"></div></div>
  <div id="boot-err" class="err" style="display:none"></div>
</div>

<div id="app"></div>

__DATA_LAYER__

<!-- UI scripts (pre-transformed from JSX at build time) -->
__UI_SCRIPTS__

</body>
</html>
"""

    if pages:
        # __PR_DATA names the tiers pr-boot fetches; core.js satisfies the
        # module-scope __PR reads (PEOPLE_KEY, ERA_DATES, …) before any UI
        # script runs. Hashed names are pinned into the shell — the only
        # cache-busting available under Pages' fixed max-age=600 — as
        # page-relative URLs so the shell serves from a project sub-path.
        # pr-boot ships inline: _site carries no app/ files beside data/.
        # test/manifest.test.cjs pins this order (__PR_DATA, core, pr-boot,
        # then the UI scripts) against index.html and the artifact.
        data_layer = (
            '<!-- Data layer (async tiers; hashed names pinned from dist/data/meta.json) -->\n'
            # Projections shell (Phase 3): no corpus URL — the index is the boot,
            # every richer surface loads through its own tier. The corpus file is
            # still emitted (the offline artifact embeds it, and stale shells
            # cached across a deploy still fetch it by its old hashed name).
            f"<script>window.__PR_DATA = {{ index: 'data/{tiers['index']}' }};</script>\n"
            # The per-view registry tiers, kept in their own global so __PR_DATA
            # stays the two upfront tiers. pr-boot fetches these lazily on the
            # first Items/Powers/Domains navigation — those views no longer wait
            # on the 20 MB corpus.
            f"<script>window.__PR_REGISTRY_DATA = {{ items: 'data/{registry['items']}', powers: 'data/{registry['powers']}', domains: 'data/{registry['domains']}' }};</script>\n"
            # The projection tiers (corpus-blob replacements): atlas unblocks
            # the Atlas view + derived-layer lookups, edges unblocks Graph/
            # Lineage — each a fraction of the corpus fetch. Same lazy pattern
            # as the registries, same catch-to-corpus fallback in pr-boot.
            f"<script>window.__PR_TIER_DATA = {{ atlas: 'data/{tiers['atlas']}', edges: 'data/{tiers['edges']}' }};</script>\n"
            # The detail-shard manifest: per-bucket content-hashed names, so a
            # figure open fetches one ~100KB-gz shard instead of the corpus.
            # Pinned into the shell like every hashed tier (the only cache-bust
            # under Pages' max-age=600); the bucket count and hash rule ride
            # along so the client never assumes them.
            f"<script>window.__PR_DETAILS_DATA = {{ dir: 'data/{meta['details']['dir']}/', buckets: {meta['buckets']}, shards: {json.dumps(meta['details']['shards'])} }};</script>\n"
            f'<script src="data/{tiers["core"]}"></script>\n'
            '\n'
            '<!-- pr-boot.js (async data loader, inlined) -->\n'
            '<script>\n'
            f'{safe(data_body)}\n'
            '</script>')
    else:
        # Same load order as the Pages shell (core constants, __PR_DATA,
        # pr-boot, then the UI scripts via the template) — only the source
        # differs: the tiers sit in-document as inert application/json
        # payloads, placed AFTER pr-boot so the small executable scripts
        # parse before the tokenizer walks the 20+ MB. pr-boot reads them by
        # element id at DOMContentLoaded (never a fetch), so the skeleton
        # boot and the two-stage install match the shell exactly.
        # test/manifest.test.cjs pins this order.
        #
        # The skinny index stage ships in the artifact too, by measurement:
        # medians of 3 cold Chromium runs over loopback put first Browse rows
        # at 875 ms with the index vs 1,066 ms without (both against 2,320 ms
        # for the retired inline-data.js encoding). The 0.93 MB block and the
        # second render pass defer __bootDone (~1.9 s vs ~1.0 s — the idle
        # corpus parse waits out the skinny row reveal), but rows-on-screen
        # is the boot the user watches, and one flow shared with the Pages
        # shell beats a third artifact-only variant.
        data_layer = (
            '<!-- Data layer (embedded: inert JSON tiers, parsed off the critical path by pr-boot) -->\n'
            '<!-- core constants (dist/data core.js, inlined) -->\n'
            '<script>\n'
            f'{safe(core_body)}\n'
            '</script>\n'
            "<script>window.__PR_DATA = { embeddedIndex: 'pr-data-index', embeddedCorpus: 'pr-data-corpus' };</script>\n"
            '\n'
            '<!-- pr-boot.js (async data loader, inlined) -->\n'
            '<script>\n'
            f'{safe(data_body)}\n'
            '</script>\n'
            f'<script type="application/json" id="pr-data-index">{index_payload}</script>\n'
            f'<script type="application/json" id="pr-data-corpus">{corpus_payload}</script>')

    out = template.replace('__STYLES_CSS__', safe(styles_css))
    out = out.replace('__DATA_LAYER__',  data_layer)
    out = out.replace('__UI_SCRIPTS__', script_blocks)
    # Analytics rides only the deployed Pages shell — the offline artifact stays
    # self-contained and never phones home. The token sits on its own line, so
    # replacing it with '' for the artifact leaves the surrounding blank line
    # exactly as it was (byte-exact regen holds).
    analytics = _GA_SNIPPET.replace('__GA_ID__', GA_MEASUREMENT_ID) if pages else ''
    out = out.replace('__ANALYTICS__', analytics)

    # Verify no template tokens remain. /*#__PURE__*/ is Babel output, not a token.
    leftover = [x for x in re.findall(r'__[A-Z_]+__', out) if x != '__PURE__']
    if leftover:
        print(f'!! Leftover template tokens: {set(leftover)}', file=sys.stderr)
        sys.exit(1)

    if pages:
        (DIST / 'site').mkdir(exist_ok=True)
        out_path = DIST / 'site' / 'index.html'
    else:
        out_path = DIST / 'pantheon-registry.html'
    # Explicit encoding + newline: a cp1252 locale (Windows) cannot encode the
    # corpus, and newline translation would break byte-exact regeneration.
    out_path.write_text(out, encoding='utf-8', newline='\n')

    print()
    print(f'output: {out_path.relative_to(ROOT)} ({len(out)/1024/1024:.2f} MB)')


if __name__ == '__main__':
    main()
