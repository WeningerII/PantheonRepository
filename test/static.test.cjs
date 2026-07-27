// Static-mirror tests: the crawlable, JS-free HTML that scripts/build-static.cjs
// emits into dist/site so a fetch of the SPA (crawler / LLM / link unfurler)
// returns real content instead of the "loading…" shell. dist/site is gitignored
// and built by the `npm test` command itself (build.py --pages, then
// build-static.cjs) before the runner starts — this file only reads it.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'dist', 'site');
const REG = path.join(SITE, 'registry');
const read = (p) => fs.readFileSync(p, 'utf8');

if (!fs.existsSync(path.join(REG, 'index.html'))) {
  throw new Error('dist/site/registry missing — run `python3 build.py --pages && node scripts/build-static.cjs` (npm test does this automatically)');
}

// Tier data lives at dist/data in the build tree (deploy copies it to
// _site/data); build-static reads the same corpus, so its counts agree.
const meta = JSON.parse(read(path.join(ROOT, 'dist', 'data', 'meta.json')));

test('one static figure page exists per corpus figure', () => {
  const pages = fs.readdirSync(REG).filter((f) => f.endsWith('.html') && f !== 'index.html');
  assert.strictEqual(pages.length, meta.figures,
    `figure pages (${pages.length}) vs corpus figures (${meta.figures})`);
});

