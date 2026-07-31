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
const { langAttr, markRuns } = require('./lib/bcp47.cjs');

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

// The last full stop inside the budget that really ends a sentence: a capital
// (or an opening quote) has to follow it, or "…succeeding his nephew Ramesses
// V. Born c." and "…daughter of Clymenus in Hom. Od." pass as endings — 59 of
// them did, and each reads as a bug rather than a summary. Below two thirds of
// the budget a sentence end costs more text than it buys polish, so the search
// stops there and the word-boundary fallback takes over.
const sentenceEnd = (s, max) => {
  for (let i = max - 1; i >= Math.floor(max * 0.66); i--) {
    if ('.!?'.indexOf(s[i]) < 0 || s[i + 1] !== ' ') continue;
    if (/[\p{Lu}"'(“‘]/u.test(s[i + 2] || '')) return i;
  }
  return -1;
};

// Truncate to a boundary a reader can see rather than to a character count.
// The meta descriptions were `String(p.notes).slice(0, 200)`, which cut
// mid-word on 2,947 of the 4,517 descriptions it truncated, and normalised
// whitespace only AFTER slicing — so a note with a newline inside the first 200
// characters silently lost whatever the collapse removed, and 771 descriptions
// came out short. Google's own snippet truncation fires long before 200
// characters, so what this actually fixes is Slack/X/Facebook unfurls and the
// LLM crawlers that read the tag verbatim. Shared with the llms.txt entry
// summaries, so the two never disagree about where a note ends.
const clip = (text, max) => {
  const s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const stop = sentenceEnd(s, max);
  if (stop >= 0) return s.slice(0, stop + 1);
  const head = s.slice(0, max);
  const space = head.lastIndexOf(' ');
  return (space > 0 ? head.slice(0, space) : head).replace(/[\s,;:·—–-]+$/, '') + '…';
};

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

// One text run, ready to place in an element: [lang attribute, inner HTML].
// A corpus that is ~97% non-Latin-script renders Ἀθηνᾶ, Анцәа and العزى inside
// documents declared lang="en", so every run of corpus text that reaches the
// page goes through here (scripts/lib/bcp47.cjs). When one script owns the
// whole run the element carries the subtag; when the run is mixed — a native
// name glossed in English prose — the element cannot honestly claim one, so the
// non-Latin stretches inside get their own spans instead. Pure Latin text comes
// back exactly as esc() left it.
const scripted = (raw) => {
  const l = langAttr(raw);
  return l ? [l, esc(raw)] : ['', markRuns(esc(raw))];
};

// A figure link that only resolves to a page when the target actually exists.
const figLink = (id) => {
  if (!PEOPLE[id]) return esc(id);
  const [l, html] = scripted(nameOf(id));
  return `<a href="${esc(id)}.html"${l}>${html}</a>`;
};

// These pages are the JS-free mirror, but they are NOT crawler-only: they are
// what Google and every LLM link resolves to, so a human lands here regularly.
// They therefore carry the app's own palette and type — paper background, ink
// text, brick accent, serif display, mono section labels (app/styles.css :root)
// — so arriving from a search result reads as the same site, not a different
// one. Deliberately LIGHT-ONLY, matching the app: `color-scheme: light dark`
// plus a prefers-color-scheme override used to repaint these pages near-black
// for anyone whose OS is in dark mode, while the app beside them stayed cream.
const STYLE = `:root{color-scheme:light;
  --bg:#FAFAF7;--surface:#FFFFFF;--ink:#0B0B0B;--ink-2:#2A2A2A;--ink-3:#555;
  --mute:#65625F;--faint:#6F6D6A;--rule:rgba(0,0,0,.10);--rule-2:rgba(0,0,0,.05);
  --accent:#B5371F;--accent-bg:rgba(181,55,31,.06);
  --serif:'Newsreader','Source Serif Pro',Georgia,serif;
  --sans:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}
body{max-width:46rem;margin:0 auto;padding:3rem 1.5rem 6rem;
  font:400 15px/1.65 var(--sans);color:var(--ink);background:var(--bg);
  -webkit-font-smoothing:antialiased}
/* Links inside prose and list items must not be signalled by colour alone —
   brick on ink is 2.41:1, below the 3:1 the rule asks of a colour-only cue. A
   hairline underline carries the signal; hover darkens it to full strength.
   Standalone chrome (breadcrumb, the app button) is not in a text block and
   keeps its clean look. */
a{color:var(--accent);text-decoration:underline;
  text-underline-offset:2px;text-decoration-thickness:.06em;
  text-decoration-color:rgba(181,55,31,.45)}
a:hover{text-decoration-color:currentColor}
.crumb a,.app-link{text-decoration:none}
.crumb a:hover{text-decoration:underline}
h1{font:500 32px/1.05 var(--serif);letter-spacing:-.018em;margin:.2rem 0 0;
  overflow-wrap:break-word}
h2{font:500 10.5px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;
  color:var(--ink-2);margin:2.2rem 0 .7rem;padding-top:1.1rem;
  border-top:1px solid var(--rule-2)}
p{color:var(--ink-2)}
.sub{font:italic 400 15px/1.4 var(--serif);color:var(--ink-3);margin:.6rem 0 1.6rem}
/* The alias line sits directly under .sub. Its negative top margin collapses
   against .sub's 1.6rem bottom (adjacent siblings collapse to the largest
   positive plus the smallest negative), leaving the .6rem gap the two want,
   without .sub having to know whether an alias line follows it. */
.aka{font:400 13px/1.55 var(--sans);color:var(--ink-3);margin:-1rem 0 1.6rem}
.crumb{font:400 12px/1 var(--mono);letter-spacing:.04em;color:var(--mute);
  margin-bottom:2rem}
.crumb a{color:var(--mute)}
ul{padding-left:1.05rem;margin:.3rem 0}li{margin:.2rem 0;color:var(--ink-2)}
.meta{font:400 11px/1 var(--mono);letter-spacing:.04em;color:var(--faint)}
.trad h2{margin-top:2.6rem}
.app-link{display:inline-block;margin-top:2.6rem;padding:.55rem 1.1rem;
  border:1px solid var(--accent);border-radius:3px;background:var(--accent-bg);
  font:400 12px/1.4 var(--sans);letter-spacing:.02em}
.app-link:hover{color:#fff;background:var(--accent);text-decoration:none}
.lead{float:right;width:min(42%,15rem);margin:.4rem 0 1rem 1.6rem;
  font:400 11px/1.5 var(--mono);letter-spacing:.02em}
.lead img{width:100%;height:auto;display:block;border-radius:2px;
  border:1px solid var(--rule);background:var(--surface)}
.lead figcaption{color:var(--faint);margin-top:.5rem}
.lead figcaption a{color:var(--mute)}
@media(max-width:34rem){.lead{float:none;width:auto;max-width:18rem;margin:.2rem auto 1.6rem}}
footer{margin-top:4rem;padding-top:1.2rem;border-top:1px solid var(--rule);
  font-size:12px;color:var(--mute)}`;

// The house card — the share image for every page that has no picture of its own.
const OG_IMAGE = `${BASE}og-image.png`;
/**
 * @param {object|null} img  the figure's images.json record, when it has one.
 *   All 1,059 image-bearing pages used to unfurl as the identical house card,
 *   which is the one thing a share preview is for. Resolve the filename from
 *   the MANIFEST, never by appending an extension: 51 of the 1,059 are
 *   .jpg/.png/.gif, so an `${id}.webp` guess 404s on every one of them.
 */
const ogTags = (title, desc, url, type = 'article', img = null) => {
  const own = img && img.file;
  const src = own ? `${BASE}assets/images/figures/${esc(img.file)}` : OG_IMAGE;
  // Real intrinsic dimensions, so an unfurler reserves the right box instead of
  // the house card's 1200×630. Omitted rather than guessed if the manifest
  // record somehow lacks them.
  const dims = own
    ? (img.w && img.h ? `<meta property="og:image:width" content="${img.w}">\n<meta property="og:image:height" content="${img.h}">\n` : '')
    : `<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n`;
  return `<meta property="og:type" content="${type}">\n`
    + `<meta property="og:site_name" content="Pantheon Registry">\n`
    + `<meta property="og:title" content="${esc(title)}">\n`
    + `<meta property="og:description" content="${esc(desc)}">\n`
    + `<meta property="og:url" content="${esc(url)}">\n`
    + `<meta property="og:image" content="${src}">\n`
    + dims
    + `<meta name="twitter:card" content="summary_large_image">\n`
    + `<meta name="twitter:title" content="${esc(title)}">\n`
    + `<meta name="twitter:description" content="${esc(desc)}">\n`
    + `<meta name="twitter:image" content="${src}">\n`;
};

// regHref: the tradition hub pages live one directory down, so the footer's
// link back to the full registry cannot be a bare 'index.html' for them.
// The owner's mark (assets/brand/), copied to the site root by main(). Every
// static page needs these: without them each of the 6,000+ pages fires a
// request for /favicon.ico and takes a 404, which Lighthouse counts under
// errors-in-console. Absolute URLs because these pages sit at two directory
// depths (registry/ and registry/tradition/).
const ICON_TAGS = `<link rel="icon" href="${BASE}favicon.ico" sizes="32x32">
<link rel="icon" type="image/png" sizes="96x96" href="${BASE}favicon-96x96.png">
<link rel="apple-touch-icon" sizes="180x180" href="${BASE}apple-touch-icon.png">
`;

// max-image-preview:large is what lets a figure's portrait appear at full size
// in a search result and in Discover instead of a thumbnail; max-snippet:-1
// lifts the snippet cap on pages whose whole value is the cited prose. Both are
// opt-ins — the default is the restrictive one.
// referrer: these pages link out to Commons, museum APIs and Google Books on
// every citation, and with no policy set a browser sends the full path of the
// figure page along. strict-origin-when-cross-origin sends only the origin.
const page = (title, desc, body, extraHead = '', url = BASE, type = 'website', regHref = 'index.html', img = null) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="referrer" content="strict-origin-when-cross-origin">
${ICON_TAGS}
${ogTags(title, desc, url, type, img)}${extraHead}<style>${STYLE}</style>
</head><body>
${body}
<footer>Pantheon Registry — a source-cited index of the world's mythological and
historical figures. <a href="${BASE}">Interactive app</a> ·
<a href="${regHref}">Full registry</a></footer>
</body></html>`;

// ── page titles ──────────────────────────────────────────────────────────────
// 546 figures shared 214 primary names: "Sun" belongs to 14 of them, "Moon" to
// 13, "Coyote" to 11, and every one of those shipped the identical <title>.
// Duplicate titles are duplicate results — the engine keeps one and drops the
// rest — and a reader choosing between fourteen "Sun" links has nothing to go on.
//
// Two rules, and they pull opposite ways on the ~60-character budget a result
// shows, so each is fenced to the case it is for:
//   · a colliding name gets its tradition appended — but only if it is short
//     enough to absorb one. (The longest colliding name is 23 characters, so
//     the fence never fires today; it is what keeps the rule safe as the corpus
//     grows, and prevents a fix for duplication from manufacturing truncation.)
//   · a name past ~48 characters loses the " — Pantheon Registry" suffix, which
//     on those 49 pages only pushes the part a reader needs further out of sight.
const SUFFIX = ' — Pantheon Registry';
const QUALIFY_MAX = 40;
const SUFFIX_MAX = 48;

// Global uniqueness must be computed over the WHOLE corpus before any title is
// emitted — a name is only "unique" relative to every other figure, not to the
// tradition being written.
const NAME_COUNTS = (() => {
  const m = new Map();
  for (const id of IDS) { const n = primary(PEOPLE[id]); m.set(n, (m.get(n) || 0) + 1); }
  return m;
})();

// Tradition, then type, then era — appended only as far as it takes to separate
// a colliding group. Tradition alone leaves 19 pairs ambiguous (mostly Greek
// figures attested twice, e.g. two Apollodoran Antiopes); type and era separate
// 13 of those. The last 6 are near-duplicate corpus records that no field
// distinguishes, and they keep the plain tradition rather than trailing a
// qualifier that would not disambiguate anything.
const qualifiersOf = (p) => [p.tradition || 'Unattributed', p.type, p.temporal && p.temporal.era]
  .filter(Boolean).map(humanize);
const headingAt = (id, depth) => {
  const p = PEOPLE[id];
  const n = primary(p);
  if (NAME_COUNTS.get(n) === 1 || n.length > QUALIFY_MAX) return n;
  const q = qualifiersOf(p).slice(0, depth);
  return q.length ? `${n} (${q.join(', ')})` : n;
};
const TITLE_NAMES = (() => {
  const byName = new Map();
  for (const id of IDS) {
    const n = primary(PEOPLE[id]);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(id);
  }
  const out = new Map();
  for (const ids of byName.values()) {
    let depth = 1;
    for (let d = 1; d <= 3; d++) {
      if (new Set(ids.map((x) => headingAt(x, d))).size === ids.length) { depth = d; break; }
    }
    for (const x of ids) out.set(x, headingAt(x, depth));
  }
  return out;
})();

// og:title and twitter:title come from the same string — ogTags() is handed the
// title, not the <h1> — so a search result and an unfurl always read alike.
const titleFor = (id) => {
  const heading = TITLE_NAMES.get(id) || primary(PEOPLE[id]);
  return primary(PEOPLE[id]).length > SUFFIX_MAX ? heading : heading + SUFFIX;
};

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
  const desc = p.notes ? clip(p.notes, 200) : clip(`${primary(p)} — ${tline}.`, 200);

  const sec = (label, html) => html ? `<h2>${label}</h2>${html}` : '';
  // Two list builders, because only one of them owns the text it prints.
  // textList's items ARE the run, so the <li> carries their script subtag;
  // list's items are already markup whose <a> carries its own, and repeating it
  // on the <li> would claim the surrounding text is in that script too.
  const list = (arr) => arr.length ? `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
  const textList = (arr) => (arr.length
    ? `<ul>${arr.map((x) => { const [l, html] = scripted(x); return `<li${l}>${html}</li>`; }).join('')}</ul>`
    : '');

  // PD/CC0 lead portrait, floated top-right (docs/image-licensing.md). Self-hosted
  // under assets/images/figures/; courtesy credit + license link back to Commons.
  const img = IMAGES[id];
  const lead = leadFigure(img, primary(p), BASE);

  // The alias names, read once and used three times — the visible line below,
  // the JSON-LD here, and llms.txt via altNames() — so the three cannot drift.
  const alts = altNames(p);

  const ld = {
    '@context': 'https://schema.org', '@type': 'Person',
    name: primary(p),
    // A length check, not `|| undefined`: 321 figures carry an empty alt array,
    // and an empty array is truthy, so all 321 emitted `"alternateName":[]`.
    alternateName: alts.length ? alts : undefined,
    description: desc,
    image: img && img.file ? `${BASE}assets/images/figures/${img.file}` : undefined,
    additionalType: 'https://schema.org/Thing',
    subjectOf: sources.length ? sources.slice(0, 12).map((s) => ({ '@type': 'CreativeWork', name: s })) : undefined,
    url: `${BASE}registry/${id}.html`,
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
  const canonical = `<link rel="canonical" href="${BASE}registry/${esc(id)}.html">\n`;

  // Everything but the breadcrumb and the footer sits in <main>: without a main
  // landmark the whole page is landmark-less, which is both a Lighthouse
  // best-practice failure and a real loss for anyone navigating by region.
  // Breadcrumb up to the tradition hub as well as the master index, so the
  // hierarchy is reciprocated: every figure names its parent, not just the
  // parent naming its children.
  const tradName = p.tradition || 'Unattributed';
  const tradSlug = TRAD_SLUGS.get(tradName);
  const crumb = `<nav class="crumb"><a href="index.html">← Registry</a>`
    + (tradSlug ? ` · <a href="${TRAD_DIR}/${esc(tradSlug)}.html">${esc(tradName)}</a>` : '')
    + `</nav>`;

  // The same trail, machine-readable. Registry URLs are flat
  // (/registry/<slug>.html), so nothing in the path tells a crawler that a
  // figure sits under a tradition — a BreadcrumbList is the only way to say it,
  // and it is the one rich result this content type is eligible for. Built from
  // the SAME tradName/tradSlug the visible crumb above uses, so the markup and
  // the structured data cannot drift apart.
  const crumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Pantheon Registry', item: `${BASE}registry/index.html` },
      ...(tradSlug ? [{ '@type': 'ListItem', position: 2, name: tradName, item: `${BASE}registry/${TRAD_DIR}/${tradSlug}.html` }] : []),
      { '@type': 'ListItem', position: tradSlug ? 3 : 2, name: primary(p), item: `${BASE}registry/${id}.html` },
    ],
  };
  const crumbJsonld = `<script type="application/ld+json">${JSON.stringify(crumbLd).replace(/</g, '\\u003c')}</script>\n`;

  // The aliases, in the page a reader (and a keyword index) can actually see.
  // 2,519 figures carried alternates that appeared nowhere but a <script> tag —
  // worst where the <h1> is a descriptor, as on abkhaz_antswa.html, which is
  // headed "Supreme God of the Abkhaz" while Antswa / Ancwa / Antsua / Анцәа
  // lived only in JSON-LD. schema.org alternateName is not a matching signal;
  // visible text is, and transliteration variance is the dominant query form
  // for a corpus that is ~97% non-Latin-script. llms-full.txt already published
  // these correctly, which is how the gap showed up.
  //
  // The line mixes scripts by nature ("Antswa · Анцәа"), so the subtag goes on
  // each name rather than the line — tagging the whole thing would hand the
  // Latin aliases to a Cyrillic voice. Latin-only names get no wrapper at all.
  const akaName = (a) => { const [l, html] = scripted(a); return l ? `<span${l}>${html}</span>` : html; };
  const aka = alts.length
    ? `<div class="aka">Also known as: ${alts.map(akaName).join(' · ')}</div>` : '';

  const [nameLang, nameHtml] = scripted(primary(p));
  const [notesLang, notesHtml] = scripted(p.notes || '');
  const body = `${crumb}
<main>
${lead}<h1${nameLang}>${nameHtml}</h1>
<div class="sub">${esc(tline)}${div && div.tier ? ` · ${esc(humanize(div.tier))}` : ''}</div>
${aka}
${p.notes ? `<p${notesLang}>${notesHtml}</p>` : ''}
${sec('Parentage', list(parents.map(figLink)))}
${sec('Children', list(kids.map(figLink)))}
${sec('Domains', textList(domains))}
${sec('Powers', textList(powers))}
${sec('Epithets', textList(epithets))}
${sec('Relations', list(relations.map((r) => `${esc(humanize(r.kind))}: ${figLink(r.personId)}`)))}
${sec('Sources', list(sources.map((ref) => {
    // 75 pages cite Russian-language scholarship by its Cyrillic title, which
    // is the reference text itself and needs the same treatment as an epithet.
    const [l, html] = scripted(ref);
    const u = citeHref(ref);
    if (u) return `<a href="${esc(u)}"${l} rel="nofollow noopener" target="_blank">${html}</a>`;
    return l ? `<span${l}>${html}</span>` : html;
  })))}
<a class="app-link" href="${BASE}#/browse/${esc(id)}">Open in the interactive app →</a>
</main>`;
  return page(titleFor(id), desc, body, canonical + jsonld + crumbJsonld,
    `${BASE}registry/${id}.html`, 'article', 'index.html', img);
}

