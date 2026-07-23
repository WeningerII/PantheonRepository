#!/usr/bin/env node
/*
 * ingest-images.cjs — production image ingest from Wikimedia Commons.
 *
 * Pulls figure portraits under the owner's HARD RULE: Public Domain / PD-old /
 * PD-art / CC0 ONLY (docs/image-licensing.md). Runs where Wikimedia is
 * reachable — CI (.github/workflows/ingest-images.yml) or a local machine —
 * NOT in the network-restricted build sandbox. The running site only ever
 * reads the committed, license-verified output.
 *
 * Architecture (the consensus design — docs/image-pipeline.md): identification
 * joins on Wikimedia's own curated data instead of free-text search, and only
 * curated identification auto-ships. Tiers:
 *
 *   TIER A (auto-ships)   figure → Wikidata QID (confident) → P18 canonical
 *                         image → license gate → file sanity check → ship.
 *   TIER B (human review) everything less certain — ambiguous QIDs, failed
 *                         sanity, P180 "depicts" search hits, text-search
 *                         hits — lands on a contact sheet; only the owner's
 *                         click ships it.
 *
 * Modes (CI wires these to pushes, dispatch, and a monthly cron):
 *   map       resolve figures → QIDs into data-sources/qid-map.json
 *   harvest   Tier-A auto-ship from P18 for confidently-mapped figures
 *   fallback  build Tier-B candidates (P180 depicts, then text) → review file
 *   sheet     render data-sources/image-review.html from the review file
 *   approved  ingest the owner's exported approvals (gate re-runs)
 *   delta     prune → map → harvest → fallback → sheet, incremental, capped
 *   auto      the same tiered flow restricted to data-sources/image-request.json
 *   fetch     download every curated pin in data-sources/image-sources.json
 *   discover  legacy ad-hoc candidate proposer (kept for one-off digging)
 *   check     re-verify every shipped image is still PD/CC0 (license drift)
 *
 * Idempotency & cadence: every mode skips ids already resolved in committed
 * outputs (qid-map / manifest / scan-state), so re-running any mode only
 * advances. "No result" outcomes carry timestamps with TTLs (no-qid 90d,
 * no-image 365d) — the monthly delta cron therefore re-tries stale misses
 * automatically, which IS the quarterly map refresh and yearly re-scan.
 * data-sources/image-blocklist.json makes any mistake a one-line fix: blocked
 * titles are pruned from shipped output and excluded from every picker.
 * Self-hosting: files land in assets/images/figures/ with the extmetadata
 * archived per image (_meta/) for provenance. Never hotlinks.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { get, getJSON, sleep } = require('./lib/wiki-http.cjs');
const { classify } = require('./lib/commons-license.cjs');
const wd = require('./lib/wikidata.cjs');
const { sanityCheck } = require('./lib/sanity-check.cjs');
const { renderSheet } = require('./lib/contact-sheet.cjs');

const ROOT = path.resolve(__dirname, '..');
const DS = path.join(ROOT, 'data-sources');
const IMG_DIR = path.join(ROOT, 'assets', 'images', 'figures');
const SOURCES = path.join(DS, 'image-sources.json');      // id → "File:…" ledger of every shipped/pinned choice
const MANIFEST = path.join(DS, 'images.json');            // generated id → display record (ships to detail shards)
const CANDIDATES = path.join(DS, 'image-candidates.json');// legacy discover output
const REJECTS = path.join(DS, 'image-rejects.json');      // last run's failures, for the log
const REQUEST = path.join(DS, 'image-request.json');      // [id, …] for `auto`
const QIDMAP = path.join(DS, 'qid-map.json');             // id → {qid, confidence, …}
const BLOCKLIST = path.join(DS, 'image-blocklist.json');  // id → ["File:…"], plus optional "_global"
const SCANSTATE = path.join(DS, 'image-scan-state.json'); // id → {status, at} for no-result outcomes
const REVIEW = path.join(DS, 'image-review.json');        // Tier-B queue (generated)
const REVIEW_HTML = path.join(DS, 'image-review.html');   // the contact sheet (generated)
const APPROVED = path.join(DS, 'image-approved.json');    // owner's sheet export (consumed)

const API = 'https://commons.wikimedia.org/w/api.php';
const LEAD_WIDTH = 800;   // infobox @2x

// "No result" retry windows. The monthly cron re-runs delta; entries older
// than their TTL get re-tried, so growing Commons/Wikidata coverage is picked
// up without any extra scheduling machinery.
const NO_QID_TTL_DAYS = 90;
const NO_IMAGE_TTL_DAYS = 365;

// Per-run caps (delta): keep each CI run ~an hour and each bot commit
// reviewable. Successive runs advance via idempotent skips.
const DELTA_MAP_LIMIT = 3000;
const DELTA_HARVEST_LIMIT = 600;
const DELTA_FALLBACK_LIMIT = 800;

// Optional local WebP conversion; absent in the sandbox, present in CI.
let sharp = null;
try { sharp = require('sharp'); } catch (_) { /* Commons thumbnails ship as-is */ }

