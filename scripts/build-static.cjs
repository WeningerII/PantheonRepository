#!/usr/bin/env node
/*
 * build-static.cjs — emit a crawlable, JS-free static mirror of the corpus.
 *
 * The deployed app is a client-rendered SPA behind a hash router: a fetch of
 * the site (or an LLM/crawler that does not execute JavaScript) receives only
 * the boot shell — "loading…" — and none of the 4,000+ figures. The content is
 * therefore invisible to search engines, link unfurlers, and any LLM reading
 * the URL rather than the MCP connector.
 *
 * This derives, from the SAME corpus the app ships (window.__PR via a VM run of
 * app/data.js — one source of truth), a set of plain static HTML pages that a
 * no-JS fetch renders in full:
 *
 *   registry/index.html   master index — every figure, grouped by tradition,
 *                          linked to its detail page. One fetch = whole corpus.
 *   registry/<id>.html     per-figure cited detail (genealogy, domains, powers,
 *                          epithets, relations, sources) + JSON-LD + a link
 *                          into the interactive app.
 *   sitemap.xml            every static URL, for crawlers.
 *   robots.txt             allow-all + sitemap pointer.
 *
 * It also injects, into the shell (dist/site/index.html), SEO <head> tags and a
 * <noscript> block routing no-JS visitors to registry/ — real browsers run the
 * app and ignore it; fetchers/crawlers/LLMs see real content and a crawl path.
 *
 * Output lands in dist/site/ (gitignored, CI-built, deployed). Deterministic.
 * Run: node scripts/build-static.cjs   (after `python3 build.py --pages`)
 */
const fs = require('fs');
const path = require('path');
const { loadCorpus } = require('./build-tiers.cjs');

const ROOT = path.resolve(__dirname, '..');
const SITE = process.env.PR_STATIC_OUT || path.join(ROOT, 'dist', 'site');
const REG = path.join(SITE, 'registry');
const BASE = (require('../package.json').homepage || 'https://weningerii.github.io/PantheonRepository/').replace(/\/?$/, '/');

const PR = loadCorpus();
const PEOPLE = PR.seedPeople;
const IDS = Object.keys(PEOPLE).sort();

// ── helpers ──────────────────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const primary = (p) => (p.name && p.name.primary) || p.id;
const nameOf = (id) => (PEOPLE[id] ? primary(PEOPLE[id]) : id);
const humanize = (s) => String(s == null ? '' : s).replace(/[-_]+/g, ' ').trim();

// id -> children, built once
const CHILDREN = new Map();
for (const id of IDS) for (const pid of (PEOPLE[id].parentIds || [])) {
  if (!CHILDREN.has(pid)) CHILDREN.set(pid, []);
  CHILDREN.get(pid).push(id);
}

const sourcesOf = (p) => {
  const out = [];
  for (const s of (p.sources || [])) for (const c of (s.citations || [])) if (c && c.reference) out.push(c.reference);
  return [...new Set(out)];
};

// A figure link that only resolves to a page when the target actually exists.
const figLink = (id) => (PEOPLE[id]
  ? `<a href="${esc(id)}.html">${esc(nameOf(id))}</a>`
  : esc(id));

const STYLE = `:root{color-scheme:light dark}
*{box-sizing:border-box}
body{max-width:52rem;margin:0 auto;padding:2rem 1.25rem 5rem;
  font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,serif;
  color:#1a1a1a;background:#faf8f3}
@media(prefers-color-scheme:dark){body{color:#e8e6e0;background:#141310}a{color:#8fb3ff}}
a{color:#1f4e79;text-decoration:none}a:hover{text-decoration:underline}
h1{font-size:1.9rem;margin:.2rem 0 .1rem;line-height:1.15}
h2{font-size:1.05rem;text-transform:uppercase;letter-spacing:.08em;opacity:.6;
  margin:2rem 0 .5rem;font-weight:600}
.sub{opacity:.7;margin:.1rem 0 1.2rem;font-style:italic}
.crumb{font-size:.85rem;opacity:.6;margin-bottom:1.5rem}
ul{padding-left:1.1rem;margin:.3rem 0}li{margin:.15rem 0}
.meta{font-size:.85rem;opacity:.6}
.trad h2{margin-top:2.4rem}
.app-link{display:inline-block;margin-top:2rem;padding:.5rem .9rem;border:1px solid currentColor;
  border-radius:4px;font-size:.9rem}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #8884;font-size:.85rem;opacity:.6}`;

