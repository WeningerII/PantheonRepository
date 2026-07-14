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

test('HTML is escaped — no unbalanced angle brackets leak from corpus text', () => {
  // A page whose notes/name could contain markup must not break out of tags.
  const zeus = read(path.join(REG, 'greek_hesiod_zeus.html'));
  // Every <script> in the page is a well-formed ld+json block we emitted.
  const scripts = zeus.match(/<script[^>]*>/g) || [];
  for (const s of scripts) assert.match(s, /application\/ld\+json/, `unexpected script tag: ${s}`);
});