const readJSON = (f, dflt) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return dflt; } };
const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');
const sortObj = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
const now = () => new Date().toISOString();
const fresh = (entry, days) => !!(entry && entry.at && (Date.now() - Date.parse(entry.at)) < days * 864e5);

// ── blocklist ───────────────────────────────────────────────────────────────
const blockedFor = (bl, id) => new Set([...(bl[id] || []), ...(bl._global || [])]);
const isBlocked = (bl, id, title) => blockedFor(bl, id).has(title);

// Remove already-shipped images the owner has since blocklisted: file, _meta,
// manifest entry, and any matching pin. Blocklist beats a stale pin — both are
// owner intent, but the blocklist is the corrective one.
function pruneBlocked(manifest, sources, bl) {
  let pruned = 0;
  for (const id of Object.keys(manifest)) {
    const rec = manifest[id];
    if (!rec || !isBlocked(bl, id, rec.title)) continue;
    try { fs.unlinkSync(path.join(IMG_DIR, rec.file)); } catch (_) {}
    try { fs.unlinkSync(path.join(IMG_DIR, '_meta', `${id}.json`)); } catch (_) {}
    if (sources[id] === rec.title) delete sources[id];
    delete manifest[id];
    console.log(`  − pruned ${id} (${rec.title}) — blocklisted`);
    pruned++;
  }
  return pruned;
}

// ── Commons API ─────────────────────────────────────────────────────────────
const EXT_FIELDS = ['Artist', 'Credit', 'LicenseShortName', 'License', 'LicenseUrl', 'UsageTerms', 'AttributionRequired', 'Attribution', 'Copyrighted', 'Restrictions', 'ImageDescription', 'Categories'];

// One imageinfo query: sized-thumb URL + gated license metadata for a File: title.
async function imageInfo(fileTitle, width = LEAD_WIDTH) {
  const u = new URL(API);
  u.search = new URLSearchParams({
    action: 'query', titles: fileTitle, prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(width),
    iiextmetadatafilter: EXT_FIELDS.join('|'), iiextmetadatalanguage: 'en',
    format: 'json', formatversion: '2',
  }).toString();
  const data = await getJSON(u.toString());
  const page = data && data.query && data.query.pages && data.query.pages[0];
  if (!page || page.missing || !page.imageinfo || !page.imageinfo[0]) return null;
  return page.imageinfo[0]; // {url, thumburl, thumbwidth, thumbheight, width, height, mime, descriptionurl, extmetadata}
}

const extOf = (ct, url) => {
  if (/webp/.test(ct)) return 'webp'; if (/png/.test(ct)) return 'png';
  if (/jpe?g/.test(ct)) return 'jpg'; if (/gif/.test(ct)) return 'gif';
  const m = (url || '').match(/\.(jpe?g|png|webp|gif)(?:$|\?)/i); return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
};