// ── master index ───────────────────────────────────────────────────────────
function indexPage() {
  // Share the grouping (and the collision-safe slugs) with the hub pages and the
  // sitemap, so all three partition the corpus identically.
  const { byTrad, trads, slugs } = groupByTradition();
  // Section anchors must stay unique as the corpus grows: two tradition names
  // that differ only by case or spacing slug to the same string, and duplicate
  // ids silently break in-page links and confuse assistive technology.
  const seenAnchors = new Set();
  const anchorFor = (t) => {
    const base = t.replace(/\s+/g, '-').toLowerCase();
    let a = base;
    for (let n = 2; seenAnchors.has(a); n++) a = `${base}-${n}`;
    seenAnchors.add(a);
    return a;
  };
  const sections = trads.map((t) => {
    const ids = byTrad.get(t).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    const items = ids.map((id) => {
      const p = PEOPLE[id];
      const meta = [p.type, p.temporal && p.temporal.era].filter(Boolean).map(humanize).join(' · ');
      const [l, name] = scripted(primary(p));
      return `<li><a href="${esc(id)}.html"${l}>${name}</a>${meta ? ` <span class="meta">${esc(meta)}</span>` : ''}</li>`;
    }).join('');
    // The heading links down to the tradition's own page — that hub is what
    // gives the figures below a parent narrower than "all 5,721 of them".
    return `<section class="trad"><h2 id="${esc(anchorFor(t))}">`
      + `<a href="${TRAD_DIR}/${esc(slugs.get(t))}.html">${esc(t)}</a> `
      + `<span class="meta">${ids.length}</span></h2><ul>${items}</ul></section>`;
  }).join('\n');

  const desc = `Browse all ${IDS.length.toLocaleString()} cited figures across ${trads.length} traditions in the Pantheon Registry.`;
  const body = `<nav class="crumb"><a href="${BASE}">← Interactive app</a></nav>
<main>
<h1>Pantheon Registry</h1>
<div class="sub">A source-cited index of ${IDS.length.toLocaleString()} mythological and historical figures across ${trads.length} traditions.</div>
<p>This is a static, fully-readable mirror of the corpus for search engines and
tools that don't run JavaScript. Every figure links to its cited detail page,
and every tradition heading links to that tradition's own page.
For the interactive graph, map, and search, use the <a href="${BASE}">app</a>.</p>
${sections}
</main>`;
  return page('Pantheon Registry — full figure index', desc, body,
    `<link rel="canonical" href="${BASE}registry/index.html">\n`);
}