const page = (title, desc, body, extraHead = '') => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
${extraHead}<style>${STYLE}</style>
</head><body>
${body}
<footer>Pantheon Registry — a source-cited index of the world's mythological and
historical figures. <a href="${BASE}">Interactive app</a> ·
<a href="index.html">Full registry</a></footer>
</body></html>`;

// ── per-figure pages ───────────────────────────────────────────────────────
function figurePage(id) {
  const p = PEOPLE[id];
  const div = (PR.divinity && PR.divinity[id]) || null;
  const tline = [p.tradition, p.type, p.temporal && p.temporal.era].filter(Boolean).map(humanize).join(' · ');
  const parents = (p.parentIds || []).filter((x) => x);
  const kids = CHILDREN.get(id) || [];
  const domains = (p.domains || []).map((d) => humanize(d.sphereId)).filter(Boolean);
  const powers = (p.faculties || []).map((f) => f.name || humanize(f.id)).filter(Boolean);
  const epithets = (p.epithets || []).map((e) => e.original).filter(Boolean);
  const relations = (p.relations || []).filter((r) => r.personId);
  const sources = sourcesOf(p);
  const desc = (p.notes ? String(p.notes).slice(0, 200)
    : `${primary(p)} — ${tline}.`).replace(/\s+/g, ' ').trim();

  const sec = (label, html) => html ? `<h2>${label}</h2>${html}` : '';
  const list = (arr) => arr.length ? `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';

  const ld = {
    '@context': 'https://schema.org', '@type': 'Person',
    name: primary(p),
    alternateName: (p.name && p.name.alt) || undefined,
    description: desc,
    additionalType: 'https://schema.org/Thing',
    subjectOf: sources.length ? sources.slice(0, 12).map((s) => ({ '@type': 'CreativeWork', name: s })) : undefined,
    url: `${BASE}registry/${id}.html`,
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
  const canonical = `<link rel="canonical" href="${BASE}registry/${esc(id)}.html">\n`;

  const body = `<nav class="crumb"><a href="index.html">← Registry</a></nav>
<h1>${esc(primary(p))}</h1>
<div class="sub">${esc(tline)}${div && div.tier ? ` · ${esc(humanize(div.tier))}` : ''}</div>
${p.notes ? `<p>${esc(p.notes)}</p>` : ''}
${sec('Parentage', list(parents.map(figLink)))}
${sec('Children', list(kids.map(figLink)))}
${sec('Domains', list(domains.map(esc)))}
${sec('Powers', list(powers.map(esc)))}
${sec('Epithets', list(epithets.map(esc)))}
${sec('Relations', list(relations.map((r) => `${esc(humanize(r.kind))}: ${figLink(r.personId)}`)))}
${sec('Sources', list(sources.map(esc)))}
<a class="app-link" href="${BASE}#/browse/${esc(id)}">Open in the interactive app →</a>`;
  return page(`${primary(p)} — Pantheon Registry`, desc, body, canonical + jsonld);
}

// ── master index ───────────────────────────────────────────────────────────
function indexPage() {
  const byTrad = new Map();
  for (const id of IDS) {
    const t = PEOPLE[id].tradition || 'Unattributed';
    if (!byTrad.has(t)) byTrad.set(t, []);
    byTrad.get(t).push(id);
  }
  const trads = [...byTrad.keys()].sort((a, b) => a.localeCompare(b));
  const sections = trads.map((t) => {
    const ids = byTrad.get(t).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    const items = ids.map((id) => {
      const p = PEOPLE[id];
      const meta = [p.type, p.temporal && p.temporal.era].filter(Boolean).map(humanize).join(' · ');
      return `<li><a href="${esc(id)}.html">${esc(primary(p))}</a>${meta ? ` <span class="meta">${esc(meta)}</span>` : ''}</li>`;
    }).join('');
    return `<section class="trad"><h2 id="${esc(t.replace(/\s+/g, '-').toLowerCase())}">${esc(t)} <span class="meta">${ids.length}</span></h2><ul>${items}</ul></section>`;
  }).join('\n');

  const desc = `Browse all ${IDS.length.toLocaleString()} cited figures across ${trads.length} traditions in the Pantheon Registry.`;
  const body = `<nav class="crumb"><a href="${BASE}">← Interactive app</a></nav>
<h1>Pantheon Registry</h1>
<div class="sub">A source-cited index of ${IDS.length.toLocaleString()} mythological and historical figures across ${trads.length} traditions.</div>
<p>This is a static, fully-readable mirror of the corpus for search engines and
tools that don't run JavaScript. Every figure links to its cited detail page.
For the interactive graph, map, and search, use the <a href="${BASE}">app</a>.</p>
${sections}`;
  return page('Pantheon Registry — full figure index', desc, body,
    `<link rel="canonical" href="${BASE}registry/index.html">\n`);
}