// ── fetchOne: license-gate + download + optimize + record ONE File: ─────────
// The shared per-image core of every shipping path (harvest / approved / fetch
// / auto). The license gate runs HERE, at ingest time, no matter how the file
// was discovered — no discovery path is exempt. `meta` records the tier and
// verification signals into the provenance archive so a bad batch is
// mass-revertible by cause.
async function fetchOne(id, title, manifest, opts = {}, meta = {}) {
  const bl = opts.bl || {};
  if (isBlocked(bl, id, title)) return { status: 'reject', reason: 'blocklisted' };
  if (!opts.force && manifest[id] && fs.existsSync(path.join(IMG_DIR, manifest[id].file))) return { status: 'skip' };
  let info;
  try { info = await imageInfo(title); } catch (e) { return { status: 'reject', reason: 'api error: ' + e.message }; }
  if (!info) return { status: 'reject', reason: 'file missing on Commons' };

  const verdict = classify(info.extmetadata);
  if (!verdict.accept) return { status: 'reject', reason: verdict.reason, license: verdict.license };

  // Download the Commons-sized thumbnail (server-resized — no local resize needed).
  const src = info.thumburl || info.url;
  let dl;
  try { dl = await get(src, 'buffer'); } catch (e) { return { status: 'reject', reason: 'download failed: ' + e.message }; }
  let buf = dl.buf, ext = extOf(dl.contentType, src), w = info.thumbwidth || LEAD_WIDTH, h = info.thumbheight || null;

  // Optional WebP conversion (CI has sharp; the sandbox does not).
  if (sharp) {
    try { const out = await sharp(buf).webp({ quality: 82 }).toBuffer(); if (out.length < buf.length) { buf = out; ext = 'webp'; } } catch (_) { /* keep original */ }
  }

  const file = `${id}.${ext}`;
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMG_DIR, file), buf);
  // Archive the raw extmetadata + verification record for provenance.
  fs.mkdirSync(path.join(IMG_DIR, '_meta'), { recursive: true });
  writeJSON(path.join(IMG_DIR, '_meta', `${id}.json`), {
    title, fetchedFrom: src, extmetadata: info.extmetadata,
    verification: { tier: meta.tier || null, method: meta.method || null, qid: meta.qid || null, signals: meta.signals || [], at: now() },
  });

  manifest[id] = {
    file, w, h,
    license: { key: verdict.license.key, name: verdict.license.shortName || 'Public domain', url: verdict.license.url || null },
    author: verdict.author || null,
    authorUrl: verdict.authorUrl || null,
    source: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
    title,
    bytes: buf.length,
    ...(meta.tier ? { tier: meta.tier } : {}),
    ...(meta.qid ? { qid: meta.qid } : {}),
  };
  return { status: 'ok', file, w, h, bytes: buf.length, license: verdict.license.shortName || verdict.license.key };
}

// ── Commons searches ────────────────────────────────────────────────────────
// Shared: run one search, return the PD/CC0-passing hits in relevance order.
async function gatedSearch(gsrsearch, limit) {
  const u = new URL(API);
  u.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch, gsrnamespace: '6', gsrlimit: String(limit),
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '320',
    iiextmetadatafilter: EXT_FIELDS.join('|'), iiextmetadatalanguage: 'en',
    format: 'json', formatversion: '2',
  }).toString();
  const data = await getJSON(u.toString());
  const hits = ((data.query && data.query.pages) || []).slice().sort((a, b) => (a.index || 0) - (b.index || 0));
  const ok = [];
  for (const page of hits) {
    const info = page.imageinfo && page.imageinfo[0];
    if (!info) continue;
    const v = classify(info.extmetadata);
    if (v.accept) ok.push({ title: page.title, thumb: info.thumburl, w: info.width, h: info.height, mime: info.mime, license: v.license.shortName || v.license.key, author: v.author });
  }
  return ok;
}
const searchCandidates = (query, limit = 30) => gatedSearch(query, limit);
// Structured "depicts this entity" search — files editors tagged P180=<qid>.
const searchDepicts = (qid, limit = 15) => gatedSearch(`haswbstatement:P180=${qid}`, limit);

// Rank a hit by how likely it DEPICTS the figure (vs. scenery/context) — the
// Zeus lesson. Used to order Tier-B candidates for the reviewer.
const DEPICTION = /\b(bust|head|statue|statuette|portrait|painting|figure|relief|marble|bronze|terracotta|fresco|mosaic|vase|amphora|krater|kylix|coin|cameo|gem|icon|enthroned|seated)\b/i;
const NOT_DEPICTION = /\b(temple|ruin|ruins|site|sanctuary|archaeolog|excavat|\bmap\b|\bplan\b|panorama|landscape|\bview\b|vista|mount|hill|acropolis|street|interior|gallery|location|inscription|milestone|signpost)\b/i;
function scoreCandidate(c, name) {
  const t = c.title || '';
  let s = 0;
  if (name) {
    const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(t)) s += 3;
  }
  if (DEPICTION.test(t)) s += 2;
  if (NOT_DEPICTION.test(t)) s -= 4;
  const w = c.w || 0, h = c.h || 0;
  if (w && h) { const r = h / w; if (r >= 0.95) s += 2; else if (r >= 0.75) s += 1; else if (r < 0.6) s -= 2; }
  return s;
}

// ── shared per-id steps ─────────────────────────────────────────────────────