// ── per-tradition hub pages ──────────────────────────────────────────────────
// The master index links all 5,721 figures from a single page, so every figure
// URL shares one parent and one undifferentiated pool of crawl priority. These
// sit in between: one page per tradition, cheap to crawl, each linking only its
// own figures plus the traditions it actually shares figures with. That last
// part matters — it turns a flat fan-out into a connected graph a crawler can
// work through, and it is also the level a reader wants ("the Norse ones").
//
// Each page carries a derived summary rather than a bare list of links, because
// 560 near-identical list pages is the shape search engines treat as doorway
// content. The counts, tier breakdown, era span and domain summary are computed
// per tradition and are genuinely different on every page.
const TRAD_DIR = 'tradition';
// Memoised, and read at call time rather than module-eval time: figurePage()
// needs the slug map, but groupByTradition() and slugify() are defined further
// down this file. One shared map keeps figure breadcrumbs, the index headings,
// the hub filenames and the sitemap pointing at exactly the same URLs.
let _tradSlugs = null;
const TRAD_SLUGS = { get: (t) => (_tradSlugs || (_tradSlugs = groupByTradition().slugs)).get(t) };
// Same order the app's rail uses (TYPE_ORDER in app/state.jsx): most divine
// first, so the figures a reader came for are at the top.
const TIER_ORDER = ['deity', 'numen', 'demigod', 'quartigod', 'scion', 'mortal'];
// Naive +s gives "deitys" and "numens"; both are wrong and both are visible in
// the meta description, which is the first thing a search result shows.
const TIER_PLURAL = { deity: 'deities', numen: 'numina', unclassified: 'unclassified figures' };
const tierRank = (t) => { const i = TIER_ORDER.indexOf(t); return i < 0 ? TIER_ORDER.length : i; };
const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many || one + 's'}`;
const tierPlural = (k, n) => plural(n, humanize(k), TIER_PLURAL[k]);

// Traditions this one shares figures with, via parentage or a stated relation.
// Counted in both directions so the link graph is symmetric and every edge is
// reciprocated — a crawler arriving at either end finds the other.
function neighbourTraditions(t, ids, byTrad) {
  const idSet = new Set(ids);
  const counts = new Map();
  const bump = (other) => {
    if (!other || other === t || !byTrad.has(other)) return;
    counts.set(other, (counts.get(other) || 0) + 1);
  };
  const tradOf = (fid) => PEOPLE[fid] && (PEOPLE[fid].tradition || 'Unattributed');
  for (const id of ids) {
    const p = PEOPLE[id];
    for (const pid of (p.parentIds || [])) bump(tradOf(pid));
    for (const r of (p.relations || [])) if (r && r.personId) bump(tradOf(r.personId));
  }
  // Inbound edges too: a figure elsewhere naming one of ours.
  for (const other of byTrad.keys()) {
    if (other === t) continue;
    for (const oid of byTrad.get(other)) {
      const p = PEOPLE[oid];
      const hits = [...(p.parentIds || []), ...(p.relations || []).map((r) => r && r.personId)]
        .filter((x) => x && idSet.has(x)).length;
      if (hits) counts.set(other, (counts.get(other) || 0) + hits);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function traditionPage(t, ids, slugs, byTrad) {
  const slug = slugs.get(t);
  const url = `${BASE}registry/${TRAD_DIR}/${slug}.html`;

  // ── derived summary (unique per tradition) ──
  const byTier = new Map();
  for (const id of ids) {
    const k = PEOPLE[id].type || 'unclassified';
    if (!byTier.has(k)) byTier.set(k, []);
    byTier.get(k).push(id);
  }
  const tiers = [...byTier.keys()].sort((a, b) => tierRank(a) - tierRank(b) || a.localeCompare(b));
  const tierPhrase = tiers.map((k) => tierPlural(k, byTier.get(k).length)).join(', ');

  const eras = [...new Set(ids.map((id) => PEOPLE[id].temporal && PEOPLE[id].temporal.era)
    .filter(Boolean).map(humanize))].sort();
  const domainCounts = new Map();
  for (const id of ids) {
    for (const d of (PEOPLE[id].domains || [])) {
      const k = humanize(d.sphereId);
      if (k) domainCounts.set(k, (domainCounts.get(k) || 0) + 1);
    }
  }
  const topDomains = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([k]) => k);
  const cited = ids.filter((id) => sourcesOf(PEOPLE[id]).length).length;

  const desc = `All ${plural(ids.length, 'figure')} of the ${t} tradition in the Pantheon Registry`
    + `${tierPhrase ? ` — ${tierPhrase}` : ''}. Genealogy, domains, epithets and cited sources for each.`;

  const neighbours = neighbourTraditions(t, ids, byTrad);

  // ── body ──
  const sec = (label, html) => html ? `<h2>${label}</h2>${html}` : '';
  const figureList = (list) => `<ul>${list.map((id) => {
    const p = PEOPLE[id];
    const meta = [p.temporal && p.temporal.era].filter(Boolean).map(humanize).join(' · ');
    const [l, name] = scripted(primary(p));
    return `<li><a href="../${esc(id)}.html"${l}>${name}</a>`
      + `${meta ? ` <span class="meta">${esc(meta)}</span>` : ''}</li>`;
  }).join('')}</ul>`;

  // Plural, capitalised: the CSS uppercases these, but the source text is what
  // a screen reader announces and what lands in the accessibility tree.
  const tierHeading = (k) => {
    const word = TIER_PLURAL[k] || `${humanize(k)}s`;
    return word.charAt(0).toUpperCase() + word.slice(1);
  };
  const tierSections = tiers.map((k) =>
    `<h2>${esc(tierHeading(k))} <span class="meta">${byTier.get(k).length}</span></h2>`
    + figureList(byTier.get(k))).join('\n');

  const neighbourList = neighbours.length
    ? `<ul>${neighbours.slice(0, 24).map(([other, n]) =>
      `<li><a href="${esc(slugs.get(other))}.html">${esc(other)}</a> `
      + `<span class="meta">${plural(n, 'shared figure')}</span></li>`).join('')}</ul>`
    : '';

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${t} — Pantheon Registry`,
    description: desc,
    url,
    isPartOf: { '@type': 'CollectionPage', name: 'Pantheon Registry — full figure index', url: `${BASE}registry/index.html` },
    about: { '@type': 'Thing', name: t },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: ids.length,
      itemListElement: ids.slice(0, 100).map((id, i) => ({
        '@type': 'ListItem', position: i + 1, name: primary(PEOPLE[id]),
        url: `${BASE}registry/${id}.html`,
      })),
    },
  };

  // Registry → this hub. isPartOf above states the same relation for a
  // CollectionPage, but only a BreadcrumbList is eligible for the breadcrumb
  // rich result, and the flat /registry/ URL shape gives Google nothing to
  // infer a trail from.
  const crumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Pantheon Registry', item: `${BASE}registry/index.html` },
      { '@type': 'ListItem', position: 2, name: t, item: url },
    ],
  };

  const body = `<nav class="crumb"><a href="../index.html">← Registry</a></nav>
<main>
<h1>${esc(t)}</h1>
<div class="sub">${esc(plural(ids.length, 'figure'))} in the ${esc(t)} tradition</div>
<p>The Pantheon Registry records ${esc(plural(ids.length, 'figure'))} for ${esc(t)}${
  tierPhrase ? `: ${esc(tierPhrase)}` : ''}. ${
  cited === ids.length ? 'Every entry carries' : `${esc(plural(cited, 'entry', 'entries'))} carry`
} at least one cited source.${
  eras.length ? ` Attested ${eras.length === 1 ? 'in the' : 'across'} ${esc(eras.slice(0, 6).join(', '))}${eras.length > 6 ? ` and ${eras.length - 6} further` : ''} ${eras.length === 1 ? 'era' : 'eras'}.` : ''
}${
  topDomains.length ? ` The domains recorded most often here are ${esc(topDomains.join(', '))}.` : ''
}</p>
<p>Each name links to its cited detail page — parentage, children, domains, powers,
epithets, relations and sources. For the interactive graph and map, open
<a href="${BASE}#/browse">the app</a> and filter to ${esc(t)}.</p>
${tierSections}
${sec('Connected traditions', neighbourList)}
<a class="app-link" href="${BASE}#/browse">Open in the interactive app →</a>
</main>`;

  return page(`${t} — ${plural(ids.length, 'figure')} — Pantheon Registry`, desc, body,
    `<link rel="canonical" href="${url}">\n`
    + `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`
    + `<script type="application/ld+json">${JSON.stringify(crumbLd).replace(/</g, '\\u003c')}</script>\n`,
    url, 'website', '../index.html');
}