test('a figure page carries real, cited, JS-free content', () => {
  const zeus = read(path.join(REG, 'greek_hesiod_zeus.html'));
  assert.match(zeus, /<h1>Zeus<\/h1>/, 'figure name as h1');
  assert.match(zeus, /Cronus/, 'parentage present');
  assert.match(zeus, /<h2>Sources<\/h2>/, 'a Sources section');
  // Verify the Sources list is genuinely populated — NOT by matching a
  // hard-coded citation string, which can collide with the id itself
  // ("Hesiod" is a substring of "greek_hesiod_zeus" and appears in every URL
  // on the page). Extract the list and require real, non-empty items.
  const srcUl = zeus.match(/<h2>Sources<\/h2><ul>(.*?)<\/ul>/s);
  assert.ok(srcUl, 'Sources renders as a list');
  const cites = [...srcUl[1].matchAll(/<li>(.*?)<\/li>/gs)].map((m) => m[1].trim());
  assert.ok(cites.length >= 1 && cites.every((t) => t.length > 0),
    `Sources list has non-empty items, got ${JSON.stringify(cites)}`);
  assert.match(zeus, /application\/ld\+json/, 'JSON-LD structured data');
  assert.match(zeus, /rel="canonical"/, 'canonical link');
  // Parent links resolve to real figure pages (relative, same dir).
  const m = zeus.match(/href="([a-z0-9_]+)\.html"/i);
  assert.ok(m && fs.existsSync(path.join(REG, m[1] + '.html')), 'internal links resolve to real pages');
  // The interactive-app deep link is present.
  assert.match(zeus, /#\/browse\/greek_hesiod_zeus/, 'links back into the SPA');
});

test('the master index lists figures grouped and linked', () => {
  const idx = read(path.join(REG, 'index.html'));
  assert.match(idx, /Zeus/, 'a known figure appears');
  assert.match(idx, /href="greek_hesiod_zeus\.html"/, 'links to the figure page');
  assert.match(idx, new RegExp(`${meta.figures.toLocaleString()}`.replace(/,/g, ',')), 'advertises the live figure count');
});

test('sitemap.xml lists the base, index, every tradition hub, and every figure', () => {
  const sm = read(path.join(SITE, 'sitemap.xml'));
  const locs = (sm.match(/<loc>/g) || []).length;
  const hubs = fs.readdirSync(path.join(REG, 'tradition')).filter((f) => f.endsWith('.html'));
  assert.strictEqual(locs, meta.figures + hubs.length + 2,
    'base + registry index + one per tradition hub + one per figure');
  assert.match(sm, /registry\/greek_hesiod_zeus\.html<\/loc>/, 'a figure URL is present');
  assert.match(sm, /registry\/tradition\/norse\.html<\/loc>/, 'a tradition hub URL is present');
  // Hubs precede the figures they parent, so a crawler reading in order meets
  // the parent first.
  assert.ok(sm.indexOf('registry/tradition/') < sm.indexOf('registry/greek_hesiod_zeus'),
    'tradition hubs are listed before figure pages');
  assert.match(sm, /^<\?xml/, 'valid XML prolog');
  // Every URL resolves to a file that was actually written.
  const missing = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/^https?:\/\/[^/]+\//, ''))
    .filter((rel) => rel && !fs.existsSync(path.join(SITE, rel)));
  assert.deepStrictEqual(missing, [], 'every sitemap URL resolves to a written file');
});

// The master index links all 5,721 figures from one page, so every figure URL
// shared a single parent. These hubs sit in between and give the crawler — and
// the reader — a level narrower than "the whole corpus".
test('per-tradition hub pages exist, are reciprocated, and carry derived content', () => {
  const hubDir = path.join(REG, 'tradition');
  const hubs = fs.readdirSync(hubDir).filter((f) => f.endsWith('.html'));
  const idx = read(path.join(REG, 'index.html'));
  const tradCount = (idx.match(/<section class="trad">/g) || []).length;
  assert.strictEqual(hubs.length, tradCount, 'one hub per tradition section on the index');

  const norse = read(path.join(hubDir, 'norse.html'));
  assert.match(norse, /<html lang="en">/);
  assert.match(norse, /<main>/, 'hub has a main landmark');
  assert.match(norse, /<h1>Norse<\/h1>/);
  assert.match(norse, /rel="canonical" href="[^"]*registry\/tradition\/norse\.html"/);
  assert.match(norse, /"@type":"CollectionPage"/, 'hub declares itself a collection');
  // Derived summary, not a bare link list — 560 near-identical list pages is
  // the shape search engines treat as doorway content.
  assert.match(norse, /The Pantheon Registry records [\d,]+ figures for Norse/);
  assert.match(norse, /cited source/, 'summary states citation coverage');
  assert.ok(!/deitys|numens/.test(norse), 'tier plurals are real words');
  assert.match(norse, /<h2>Deities <span class="meta">\d+<\/span><\/h2>/, 'figures grouped by tier');

  // Reciprocity: index heading → hub → figure → back up to the hub.
  assert.match(idx, /href="tradition\/norse\.html"/, 'index heading links down to the hub');
  assert.match(norse, /href="\.\.\/norse_odin\.html"/, 'hub links down to its figures');
  const odin = read(path.join(REG, 'norse_odin.html'));
  assert.match(odin, /<nav class="crumb">[\s\S]*?href="tradition\/norse\.html"/,
    'figure breadcrumbs back up to its tradition');

  // Lateral edges between hubs — a connected graph, not a flat fan-out.
  assert.match(norse, /<h2>Connected traditions<\/h2>/);
  assert.match(norse, /href="anglo-saxon\.html"/, 'hub links to a tradition it shares figures with');

  // Diacritics fold rather than drop: "Sámi" must not slug to "s-mi".
  assert.ok(fs.existsSync(path.join(hubDir, 'sami.html')), 'Sámi folds to sami');
  assert.ok(!fs.existsSync(path.join(hubDir, 's-mi.html')), 'no mark-stripped slug');
});

// Search Console's "HTML file" method wants a file at the site root. The
// deploy rebuilds _site from scratch every push, so a hand-uploaded one lasts
// until the next deploy and then ownership verification silently turns off —
// which is exactly what happened. Copying it from the repo re-asserts it.
test('site-verification files are copied to the site root', () => {
  const dir = path.join(ROOT, 'assets', 'verification');
  const files = fs.readdirSync(dir).filter((f) => f !== 'README.md');
  assert.ok(files.length > 0, 'expected at least one verification file');
  for (const f of files) {
    const deployed = path.join(SITE, f);
    assert.ok(fs.existsSync(deployed), `${f} did not reach the site root`);
    assert.strictEqual(read(deployed), read(path.join(dir, f)), `${f} was altered in transit`);
  }
  // Google fetches /<name>.html and expects the single line naming the file.
  const g = files.find((f) => /^google[0-9a-f]+\.html$/.test(f));
  if (g) {
    assert.strictEqual(read(path.join(SITE, g)).trim(), `google-site-verification: ${g}`,
      `${g} must contain exactly "google-site-verification: ${g}"`);
  }
});

test('robots.txt allows all and points at the sitemap', () => {
  const r = read(path.join(SITE, 'robots.txt'));
  assert.match(r, /User-agent: \*/);
  assert.match(r, /Allow: \//);
  assert.match(r, /Sitemap: https?:\/\/\S+\/sitemap\.xml/);
});

test('the shell is enriched with SEO head + a no-JS crawl path', () => {
  const shell = read(path.join(SITE, 'index.html'));
  assert.match(shell, /<meta name="robots" content="index, follow">/, 'robots meta');
  assert.match(shell, /rel="canonical"/, 'canonical');
  assert.match(shell, /<noscript>[\s\S]*registry\/index\.html[\s\S]*<\/noscript>/, 'noscript routes to the static registry');
  // A DOM-present crawl path OUTSIDE <noscript>, so HTML-only fetchers that strip
  // <noscript> (some AI browse tools) still reach the static registry.
  const outsideNoscript = shell.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  assert.match(outsideNoscript, /aria-label="Static registry"[\s\S]*?registry\/index\.html/, 'crawl link survives noscript stripping');
  // Injection is idempotent: exactly one marker pair (head + body), never doubled.
  assert.strictEqual((shell.match(/<!-- pr-static -->/g) || []).length, 2, 'head + body markers, not doubled');
  // Site-level structured data: the per-figure pages describe a Person each,
  // but the shell — the URL that actually gets shared and indexed — must say
  // what the site itself is.
  const ld = shell.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ld, 'shell carries JSON-LD');
  const site = JSON.parse(ld[1]);
  assert.strictEqual(site['@type'], 'WebSite');
  assert.strictEqual(site.name, 'Pantheon Registry');
  assert.match(site.url, /^https?:\/\//, 'absolute site URL');
  assert.strictEqual(site.hasPart.url.endsWith('registry/index.html'), true,
    'points at the crawlable full index');
});

// The static pages are what search results and LLM links resolve to, so a
// human lands on them regularly — they get the same landmark structure and
// alternative text the app does.
test('static pages are navigable by landmark and screen reader', () => {
  for (const f of ['greek_hesiod_zeus.html', 'index.html']) {
    const html = read(path.join(REG, f));
    assert.match(html, /<html lang="en">/, `${f}: html lang`);
    assert.match(html, /<main>/, `${f}: a main landmark`);
    assert.match(html, /<\/main>/, `${f}: main is closed`);
    // The breadcrumb and the footer stay OUTSIDE main; everything else is in it.
    assert.ok(html.indexOf('<nav class="crumb">') < html.indexOf('<main>'),
      `${f}: the breadcrumb precedes main`);
    assert.ok(html.indexOf('</main>') < html.indexOf('<footer>'),
      `${f}: the footer follows main`);
  }
  // Colour is not the only cue that a word is a link (WCAG 1.4.1): brick on
  // ink is 2.41:1, under the 3:1 a colour-only distinction would need.
  const zeus = read(path.join(REG, 'greek_hesiod_zeus.html'));
  assert.match(zeus, /a\{[^}]*text-decoration:underline/,
    'in-prose links are underlined, not colour-only');
  // Section anchors on the master index must be unique.
  const idx = read(path.join(REG, 'index.html'));
  const ids = [...idx.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]);
  assert.strictEqual(new Set(ids).size, ids.length, 'tradition anchors are unique');
});

test('llms.txt front door + llms-full.txt one-file corpus are generated for LLM readers', () => {
  const llms = read(path.join(SITE, 'llms.txt'));
  assert.match(llms, /^# Pantheon Registry/m, 'llms.txt title');
  assert.match(llms, /llms-full\.txt/, 'links to the one-file corpus');
  assert.match(llms, /registry\/index\.html/, 'links to the registry index');
  assert.match(llms, /\/mcp|MCP connector/, 'surfaces the MCP connector');

  const full = read(path.join(SITE, 'llms-full.txt'));
  assert.match(full, /full figure catalog/, 'llms-full.txt header');
  // Exactly one Markdown entry per figure, each carrying its page link.
  assert.strictEqual((full.match(/^- \*\*/gm) || []).length, meta.figures, 'one entry per figure');
  assert.match(full, /registry\/greek_hesiod_zeus\.html/, 'a known figure link is present');
});

test('registry/figures.json is a valid structured catalog for code agents', () => {
  const data = JSON.parse(read(path.join(REG, 'figures.json')));
  assert.strictEqual(data.count, meta.figures, 'count matches the figure total');
  assert.strictEqual(data.figures.length, meta.figures, 'one record per figure');
  const zeus = data.figures.find((f) => f.id === 'greek_hesiod_zeus');
  assert.ok(zeus, 'a known figure is present');
  for (const k of ['id', 'name', 'tradition', 'type', 'parents', 'children', 'domains', 'powers', 'url']) {
    assert.ok(k in zeus, `record carries "${k}"`);
  }
  assert.match(zeus.url, /registry\/greek_hesiod_zeus\.html$/, 'record url points at the figure page');
});

test('figure-page source citations resolve to links where possible', () => {
  // greek_apollod_perseus cites Apollod./Hom. Il. — resolvable to Theoi.
  const p = read(path.join(REG, 'greek_apollod_perseus.html'));
  const srcUl = p.match(/<h2>Sources<\/h2><ul>(.*?)<\/ul>/s);
  assert.ok(srcUl, 'Perseus renders a Sources list');
  assert.match(srcUl[1], /<a href="https:\/\/[^"]+" rel="nofollow noopener"[^>]*>/,
    'a resolvable citation renders as an <a href> on the static figure page');
});

test('figures.json records carry a sources[] array with resolved links', () => {
  const data = JSON.parse(read(path.join(REG, 'figures.json')));
  const perseus = data.figures.find((f) => f.id === 'greek_apollod_perseus');
  assert.ok(perseus && Array.isArray(perseus.sources) && perseus.sources.length >= 1,
    'a known figure carries a non-empty sources[]');
  for (const s of perseus.sources) {
    assert.ok('reference' in s && 'url' in s, 'each source record has {reference, url}');
  }
  assert.ok(perseus.sources.some((s) => s.url && /^https:/.test(s.url)),
    'at least one source resolves to an https url');
  assert.match(data.schema, /sources\[\{reference, url\}\]/, 'schema documents the sources field');
});

test('pages carry Open Graph / Twitter share tags + the share image exists', () => {
  assert.ok(fs.existsSync(path.join(SITE, 'og-image.png')), 'og-image.png is emitted at the site root');
  const zeus = read(path.join(REG, 'greek_hesiod_zeus.html'));
  assert.match(zeus, /<meta property="og:title" content="Zeus/, 'figure og:title');
  assert.match(zeus, /<meta property="og:image" content="https?:\/\/\S+\/og-image\.png">/, 'figure og:image');
  assert.match(zeus, /<meta property="og:type" content="article">/, 'figure og:type is article');
  assert.match(zeus, /<meta name="twitter:card" content="summary_large_image">/, 'twitter card');
  const shell = read(path.join(SITE, 'index.html'));
  assert.match(shell, /property="og:image"[^>]*og-image\.png/, 'shell og:image');
});

test('per-tradition llms/<tradition>.txt files: one per tradition + an index', () => {
  const idx = read(path.join(SITE, 'llms', 'index.txt'));
  assert.match(idx, /per-tradition files/, 'index header');
  assert.match(idx, /llms\/norse\.txt/, 'index lists a known tradition file');
  const norse = read(path.join(SITE, 'llms', 'norse.txt'));
  assert.match(norse, /# Norse — Pantheon Registry/, 'per-tradition header');
  assert.match(norse, /registry\/norse_\w+\.html/, 'per-tradition file links figure pages');
});

// The README's headline numbers had drifted to 3,472 figures / 360 traditions
// against a corpus of 5,721 / 560 — the first thing anyone arriving from a
// search result or an aggregator reads, and wrong by 65%. Documentation that
// restates a computed fact should fail the build when it stops being true.
test('README and package.json corpus counts match the built corpus', () => {
  const readme = read(path.join(ROOT, 'README.md'));
  const pkg = read(path.join(ROOT, 'package.json'));
  const traditions = fs.readdirSync(path.join(REG, 'tradition'))
    .filter((f) => f.endsWith('.html')).length;
  const fmt = (n) => n.toLocaleString('en-US');

  // Lead sentence.
  assert.match(readme, new RegExp(`\\*\\*${fmt(meta.figures)} figures across ${fmt(traditions)} traditions\\*\\*`),
    `README lead should read "${fmt(meta.figures)} figures across ${fmt(traditions)} traditions"`);

  // Summary table — each row restates a number the build knows.
  const row = (label) => {
    const m = readme.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*([\\d,]+)\\s*\\|`));
    assert.ok(m, `README table is missing a "${label}" row`);
    return Number(m[1].replace(/,/g, ''));
  };
  assert.strictEqual(row('Figures'), meta.figures);
  assert.strictEqual(row('Traditions'), traditions);
  assert.strictEqual(row('Domains'), meta.domains);
  assert.strictEqual(row('Powers'), meta.powers);
  assert.strictEqual(row('Items'), meta.items);

  assert.match(pkg, new RegExp(`${fmt(meta.figures)} entries across ${fmt(traditions)} traditions`),
    'package.json description restates the same counts');
});

// The owner's mark, from assets/brand/, is the icon everywhere. It is served
// as files on the site and inlined only in the offline artifact, which has no
// siblings to fetch. Pin the whole arrangement: an icon that silently stops
// being declared is exactly the 404 this started as.
test('the owner mark is the icon in every entry point', () => {
  const BRAND = path.join(ROOT, 'assets', 'brand');

  // Deployed shell + every static page link the files.
  const shell = read(path.join(SITE, 'index.html'));
  assert.match(shell, /<link rel="icon" href="\/favicon\.ico" sizes="32x32">/);
  assert.match(shell, /<link rel="icon" type="image\/png" sizes="96x96" href="\/favicon-96x96\.png">/);
  assert.match(shell, /<link rel="apple-touch-icon" sizes="180x180"/);
  assert.match(shell, /<link rel="manifest"/);

  // All 6,000+ static pages, at both directory depths, previously declared
  // nothing at all and took a /favicon.ico 404 apiece.
  for (const f of ['greek_hesiod_zeus.html', 'index.html', path.join('tradition', 'norse.html')]) {
    const html = read(path.join(REG, f));
    assert.match(html, /<link rel="icon" href="https?:\/\/[^"]*favicon\.ico"/, `${f}: no .ico link`);
    assert.match(html, /<link rel="icon" type="image\/png"[^>]*favicon-96x96\.png"/, `${f}: no png link`);
  }

  // The offline artifact inlines the same PNG — file:// has nothing to fetch.
  const artifact = read(path.join(ROOT, 'dist', 'pantheon-registry.html'));
  const png = fs.readFileSync(path.join(BRAND, 'favicon-96x96.png')).toString('base64');
  assert.ok(artifact.includes(`href="data:image/png;base64,${png}"`),
    'the artifact does not inline the current assets/brand/favicon-96x96.png');
  assert.ok(!/href="\/favicon\.ico"/.test(artifact),
    'the artifact must not reference a sibling file it cannot fetch');

  // The 5.9 MB favicon.svg from the generated set is a base64 PNG wrapped in
  // an <image> element. Linking it would download 5.9 MB for identical pixels.
  assert.ok(!fs.existsSync(path.join(BRAND, 'favicon.svg')),
    'the raster-in-SVG favicon must not be committed; see assets/brand/README.md');
  assert.ok(!/favicon\.svg/.test(shell), 'nothing should link favicon.svg');
});

test('the icon files and PWA manifest ship correctly', () => {
  const sizes = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512, 'favicon-96x96.png': 96 };
  for (const [f, px] of Object.entries(sizes)) {
    const p = path.join(SITE, f);
    assert.ok(fs.existsSync(p), `${f} was not copied into the site`);
    const buf = fs.readFileSync(p);           // PNG IHDR: w/h at bytes 16..24
    assert.strictEqual(buf.readUInt32BE(16), px, `${f} is not ${px}px wide`);
    assert.strictEqual(buf.readUInt32BE(20), px, `${f} is not ${px}px tall`);
  }
  // The .ico must carry real 16/32/48 frames, not one downscale.
  const ico = fs.readFileSync(path.join(SITE, 'favicon.ico'));
  assert.strictEqual(ico.readUInt16LE(0), 0, 'ICO reserved field');
  assert.strictEqual(ico.readUInt16LE(2), 1, 'ICO type is icon');
  const frames = ico.readUInt16LE(4);
  const widths = Array.from({ length: frames }, (_, i) => ico[6 + i * 16] || 256).sort((a, b) => a - b);
  assert.deepStrictEqual(widths, [16, 32, 48], 'favicon.ico should carry 16/32/48 frames');

  const mf = JSON.parse(read(path.join(SITE, 'site.webmanifest')));
  // The icon generator's default manifest says "MyWebSite" with a white theme.
  assert.strictEqual(mf.name, 'Pantheon Registry');
  assert.ok(!/MyWebSite|MySite/.test(JSON.stringify(mf)), 'no generator boilerplate in the manifest');
  assert.strictEqual(mf.theme_color, '#FAFAF7', 'theme colour is the app paper, not white');
  for (const i of mf.icons) {
    assert.ok(fs.existsSync(path.join(SITE, i.src.replace(/^\//, ''))), `${i.src} is missing`);
  }
});

// ── lead-portrait infobox (docs/image-licensing.md) ─────────────────────────
// leadFigure builds the PD/CC0 <figure> that figurePage floats top-right. The
// committed image manifest is empty, so unit-test the pure builder directly
// with a synthetic images.json record. Imported from its own corpus-free lib
// (requiring build-static.cjs would load the 28 MB corpus into this otherwise
// light test process — enough concurrent memory to OOM the jsdom suite).
const { leadFigure } = require('../scripts/lib/lead-figure.cjs');
const BASE = 'https://www.listofgods.com/';

test('leadFigure renders nothing when the figure has no image', () => {
  assert.strictEqual(leadFigure(null, 'Zeus', BASE), '');
  assert.strictEqual(leadFigure(undefined, 'Zeus', BASE), '');
  assert.strictEqual(leadFigure({}, 'Zeus', BASE), '', 'a record with no file is not an image');
});

test('leadFigure emits a self-hosted, credited PD/CC0 infobox', () => {
  const html = leadFigure({
    file: 'greek_hesiod_zeus.webp', w: 800, h: 1000,
    license: { key: 'pd-old-100', name: 'Public domain', url: null },
    author: 'Rembrandt', authorUrl: 'https://commons.wikimedia.org/wiki/User:X',
    source: 'https://commons.wikimedia.org/wiki/File:Zeus.webp',
  }, 'Zeus', BASE);
  assert.match(html, /^<figure class="lead">/, 'wraps in a lead figure');
  // Self-hosted under assets/images/figures/ — never a Commons hotlink.
  assert.match(html, /<img src="https?:\/\/\S+assets\/images\/figures\/greek_hesiod_zeus\.webp"/, 'self-hosted image src');
  assert.ok(!/upload\.wikimedia\.org/.test(html), 'must not hotlink Commons upload host');
  // Intrinsic dimensions reserve the box (no-shift), lazy + async decode.
  assert.match(html, /width="800"/);
  assert.match(html, /height="1000"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  // Not the bare name: it would duplicate the <h1> beside it (Lighthouse's
  // redundant-alt audit) and say nothing about the picture.
  assert.match(html, /alt="Depiction of Zeus by Rembrandt"/, 'alt describes the image and credits the artist');
  assert.ok(!/alt="Zeus"/.test(html), 'alt must not be the bare figure name');
  // Courtesy credit: author + license, both linking back to Commons.
  assert.match(html, /Rembrandt/, 'author credited');
  assert.match(html, /Public domain/, 'license shown');
  assert.match(html, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Zeus\.webp"/, 'license links to the Commons file page');
  assert.match(html, /via Wikimedia Commons/, 'source attributed');
});

test('leadFigure escapes attacker-controlled author/name text', () => {
  const html = leadFigure({
    file: 'x.webp', w: 1, h: 1,
    license: { name: 'Public domain' },
    author: '<script>alert(1)</script>', authorUrl: 'https://commons.wikimedia.org/wiki/User:X',
    source: 'https://commons.wikimedia.org/wiki/File:X.webp',
  }, '"><img onerror=alert(1)>', BASE);
  assert.ok(!/<script>alert/.test(html), 'author markup must be escaped');
  assert.ok(!/<img onerror/.test(html), 'name markup must be escaped');
  assert.match(html, /&lt;script&gt;/, 'author is HTML-escaped');
});

test('HTML is escaped — no unbalanced angle brackets leak from corpus text', () => {
  // A page whose notes/name could contain markup must not break out of tags.
  const zeus = read(path.join(REG, 'greek_hesiod_zeus.html'));
  // Every <script> in the page is a well-formed ld+json block we emitted.
  const scripts = zeus.match(/<script[^>]*>/g) || [];
  for (const s of scripts) assert.match(s, /application\/ld\+json/, `unexpected script tag: ${s}`);
});