// Resolve one figure to a QID (network). Updates qmap/scan in place. Network
// errors deliberately record NOTHING — only a real "no candidates" result may
// write a no-qid state, or a transient outage would suppress retries for 90d.
async function mapOne(fig, ctx) {
  const { qmap, scan, collisions } = ctx;
  let cands;
  try { cands = await wd.searchEntities((fig.name && fig.name.primary) || fig.id, 7); }
  catch (e) { console.warn(`  ! map ${fig.id}: ${e.message}`); return 'error'; }
  const pick = wd.pickQid(fig, cands, collisions.has(wd.normName((fig.name && fig.name.primary) || fig.id)));
  if (!pick) {
    scan[fig.id] = { status: 'no-qid', at: now() };
    return 'no-qid';
  }
  qmap[fig.id] = { qid: pick.qid, label: pick.label, description: pick.description, confidence: pick.confidence, reason: pick.reason, at: now() };
  delete scan[fig.id];
  return pick.confidence;
}

// Build one figure's Tier-B review entry (network): P180 depicts when a QID
// exists, else ranked text search. Returns 'queued' | 'no-image' | 'error'.
async function reviewOne(fig, qid, ctx) {
  const { review, scan, bl } = ctx;
  const name = (fig.name && fig.name.primary) || fig.id;
  let cands = [], via = 'text';
  try {
    if (qid) { cands = await searchDepicts(qid, 15); if (cands.length) via = 'p180'; }
    if (!cands.length) cands = await searchCandidates(`${name} ${fig.tradition || ''}`.trim(), 30);
  } catch (e) { console.warn(`  ! fallback ${fig.id}: ${e.message}`); return 'error'; }
  cands = cands.filter((c) => !isBlocked(bl, fig.id, c.title));
  cands.forEach((c) => { c.score = scoreCandidate(c, name); });
  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, 3);
  if (!top.length) {
    scan[fig.id] = { status: 'no-image', at: now() };
    return 'no-image';
  }
  review[fig.id] = {
    name, tradition: fig.tradition || '', qid: qid || null,
    via,
    options: top.map((c) => ({ title: c.title, thumb: c.thumb, license: c.license, author: c.author, score: c.score, w: c.w, h: c.h })),
    at: now(),
  };
  return 'queued';
}

// Figures needing an image: no shipped manifest entry and not owner-settled.
const needsImage = (id, manifest, scan) => {
  if (manifest[id]) return false;
  const s = scan[id];
  if (s && s.status === 'reviewed-none') return false; // owner said: none acceptable
  return true;
};

// ── modes ───────────────────────────────────────────────────────────────────

// map: figure → QID for everything unmapped (or stale-missed / --refresh).
async function cmdMap(opts) {
  const figures = loadFigures();
  const qmap = readJSON(QIDMAP, {});
  const scan = readJSON(SCANSTATE, {});
  const collisions = wd.corpusCollisions(figures);
  let pool = figures.filter((f) => {
    if (opts.id && f.id !== opts.id) return false;
    if (qmap[f.id] && qmap[f.id].confidence !== 'rejected' && !opts.refresh) return false;
    const s = scan[f.id];
    if (s && s.status === 'no-qid' && fresh(s, NO_QID_TTL_DAYS) && !opts.refresh) return false;
    return true;
  });
  if (opts.limit) pool = pool.slice(0, opts.limit);
  console.log(`map: ${pool.length} figures to resolve (${collisions.size} collision names in corpus)`);
  const tally = { high: 0, ambiguous: 0, 'no-qid': 0, error: 0 };
  for (const fig of pool) {
    const r = await mapOne(fig, { qmap, scan, collisions });
    tally[r] = (tally[r] || 0) + 1;
    await sleep(450);
  }
  writeJSON(QIDMAP, sortObj(qmap));
  writeJSON(SCANSTATE, sortObj(scan));
  console.log(`map: ${tally.high || 0} confident, ${tally.ambiguous || 0} ambiguous, ${tally['no-qid'] || 0} unmatched, ${tally.error || 0} errors. qid-map: ${Object.keys(qmap).length}.`);
}