// ── sitemap + robots ─────────────────────────────────────────────────────────
function sitemap() {
  const urls = [BASE, `${BASE}registry/index.html`, ...IDS.map((id) => `${BASE}registry/${id}.html`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')
    + `\n</urlset>\n`;
}
const robots = () => `User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`;

// ── inject SEO head + noscript crawl-path into the shell ─────────────────────
function enrichShell() {
  const shellPath = path.join(SITE, 'index.html');
  if (!fs.existsSync(shellPath)) {
    console.error(`[static] ${shellPath} missing — run \`python3 build.py --pages\` first`);
    process.exit(1);
  }
  let html = fs.readFileSync(shellPath, 'utf8');
  if (html.includes('<!-- pr-static -->')) return; // idempotent (fresh build overwrites)

  const trads = new Set(IDS.map((id) => PEOPLE[id].tradition)).size;
  const head = `<!-- pr-static -->
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}">
<link rel="sitemap" type="application/xml" href="${BASE}sitemap.xml">
`;
  const noscript = `<!-- pr-static -->
<noscript>
  <div style="max-width:52rem;margin:0 auto;padding:2rem 1.25rem;font-family:Georgia,serif">
    <h1>Pantheon Registry</h1>
    <p>A source-cited index of ${IDS.length.toLocaleString()} mythological and historical
    figures across ${trads} traditions. The interactive app needs JavaScript, but the
    full corpus is readable as static pages:</p>
    <p><a href="${BASE}registry/index.html"><strong>Browse all ${IDS.length.toLocaleString()} figures →</strong></a></p>
  </div>
</noscript>
`;
  // A DOM-present crawl path to the static registry, OUTSIDE <noscript>. A real
  // browser renders the app and never sees it (visually hidden via the standard
  // clip pattern — not display:none, so it stays followable by crawlers and
  // readable by assistive tech). But a plain HTML fetcher — including AI browse
  // tools that grab only "/", don't run JS, and strip <noscript> — still finds
  // the link to the 4,000+ readable pages instead of just the boot shell.
  // No own marker — this is part of the single body injection (the noscript
  // below carries the marker), so the idempotency count stays head + body = 2.
  const crawlNav = `<nav aria-label="Static registry" style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0">
  <a href="${BASE}registry/index.html">Browse all ${IDS.length.toLocaleString()} figures across ${trads} traditions as static, no-JavaScript pages</a>
</nav>
`;
  html = html.replace('</head>', head + '</head>');
  html = html.replace(/<body>/, '<body>\n' + crawlNav + noscript);
  fs.writeFileSync(shellPath, html);
}

// ── write ────────────────────────────────────────────────────────────────────
function main() {
  fs.mkdirSync(REG, { recursive: true });
  let n = 0;
  for (const id of IDS) { fs.writeFileSync(path.join(REG, `${id}.html`), figurePage(id)); n++; }
  fs.writeFileSync(path.join(REG, 'index.html'), indexPage());
  fs.writeFileSync(path.join(SITE, 'sitemap.xml'), sitemap());
  fs.writeFileSync(path.join(SITE, 'robots.txt'), robots());
  enrichShell();
  console.log(`[static] wrote ${n} figure pages + registry index, sitemap (${n + 2} urls), robots.txt; shell enriched`);
}

if (require.main === module) main();
module.exports = { figurePage, indexPage, sitemap };
