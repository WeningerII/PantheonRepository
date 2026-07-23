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
const { citeUrl } = require('../app/cite-links.js');
const { leadFigure } = require('./lib/lead-figure.cjs');

const ROOT = path.resolve(__dirname, '..');
const SITE = process.env.PR_STATIC_OUT || path.join(ROOT, 'dist', 'site');
const REG = path.join(SITE, 'registry');
const BASE = (require('../package.json').homepage || 'https://weningerii.github.io/PantheonRepository/').replace(/\/?$/, '/');

const PR = loadCorpus();
const PEOPLE = PR.seedPeople;
const IDS = Object.keys(PEOPLE).sort();
// PD/CC0 figure images (docs/image-licensing.md), self-hosted under
// assets/images/figures/ and copied into dist/site by main(). The static
// page shows the same lead portrait as the SPA infobox — SEO + no-JS parity.
const IMAGES = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data-sources', 'images.json'), 'utf8')); } catch (_) { return {}; } })();

// ── helpers ──────────────────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// Resolve a citation reference to a source URL (null if unlinkable); never
// throws so one bad reference can't abort the deterministic build.
const citeHref = (ref) => { try { return citeUrl(ref) || null; } catch (_) { return null; } };
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
.lead{float:right;width:min(42%,15rem);margin:.2rem 0 1rem 1.4rem;font-size:.78rem}
.lead img{width:100%;height:auto;display:block;border-radius:6px;background:#8881}
.lead figcaption{opacity:.6;margin-top:.4rem;line-height:1.4}
@media(max-width:34rem){.lead{float:none;width:auto;max-width:18rem;margin:.2rem auto 1.4rem}}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #8884;font-size:.85rem;opacity:.6}`;

const OG_IMAGE = `${BASE}og-image.png`;
const ogTags = (title, desc, url, type = 'article') =>
  `<meta property="og:type" content="${type}">\n`
  + `<meta property="og:site_name" content="Pantheon Registry">\n`
  + `<meta property="og:title" content="${esc(title)}">\n`
  + `<meta property="og:description" content="${esc(desc)}">\n`
  + `<meta property="og:url" content="${esc(url)}">\n`
  + `<meta property="og:image" content="${OG_IMAGE}">\n`
  + `<meta property="og:image:width" content="1200">\n`
  + `<meta property="og:image:height" content="630">\n`
  + `<meta name="twitter:card" content="summary_large_image">\n`
  + `<meta name="twitter:title" content="${esc(title)}">\n`
  + `<meta name="twitter:description" content="${esc(desc)}">\n`
  + `<meta name="twitter:image" content="${OG_IMAGE}">\n`;

const page = (title, desc, body, extraHead = '', url = BASE, type = 'website') => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
${ogTags(title, desc, url, type)}${extraHead}<style>${STYLE}</style>
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

  // PD/CC0 lead portrait, floated top-right (docs/image-licensing.md). Self-hosted
  // under assets/images/figures/; courtesy credit + license link back to Commons.
  const img = IMAGES[id];
  const lead = leadFigure(img, primary(p), BASE);

  const ld = {
    '@context': 'https://schema.org', '@type': 'Person',
    name: primary(p),
    alternateName: (p.name && p.name.alt) || undefined,
    description: desc,
    image: img && img.file ? `${BASE}assets/images/figures/${img.file}` : undefined,
    additionalType: 'https://schema.org/Thing',
    subjectOf: sources.length ? sources.slice(0, 12).map((s) => ({ '@type': 'CreativeWork', name: s })) : undefined,
    url: `${BASE}registry/${id}.html`,
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
  const canonical = `<link rel="canonical" href="${BASE}registry/${esc(id)}.html">\n`;

  const body = `<nav class="crumb"><a href="index.html">← Registry</a></nav>
${lead}<h1>${esc(primary(p))}</h1>
<div class="sub">${esc(tline)}${div && div.tier ? ` · ${esc(humanize(div.tier))}` : ''}</div>
${p.notes ? `<p>${esc(p.notes)}</p>` : ''}
${sec('Parentage', list(parents.map(figLink)))}
${sec('Children', list(kids.map(figLink)))}
${sec('Domains', list(domains.map(esc)))}
${sec('Powers', list(powers.map(esc)))}
${sec('Epithets', list(epithets.map(esc)))}
${sec('Relations', list(relations.map((r) => `${esc(humanize(r.kind))}: ${figLink(r.personId)}`)))}
${sec('Sources', list(sources.map((ref) => {
    const u = citeHref(ref);
    return u ? `<a href="${esc(u)}" rel="nofollow noopener" target="_blank">${esc(ref)}</a>` : esc(ref);
  })))}
<a class="app-link" href="${BASE}#/browse/${esc(id)}">Open in the interactive app →</a>`;
  return page(`${primary(p)} — Pantheon Registry`, desc, body, canonical + jsonld,
    `${BASE}registry/${id}.html`, 'article');
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

// ── LLM-native access: llms.txt front door + a one-file corpus dump ───────────
// LLM browse tools read plain text/Markdown far more reliably than a JS app.
// Following the emerging llmstxt.org convention: /llms.txt is a short Markdown
// map an assistant reads to learn what the site is and where the machine-readable
// content lives; /llms-full.txt is the entire catalog in one fetch. Generated
// from the same corpus as everything else — one source of truth, never drifts.
const altNames = (p) => ((p.name && p.name.alt) || [])
  .map((a) => (typeof a === 'string' ? a : a && (a.value || a.primary)))
  .filter(Boolean);

// Stable URL slug for a tradition name (used for the per-tradition llms files).
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unattributed';

// Figures grouped by tradition, sorted — shared by the full dump, the JSON dump,
// and the per-tradition files so all three partition identically.
function groupByTradition() {
  const byTrad = new Map();
  for (const id of IDS) {
    const t = PEOPLE[id].tradition || 'Unattributed';
    if (!byTrad.has(t)) byTrad.set(t, []);
    byTrad.get(t).push(id);
  }
  const trads = [...byTrad.keys()].sort((a, b) => a.localeCompare(b));
  for (const t of trads) byTrad.get(t).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  // Collision-safe slug map (distinct names that slug alike get -2, -3, …).
  const slugs = new Map(); const used = new Set();
  for (const t of trads) {
    let s = slugify(t); const base = s; let i = 2;
    while (used.has(s)) s = `${base}-${i++}`;
    used.add(s); slugs.set(t, s);
  }
  return { byTrad, trads, slugs };
}

function llmEntry(id) {
  const p = PEOPLE[id];
  const meta = [p.type, p.temporal && p.temporal.era].filter(Boolean).map(humanize).join(', ');
  const alt = altNames(p);
  const notes = (p.notes ? String(p.notes) : '').replace(/\s+/g, ' ').trim();
  const summary = notes.length > 220 ? notes.slice(0, 217).trimEnd() + '…' : notes;
  const paren = [alt.length ? `also ${alt.join(', ')}` : '', meta].filter(Boolean).join('; ');
  return `- **${primary(p)}**${paren ? ` (${paren})` : ''}${summary ? ` — ${summary}` : ''} — ${BASE}registry/${id}.html`;
}

function llmsFull() {
  const { byTrad, trads } = groupByTradition();
  const sections = trads.map((t) =>
    `## ${t} (${byTrad.get(t).length})\n\n` + byTrad.get(t).map(llmEntry).join('\n')
  ).join('\n\n');
  return `# Pantheon Registry — full figure catalog\n\n`
    + `A source-cited index of ${IDS.length.toLocaleString()} mythological and historical figures across `
    + `${trads.length} traditions. Each entry gives the name, alternate names, type, era, and a one-line `
    + `summary; follow the page link for the fully-cited detail (genealogy, divinity, domains, powers, `
    + `epithets, typed relations, and per-claim sources).\n\n`
    + `Interactive app: ${BASE}\nPer-figure page pattern: ${BASE}registry/<id>.html\n\n`
    + sections + '\n';
}

function llmsIndex() {
  const trads = new Set(IDS.map((id) => PEOPLE[id].tradition || 'Unattributed')).size;
  return `# Pantheon Registry\n\n`
    + `> A source-cited index of ${IDS.length.toLocaleString()} mythological and historical figures across `
    + `${trads} traditions — genealogies, domains, powers, epithets, iconography, cult, and cross-tradition `
    + `equivalents. Every claim carries scholarly citations.\n\n`
    + `The interactive site is a JavaScript app, but the whole corpus is published as plain, JS-free text and `
    + `data that machines can read directly.\n\n`
    + `## Whole corpus, one fetch\n\n`
    + `- [/llms-full.txt](${BASE}llms-full.txt): every figure — name, alternate names, type, era, one-line `
    + `summary, page link — grouped by tradition, in Markdown.\n`
    + `- [/registry/figures.json](${BASE}registry/figures.json): the catalog as structured JSON — id, names, `
    + `tradition, type, era, divinity, parents, children, domains, powers, summary, url. For code.\n`
    + `- [/llms/index.txt](${BASE}llms/index.txt): one Markdown file per tradition, to read just one `
    + `(e.g. ${BASE}llms/norse.txt) without the whole corpus.\n`
    + `- [Registry index](${BASE}registry/index.html): the same, as linked HTML.\n`
    + `- [Sitemap](${BASE}sitemap.xml): every URL.\n\n`
    + `## One figure at a time\n\n`
    + `Each figure has a static, source-cited page (with schema.org JSON-LD) at \`${BASE}registry/<id>.html\` — `
    + `for example ${BASE}registry/greek_hesiod_zeus.html — carrying genealogy, divinity, domains, powers, `
    + `epithets, typed relations, and per-claim citations.\n\n`
    + `## Structured queries (richest) — live MCP server\n\n`
    + `A Model Context Protocol server exposes the same corpus with 14 tools built for LLMs: `
    + `\`search_figures\`, \`get_figure\` (one-call \`dossier\` view), \`relate\`, \`trace_lineage\`, `
    + `\`cross_tradition_equivalents\`, \`who_governs\` / \`who_wields\`, \`get_item\`, \`vocab\`, \`aggregate\`.\n\n`
    + `- Endpoint (Streamable HTTP): \`POST https://pantheon-registry-mcp.onrender.com/mcp\`\n`
    + `- Health check: \`GET https://pantheon-registry-mcp.onrender.com/healthz\`\n`
    + `- Tools + setup: https://github.com/WeningerII/PantheonRepository/tree/main/mcp\n\n`
    + `**Cold start** — this server sleeps when idle. Before your first query, GET the /healthz URL to wake it. `
    + `If it does not answer within a few seconds it is booting: wait ~60 seconds, GET /healthz again until it `
    + `returns 200, then make MCP calls normally. For an always-instant option that needs no warm-up, read `
    + `${BASE}llms-full.txt instead.\n\n`
    + `## Interactive\n\n`
    + `- [The app](${BASE}): browse, relationship graph, atlas, and search.\n\n`
    + `All static pages are JavaScript-free and source-cited.\n`;
}

// ── figures.json — the catalog as structured data for code-based agents ──────
// A stable, documented subset (not the app's internal 20 MB corpus tier): one
// record per figure with the fields an agent needs to build on without fetching
// 4,000 pages. Full relations, epithets, and per-claim citations stay on each
// figure's page and the MCP server. Emitted one figure per line (valid JSON,
// diff-friendly).
function figureRecord(id) {
  const p = PEOPLE[id];
  const div = (PR.divinity && PR.divinity[id]) || null;
  return {
    id,
    name: primary(p),
    altNames: altNames(p),
    tradition: p.tradition || null,
    type: p.type || null,
    era: (p.temporal && p.temporal.era) || null,
    divinity: div && div.tier ? humanize(div.tier) : null,
    parents: (p.parentIds || []).filter(Boolean),
    children: CHILDREN.get(id) || [],
    domains: (p.domains || []).map((d) => humanize(d.sphereId)).filter(Boolean),
    powers: (p.faculties || []).map((f) => f.name || humanize(f.id)).filter(Boolean),
    summary: (p.notes ? String(p.notes) : '').replace(/\s+/g, ' ').trim(),
    url: `${BASE}registry/${id}.html`,
    sources: sourcesOf(p).map((ref) => ({ reference: ref, url: citeHref(ref) })),
  };
}
function figuresJson() {
  const figures = IDS.map(figureRecord);
  return '{\n'
    + `"registry": "Pantheon Registry",\n`
    + `"source": ${JSON.stringify(BASE)},\n`
    + `"count": ${figures.length},\n`
    + `"schema": ${JSON.stringify('id, name, altNames[], tradition, type, era, divinity, parents[], children[], domains[], powers[], summary, url, sources[{reference, url}] (url is null when the reference has no resolvable source link). Full typed relations and epithets are on each figure\'s url page and via the MCP server at ' + BASE)},\n`
    + `"figures": [\n`
    + figures.map((f) => JSON.stringify(f)).join(',\n')
    + `\n]\n}\n`;
}

// ── per-tradition Markdown files — read one tradition without the full dump ───
function traditionFiles() {
  const { byTrad, trads, slugs } = groupByTradition();
  const dir = path.join(SITE, 'llms');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of trads) {
    const ids = byTrad.get(t);
    const body = `# ${t} — Pantheon Registry (${ids.length} figures)\n\n`
      + `The source-cited figures of the ${t} tradition. Whole corpus: ${BASE}llms-full.txt · `
      + `Structured JSON: ${BASE}registry/figures.json · App: ${BASE}\n\n`
      + ids.map(llmEntry).join('\n') + '\n';
    fs.writeFileSync(path.join(dir, `${slugs.get(t)}.txt`), body);
  }
  const index = `# Pantheon Registry — per-tradition files\n\n`
    + `Each tradition's figures as a standalone Markdown file, so you can read just one without the whole `
    + `${IDS.length.toLocaleString()}-figure corpus. Filename = the tradition name lowercased with non-alphanumerics as hyphens.\n\n`
    + trads.map((t) => `- ${t} (${byTrad.get(t).length}): ${BASE}llms/${slugs.get(t)}.txt`).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'index.txt'), index);
  return trads.length;
}

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
  fs.writeFileSync(path.join(SITE, 'llms.txt'), llmsIndex());
  fs.writeFileSync(path.join(SITE, 'llms-full.txt'), llmsFull());
  fs.writeFileSync(path.join(REG, 'figures.json'), figuresJson());
  // Social share image, served at the site root for og:image / twitter:image.
  fs.copyFileSync(path.join(ROOT, 'app', 'og-image.png'), path.join(SITE, 'og-image.png'));
  // Self-hosted PD/CC0 figure portraits (docs/image-licensing.md). Copy the whole
  // tree so the static pages and the SPA serve the same files; exclude the _meta
  // provenance archive (kept in the repo, not deployed).
  const imgSrc = path.join(ROOT, 'assets', 'images');
  if (fs.existsSync(imgSrc)) {
    fs.cpSync(imgSrc, path.join(SITE, 'assets', 'images'), {
      recursive: true,
      filter: (s) => !s.split(path.sep).includes('_meta'),
    });
  }
  const tf = traditionFiles();
  enrichShell();
  console.log(`[static] wrote ${n} figure pages + index, sitemap (${n + 2} urls), robots.txt, llms.txt + llms-full.txt, registry/figures.json, ${tf} per-tradition files; shell enriched`);
}

if (require.main === module) main();
module.exports = { figurePage, indexPage, sitemap, llmsIndex, llmsFull, figuresJson, traditionFiles };