// harvest: Tier-A auto-ship from P18 for confidently-mapped, imageless figures.
async function cmdHarvest(opts) {
  const qmap = readJSON(QIDMAP, {});
  const scan = readJSON(SCANSTATE, {});
  const manifest = readJSON(MANIFEST, {});
  const sources = readJSON(SOURCES, {});
  const bl = readJSON(BLOCKLIST, {});
  pruneBlocked(manifest, sources, bl);

  let ids = Object.keys(qmap).filter((id) =>
    qmap[id].confidence === 'high' && needsImage(id, manifest, scan)
    && !(scan[id] && scan[id].status === 'no-p18' && fresh(scan[id], NO_IMAGE_TTL_DAYS)));
  if (opts.id) ids = ids.filter((id) => id === opts.id);
  if (opts.limit) ids = ids.slice(0, opts.limit);
  if (!ids.length) { writeJSON(MANIFEST, sortObj(manifest)); writeJSON(SOURCES, sortObj(sources)); console.log('harvest: nothing pending.'); return; }
  console.log(`harvest: ${ids.length} confident figures to try via P18`);

  let entities;
  try { entities = await wd.getEntities(ids.map((id) => qmap[id].qid)); }
  catch (e) { console.error(`harvest: wbgetentities failed: ${e.message}`); return; }

  let shipped = 0, demoted = 0, noP18 = 0, toReview = 0;
  for (const id of ids) {
    const ent = entities[qmap[id].qid];
    // A mapping whose entity vanished (merge/redirect/deletion) or whose class
    // says "wrong kind of thing" is demoted — map --refresh re-resolves it.
    const classes = wd.p31Of(ent);
    if (!ent || ent.missing) { qmap[id] = { ...qmap[id], confidence: 'rejected', reason: 'entity missing/redirected', at: now() }; demoted++; continue; }
    if (classes.some((c) => wd.NEGATIVE_P31.has(c))) { qmap[id] = { ...qmap[id], confidence: 'rejected', reason: 'negative P31 class', at: now() }; demoted++; continue; }
    const p18 = wd.p18Of(ent);
    if (!p18) { scan[id] = { status: 'no-p18', at: now() }; noP18++; continue; }
    const title = 'File:' + p18;
    if (isBlocked(bl, id, title)) { scan[id] = { status: 'no-p18', at: now() }; noP18++; continue; }

    let info;
    try { info = await imageInfo(title); } catch (e) { console.warn(`  ! ${id}: ${e.message}`); continue; }
    if (!info) { scan[id] = { status: 'no-p18', at: now() }; noP18++; continue; }
    const gate = classify(info.extmetadata);
    if (!gate.accept) { scan[id] = { status: 'no-p18', at: now(), note: 'p18 not PD/CC0' }; noP18++; await sleep(300); continue; }
    const sane = sanityCheck({ title, mime: info.mime, width: info.width, height: info.height });
    if (!sane.pass) {
      // Curated but not portrait-shaped (glyph/scenery/panorama) → Tier B.
      console.warn(`  ○ ${id}: P18 failed sanity (${sane.reasons.join('; ')}) — queued for review`);
      scan[id] = { status: 'no-p18', at: now(), note: 'sanity: ' + sane.reasons.join('; ') };
      toReview++; await sleep(300); continue;
    }
    const r = await fetchOne(id, title, manifest, { bl }, { tier: 'A', method: 'p18', qid: qmap[id].qid, signals: sane.signals });
    if (r.status === 'ok') {
      sources[id] = title;
      delete scan[id];
      console.log(`  ✓ ${id}  ${title}  ${r.file}  ${(r.bytes / 1024).toFixed(0)}KB  [${r.license}]`);
      shipped++;
    } else {
      console.warn(`  ✗ ${id} <- ${title}: ${r.reason || r.status}`);
      scan[id] = { status: 'no-p18', at: now(), note: r.reason };
      noP18++;
    }
    await sleep(400);
  }
  writeJSON(QIDMAP, sortObj(qmap));
  writeJSON(SCANSTATE, sortObj(scan));
  writeJSON(MANIFEST, sortObj(manifest));
  writeJSON(SOURCES, sortObj(sources));
  console.log(`harvest: ${shipped} shipped (Tier A), ${noP18} without usable P18 (fallback will queue them), ${toReview} sanity-flagged, ${demoted} mappings demoted. manifest: ${Object.keys(manifest).length}.`);
}