// ── sitemap + robots ─────────────────────────────────────────────────────────
function sitemap() {
  const { trads, slugs } = groupByTradition();
  const urls = [
    BASE,
    `${BASE}registry/index.html`,
    // Hubs before the figures they parent: a crawler working the file in order
    // meets the tradition page first and can use it to prioritise.
    ...trads.map((t) => `${BASE}registry/${TRAD_DIR}/${slugs.get(t)}.html`),
    ...IDS.map((id) => `${BASE}registry/${id}.html`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')
    + `\n</urlset>\n`;
}
// figures.json is 7.7 MB, is referenced by no HTML page and no JS on the site,
// and is reachable — so a crawler that finds it spends most of its budget for
// this host on one file that will never be a search result. The longer, more
// specific Disallow wins over Allow: / under the standard's most-specific-match
// rule. It stays served, and stays advertised in llms.txt: the LLM clients it
// is written for do not consult robots.txt, so their access is unaffected.
const robots = () => `User-agent: *\nAllow: /\nDisallow: /registry/figures.json\nSitemap: ${BASE}sitemap.xml\n`;

// ── LLM-native access: llms.txt front door + a one-file corpus dump ───────────
// LLM browse tools read plain text/Markdown far more reliably than a JS app.
// Following the emerging llmstxt.org convention: /llms.txt is a short Markdown
// map an assistant reads to learn what the site is and where the machine-readable
// content lives; /llms-full.txt is the entire catalog in one fetch. Generated
// from the same corpus as everything else — one source of truth, never drifts.
const altNames = (p) => ((p.name && p.name.alt) || [])
  .map((a) => (typeof a === 'string' ? a : a && (a.value || a.primary)))
  .filter(Boolean);

// Stable URL slug for a tradition name — used for the per-tradition llms files
// and for the tradition hub pages, so the two always agree.
//
// Diacritics are folded rather than dropped. Stripping them outright turned
// "Sámi" into "s-mi" and "Ashéninka" into "ash-ninka": stable, but unreadable
// in a URL and useless as a search-result breadcrumb. NFD decomposition handles
// most Latin marks; the letters below have no decomposition and need naming.
const FOLD = { 'ð': 'd', 'þ': 'th', 'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'ß': 'ss', 'ŋ': 'n', 'ħ': 'h', 'ł': 'l', 'đ': 'd', 'ı': 'i' };
const slugify = (s) => String(s)
  .toLowerCase()
  .replace(/[ðþøæœßŋħłđı]/g, (c) => FOLD[c])
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip combining marks
  .replace(/[’'`]/g, '')                              // elide apostrophes, don't split on them
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unattributed';

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
  const summary = clip(p.notes, 220);
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

// What the citations actually are, counted rather than asserted. app/cite-links.js
// deliberately resolves a reference to a SEARCH endpoint whenever it cannot
// verify a deep link — a search URL cannot 404, so it is an honest "find this"
// affordance — but that means most references point at a result page rather
// than at the passage. Counting it here rather than writing a number into the
// prose means the claim tracks the corpus as references get resolved, instead
// of going stale (and untrue) the moment someone fixes a batch.
const isSearchUrl = (u) => /google\.com\/search|scholar\.google\.com|archive\.org\/search|Special:Search/i.test(u || '');
function citationStats() {
  let total = 0;
  let resolved = 0;
  for (const id of IDS) {
    for (const ref of sourcesOf(PEOPLE[id])) {
      total++;
      const u = citeHref(ref);
      if (u && !isSearchUrl(u)) resolved++;
    }
  }
  return { total, resolved };
}

function llmsIndex() {
  const trads = new Set(IDS.map((id) => PEOPLE[id].tradition || 'Unattributed')).size;
  const { total, resolved } = citationStats();
  return `# Pantheon Registry\n\n`
    + `> A source-cited index of ${IDS.length.toLocaleString()} mythological and historical figures across `
    + `${trads} traditions — genealogies, domains, powers, epithets, iconography, cult, and cross-tradition `
    + `equivalents. Every entry carries source references.\n\n`
    + `**What "source-cited" means here.** Each claim names a reference — a classical text and passage, a `
    + `scripture citation, a named monograph. ${resolved.toLocaleString()} of the ${total.toLocaleString()} `
    + `references resolve to the cited text itself (Theoi, sacred-texts.com, Wikisource, BibleGateway, `
    + `quran.com); the remainder resolve to a search for the work — Google Books, archive.org, Wikipedia — `
    + `or carry no link at all. A search pointer tells you what to look for, not where to read it. Turning `
    + `those into resolved citations is ongoing work; treat an unresolved reference as a lead, not as a `
    + `verified source.\n\n`
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
  // Large icons + PWA manifest. The tab favicon is a data: URI in the template
  // (build.py, from assets/favicon.svg) because it must also work in the
  // file:// artifact; these are file-backed and Pages-only, since iOS and
  // Android fetch them by URL.
  // build.py already emits the two <link rel="icon"> tags in the shell (it
  // needs to, because the artifact takes a different form). These are the
  // extras only the deployed site can use.
  const icons = `<link rel="apple-touch-icon" sizes="180x180" href="${BASE}apple-touch-icon.png">
<link rel="manifest" href="${BASE}site.webmanifest">
<meta name="theme-color" content="#FAFAF7">
`;
  // Site-level structured data. The per-figure pages already carry Person
  // JSON-LD; the shell — the URL that actually gets shared and indexed — had
  // none, so a search engine had no machine-readable statement of what the
  // site is or how large the collection is.
  const siteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Pantheon Registry',
    alternateName: 'List of Gods',
    url: BASE,
    description: `A source-cited index of ${IDS.length.toLocaleString()} mythological and historical `
      + `figures across ${trads} traditions — genealogies, domains, epithets, iconography, and cult.`,
    inLanguage: 'en',
    license: 'https://opensource.org/licenses/MIT',
    hasPart: {
      '@type': 'CollectionPage',
      name: 'Pantheon Registry — full figure index',
      url: `${BASE}registry/index.html`,
    },
  };
  const head = `<!-- pr-static -->
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}">
<link rel="sitemap" type="application/xml" href="${BASE}sitemap.xml">
${icons}<script type="application/ld+json">${JSON.stringify(siteLd).replace(/</g, '\\u003c')}</script>
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
  // tabindex="-1": the link is clipped out of view, so leaving it in the tab
  // order made the very first Tab press send focus somewhere invisible, ahead
  // of the skip link. Crawlers follow the href regardless of tabindex.
  const crawlNav = `<nav aria-label="Static registry" style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0">
  <a href="${BASE}registry/index.html" tabindex="-1">Browse all ${IDS.length.toLocaleString()} figures across ${trads} traditions as static, no-JavaScript pages</a>
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
  // Tradition hubs, between the master index and the figures.
  const { byTrad, trads, slugs } = groupByTradition();
  const tradDir = path.join(REG, TRAD_DIR);
  // Cleared, not merged: a tradition rename changes its slug, and the old file
  // would otherwise linger in the output as an orphan that no sitemap entry or
  // internal link points at. Every file here is rewritten from the corpus below.
  fs.rmSync(tradDir, { recursive: true, force: true });
  fs.mkdirSync(tradDir, { recursive: true });
  for (const t of trads) {
    fs.writeFileSync(path.join(tradDir, `${slugs.get(t)}.html`),
      traditionPage(t, byTrad.get(t), slugs, byTrad));
  }
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
  // Brand icons (assets/brand/README.md) + the PWA manifest. The generated
  // manifest from the icon tool shipped as "MyWebSite" with a white theme —
  // written here instead so it carries the real name and the paper ground.
  for (const f of ['favicon.ico', 'favicon-96x96.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
    const src = path.join(ROOT, 'assets', 'brand', f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(SITE, f));
  }
  fs.writeFileSync(path.join(SITE, 'site.webmanifest'), JSON.stringify({
    name: 'Pantheon Registry',
    short_name: 'Pantheon',
    description: `A source-cited index of ${IDS.length.toLocaleString()} mythological and historical figures.`,
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAF7',
    theme_color: '#FAFAF7',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2) + '\n');

  // Site-verification files (assets/verification/README.md). The deploy
  // rebuilds _site from scratch on every push, so a file uploaded to the site
  // root by hand — which is what Search Console's "HTML file" method asks for —
  // lasts only until the next deploy, and ownership verification then silently
  // turns off. Copying from the repo re-asserts it every time, like the CNAME.
  const verifyDir = path.join(ROOT, 'assets', 'verification');
  if (fs.existsSync(verifyDir)) {
    for (const f of fs.readdirSync(verifyDir)) {
      if (f === 'README.md') continue;
      fs.copyFileSync(path.join(verifyDir, f), path.join(SITE, f));
    }
  }

  const imgSrc = path.join(ROOT, 'assets', 'images');
  if (fs.existsSync(imgSrc)) {
    fs.cpSync(imgSrc, path.join(SITE, 'assets', 'images'), {
      recursive: true,
      filter: (s) => !s.split(path.sep).includes('_meta'),
    });
  }
  const tf = traditionFiles();
  enrichShell();
  console.log(`[static] wrote ${n} figure pages + index + ${trads.length} tradition hubs, sitemap (${n + trads.length + 2} urls), robots.txt, llms.txt + llms-full.txt, registry/figures.json, ${tf} per-tradition files; shell enriched`);
}

if (require.main === module) main();
module.exports = { figurePage, indexPage, traditionPage, groupByTradition, sitemap, llmsIndex, llmsFull, figuresJson, traditionFiles };
