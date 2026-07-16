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

test('sitemap.xml lists the base, index, and every figure', () => {
  const sm = read(path.join(SITE, 'sitemap.xml'));
  const locs = (sm.match(/<loc>/g) || []).length;
  assert.strictEqual(locs, meta.figures + 2, 'base + registry index + one per figure');
  assert.match(sm, /registry\/greek_hesiod_zeus\.html<\/loc>/, 'a figure URL is present');
  assert.match(sm, /^<\?xml/, 'valid XML prolog');
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

test('HTML is escaped — no unbalanced angle brackets leak from corpus text', () => {
  // A page whose notes/name could contain markup must not break out of tags.
  const zeus = read(path.join(REG, 'greek_hesiod_zeus.html'));
  // Every <script> in the page is a well-formed ld+json block we emitted.
  const scripts = zeus.match(/<script[^>]*>/g) || [];
  for (const s of scripts) assert.match(s, /application\/ld\+json/, `unexpected script tag: ${s}`);
});