// fallback: build the Tier-B review queue for everything imageless that
// harvest couldn't ship. Nothing here auto-ships.
async function cmdFallback(opts) {
  const figures = loadFigures();
  const byId = Object.fromEntries(figures.map((f) => [f.id, f]));
  const qmap = readJSON(QIDMAP, {});
  const scan = readJSON(SCANSTATE, {});
  const manifest = readJSON(MANIFEST, {});
  const bl = readJSON(BLOCKLIST, {});
  const review = readJSON(REVIEW, {});

  let ids = figures.map((f) => f.id).filter((id) => {
    if (opts.id && id !== opts.id) return false;
    if (!needsImage(id, manifest, scan)) return false;
    if (review[id]) return false; // already queued
    const s = scan[id];
    if (s && s.status === 'no-image' && fresh(s, NO_IMAGE_TTL_DAYS) && !opts.rescan) return false;
    const m = qmap[id];
    // Confident mappings wait for harvest first; they arrive here only after a
    // no-p18 outcome. Ambiguous/rejected/unmapped come straight in.
    if (m && m.confidence === 'high' && !(s && s.status === 'no-p18')) return false;
    return true;
  });
  if (opts.limit) ids = ids.slice(0, opts.limit);
  if (!ids.length) { console.log('fallback: nothing pending.'); return; }
  console.log(`fallback: ${ids.length} figures to queue for review`);

  const tally = { queued: 0, 'no-image': 0, error: 0 };
  for (const id of ids) {
    const r = await reviewOne(byId[id], qmap[id] && qmap[id].confidence !== 'rejected' ? qmap[id].qid : null, { review, scan, bl });
    tally[r] = (tally[r] || 0) + 1;
    await sleep(450);
  }
  writeJSON(REVIEW, sortObj(review));
  writeJSON(SCANSTATE, sortObj(scan));
  console.log(`fallback: ${tally.queued} queued for review, ${tally['no-image']} with no PD/CC0 candidates, ${tally.error} errors. review queue: ${Object.keys(review).length}.`);
  cmdSheet();
}

// sheet: render the contact sheet from the review queue.
function cmdSheet() {
  const review = readJSON(REVIEW, {});
  fs.writeFileSync(REVIEW_HTML, renderSheet(review));
  console.log(`sheet: ${Object.keys(review).length} figures → ${path.relative(ROOT, REVIEW_HTML)}`);
}

// approved: ingest the owner's sheet export. A title ships (gate re-runs, pick
// becomes a pin); null records "reviewed, none acceptable". Consumed entries
// clear from the approvals file and the review queue.
async function cmdApproved(opts) {
  const approved = readJSON(APPROVED, {});
  const ids = Object.keys(approved);
  if (!ids.length) { console.log('approved: no data-sources/image-approved.json entries — nothing to ingest.'); return; }
  const manifest = readJSON(MANIFEST, {});
  const sources = readJSON(SOURCES, {});
  const review = readJSON(REVIEW, {});
  const scan = readJSON(SCANSTATE, {});
  const bl = readJSON(BLOCKLIST, {});
  pruneBlocked(manifest, sources, bl);
  let shipped = 0, none = 0, failed = 0;
  for (const id of ids) {
    const title = approved[id];
    if (title === null) {
      scan[id] = { status: 'reviewed-none', at: now() };
      delete review[id]; delete approved[id];
      none++; continue;
    }
    const qid = (review[id] && review[id].qid) || null;
    const r = await fetchOne(id, title, manifest, { bl, force: opts.force }, { tier: 'B', method: 'owner-approved', qid });
    if (r.status === 'ok' || r.status === 'skip') {
      if (r.status === 'ok') console.log(`  ✓ ${id}  ${title}  [${r.license}]`);
      sources[id] = title;
      delete review[id]; delete scan[id]; delete approved[id];
      shipped++;
    } else {
      console.warn(`  ✗ ${id} <- ${title}: ${r.reason || r.status}`);
      failed++;
    }
    await sleep(400);
  }
  writeJSON(APPROVED, sortObj(approved));
  writeJSON(REVIEW, sortObj(review));
  writeJSON(SCANSTATE, sortObj(scan));
  writeJSON(MANIFEST, sortObj(manifest));
  writeJSON(SOURCES, sortObj(sources));
  cmdSheet();
  console.log(`approved: ${shipped} shipped, ${none} marked none-acceptable, ${failed} failed (left in the approvals file).`);
}

// delta: the incremental everything-pass the monthly cron (and any push of
// image-run.json) drives. Caps keep each run ~an hour and each commit small.
async function cmdDelta(opts) {
  const manifest = readJSON(MANIFEST, {});
  const sources = readJSON(SOURCES, {});
  const bl = readJSON(BLOCKLIST, {});
  if (pruneBlocked(manifest, sources, bl)) { writeJSON(MANIFEST, sortObj(manifest)); writeJSON(SOURCES, sortObj(sources)); }
  await cmdMap({ ...opts, limit: opts.limit || DELTA_MAP_LIMIT });
  await cmdHarvest({ ...opts, limit: opts.limit || DELTA_HARVEST_LIMIT });
  await cmdFallback({ ...opts, limit: opts.limit || DELTA_FALLBACK_LIMIT });
}

// auto: the tiered flow for explicitly requested ids (image-request.json or
// --id). Consensus rule: only curated identification auto-ships — a request
// without a usable P18 queues candidates for review instead of guessing.
async function cmdAuto(opts) {
  let ids = opts.id ? [opts.id] : readJSON(REQUEST, null);
  if (!Array.isArray(ids) || !ids.length) { console.log('no data-sources/image-request.json ids (and no --id) — nothing to do.'); return; }
  const figures = loadFigures();
  const byId = Object.fromEntries(figures.map((f) => [f.id, f]));
  const collisions = wd.corpusCollisions(figures);
  const qmap = readJSON(QIDMAP, {});
  const scan = readJSON(SCANSTATE, {});
  const manifest = readJSON(MANIFEST, {});
  const bl = readJSON(BLOCKLIST, {});
  const unknown = ids.filter((id) => !byId[id]);
  for (const id of unknown) console.warn(`  ! ${id}: not a known figure id`);
  ids = ids.filter((id) => byId[id] && needsImage(id, manifest, scan));
  if (!ids.length) { console.log('auto: every requested figure already has an image (or is owner-settled).'); return; }

  // Map any requested id lacking a usable mapping (force — requests bypass TTLs).
  for (const id of ids) {
    if (!qmap[id] || qmap[id].confidence === 'rejected') {
      await mapOne(byId[id], { qmap, scan, collisions });
      await sleep(450);
    }
  }
  writeJSON(QIDMAP, sortObj(qmap));
  writeJSON(SCANSTATE, sortObj(scan));

  // Tier A attempt for the confident ones…
  for (const id of ids) if (qmap[id] && qmap[id].confidence === 'high') await cmdHarvest({ id });
  // …then queue whatever is still imageless for review.
  const manifest2 = readJSON(MANIFEST, {});
  const scan2 = readJSON(SCANSTATE, {});
  const pending = ids.filter((id) => needsImage(id, manifest2, scan2));
  for (const id of pending) await cmdFallback({ id, rescan: true });
  const finalManifest = readJSON(MANIFEST, {});
  const shippedNow = ids.filter((id) => finalManifest[id]);
  console.log(`auto: ${shippedNow.length}/${ids.length} shipped via Tier A; the rest are on the review sheet (${path.relative(ROOT, REVIEW_HTML)}).`);
}

// fetch: download every curated pin in image-sources.json (gate re-runs).
async function cmdFetch(opts) {
  const sources = readJSON(SOURCES, {});
  const manifest = readJSON(MANIFEST, {});
  const bl = readJSON(BLOCKLIST, {});
  pruneBlocked(manifest, sources, bl);
  const ids = Object.keys(sources);
  if (!ids.length) { console.log('no data-sources/image-sources.json entries — nothing to fetch.'); return; }
  const rejects = {};
  let fetched = 0, skipped = 0, rejected = 0;
  for (const id of ids) {
    const title = sources[id];
    const r = await fetchOne(id, title, manifest, { ...opts, bl }, { tier: 'B', method: 'pinned' });
    if (r.status === 'skip') { skipped++; continue; }
    if (r.status === 'reject') {
      console.warn(`  ✗ ${id} <- ${title}: REJECT (${r.reason})`);
      rejects[id] = { title, reason: r.reason, ...(r.license ? { license: r.license } : {}) };
      rejected++; await sleep(300); continue;
    }
    console.log(`  ✓ ${id}  ${r.file}  ${r.w}×${r.h || '?'}  ${(r.bytes / 1024).toFixed(0)}KB  [${r.license}]`);
    fetched++;
    await sleep(400);
  }
  // Drop manifest entries whose source mapping was removed.
  for (const id of Object.keys(manifest)) if (!sources[id]) delete manifest[id];
  writeJSON(MANIFEST, sortObj(manifest));
  writeJSON(SOURCES, sortObj(sources));
  if (Object.keys(rejects).length) writeJSON(REJECTS, rejects);
  console.log(`\nfetch: ${fetched} fetched, ${skipped} up-to-date, ${rejected} rejected. manifest: ${Object.keys(manifest).length} images.`);
}

// discover: legacy ad-hoc candidate proposer (kept for one-off digging).
async function cmdDiscover(opts) {
  const corpus = loadFigures();
  const have = new Set(Object.keys(readJSON(SOURCES, {})).concat(Object.keys(readJSON(MANIFEST, {}))));
  let pool = corpus.filter((p) => !have.has(p.id));
  if (opts.id) pool = pool.filter((p) => p.id === opts.id);
  if (opts.trad) pool = pool.filter((p) => (p.tradition || '').toLowerCase() === opts.trad.toLowerCase());
  pool.sort((a, b) => (a.type === 'deity' ? 0 : 1) - (b.type === 'deity' ? 0 : 1));
  if (opts.limit) pool = pool.slice(0, opts.limit);

  const candidates = readJSON(CANDIDATES, {});
  let proposed = 0;
  for (const p of pool) {
    const q = `${(p.name && p.name.primary) || p.id} ${p.tradition || ''}`.trim();
    let ok;
    try { ok = await searchCandidates(q, 8); } catch (e) { console.warn(`  ! discover ${p.id}: ${e.message}`); await sleep(400); continue; }
    if (ok.length) {
      candidates[p.id] = { name: q, options: ok.map((c) => ({ title: c.title, thumb: c.thumb, license: c.license, author: c.author })) };
      proposed++; console.log(`  ○ ${p.id}: ${ok.length} PD/CC0 candidate(s)`);
    }
    await sleep(500);
  }
  writeJSON(CANDIDATES, candidates);
  console.log(`\ndiscover: ${proposed} figures with PD/CC0 candidates → ${path.relative(ROOT, CANDIDATES)}.`);
}

// check: re-verify licenses of already-ingested files (drift audit).
async function cmdCheck() {
  const manifest = readJSON(MANIFEST, {});
  const sources = readJSON(SOURCES, {});
  const bl = readJSON(BLOCKLIST, {});
  if (pruneBlocked(manifest, sources, bl)) { writeJSON(MANIFEST, sortObj(manifest)); writeJSON(SOURCES, sortObj(sources)); }
  const ids = Object.keys(manifest);
  let ok = 0; const drift = {};
  for (const id of ids) {
    const title = manifest[id].title;
    try {
      const info = await imageInfo(title, 120);
      if (!info) { drift[id] = 'file now missing on Commons'; }
      else { const v = classify(info.extmetadata); if (!v.accept) drift[id] = 'license no longer PD/CC0: ' + v.reason; else ok++; }
    } catch (e) { drift[id] = 'api error: ' + e.message; }
    await sleep(300);
  }
  console.log(`check: ${ok}/${ids.length} still PD/CC0.`);
  if (Object.keys(drift).length) { console.log('DRIFT (pull these):'); for (const [id, r] of Object.entries(drift)) console.log(`  ✗ ${id}: ${r}`); process.exitCode = 1; }
}

// ── figure corpus via the shared vm loader ──────────────────────────────────
function loadFigures() {
  const { loadCorpus } = require('./build-tiers.cjs');
  const PR = loadCorpus({ quiet: true });
  return Object.values(PR.seedPeople);
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
    else if (a === '--refresh') o.refresh = true;
    else if (a === '--rescan') o.rescan = true;
    else if (a === '--limit') o.limit = parseInt(argv[++i], 10);
    else if (a === '--trad') o.trad = argv[++i];
    else if (a === '--id') o.id = argv[++i];
    else o._.push(a);
  }
  return o;
}
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cmd = opts._[0];
  if (!sharp && ['fetch', 'auto', 'harvest', 'approved', 'delta'].includes(cmd)) {
    console.log('(note: `sharp` not installed — saving Commons thumbnails as-is; CI installs sharp for WebP.)');
  }
  if (cmd === 'map') return cmdMap(opts);
  if (cmd === 'harvest') return cmdHarvest(opts);
  if (cmd === 'fallback') return cmdFallback(opts);
  if (cmd === 'sheet') return cmdSheet();
  if (cmd === 'approved') return cmdApproved(opts);
  if (cmd === 'delta') return cmdDelta(opts);
  if (cmd === 'auto') return cmdAuto(opts);
  if (cmd === 'fetch') return cmdFetch(opts);
  if (cmd === 'discover') return cmdDiscover(opts);
  if (cmd === 'check') return cmdCheck();
  console.log('usage: node scripts/ingest-images.cjs <map|harvest|fallback|sheet|approved|delta|auto|fetch|discover|check> [--id ID] [--limit N] [--trad T] [--force] [--refresh] [--rescan]');
  process.exitCode = 2;
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { imageInfo, extOf, scoreCandidate, fetchOne };
