#!/usr/bin/env node
/*
 * ingest-images.cjs — production image ingest from Wikimedia Commons.
 *
 * Pulls figure portraits from Commons under the owner's HARD RULE: Public
 * Domain / PD-old / PD-art / CC0 ONLY (docs/image-licensing.md). Runs where
 * Commons is reachable — CI (.github/workflows/ingest-images.yml) or a local
 * machine — NOT in the app and NOT in the network-restricted build sandbox.
 * The running site only ever reads the committed, optimized results.
 *
 * Two-step, human-in-the-loop by design (never auto-slap a wrong portrait on
 * a god, but machine-verify every license):
 *
 *   node scripts/ingest-images.cjs discover [--limit N] [--trad T]
 *       For figures lacking an image, search Commons, license-gate the hits,
 *       and write PD/CC0 CANDIDATES to data-sources/image-candidates.json for
 *       human review. Fetches nothing.
 *
 *   node scripts/ingest-images.cjs fetch [--force]
 *       For every {figureId: "File:…"} in data-sources/image-sources.json
 *       (the approved mapping), re-verify the license, download a Commons
 *       server-sized thumbnail, optionally convert to WebP (if `sharp` is
 *       installed — CI does), write it under assets/images/figures/, and
 *       record the license/attribution in data-sources/images.json.
 *
 *   node scripts/ingest-images.cjs check
 *       Re-verify every already-ingested file's license is still PD/CC0
 *       (licenses on Commons can change / files get deleted). Flags drift.
 *
 * Self-hosting: writes committed files under assets/images/figures/. Never
 * hotlinks. The full extmetadata block is archived per image for provenance.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { classify, field } = require('./lib/commons-license.cjs');

const ROOT = path.resolve(__dirname, '..');
const DS = path.join(ROOT, 'data-sources');
const IMG_DIR = path.join(ROOT, 'assets', 'images', 'figures');
const SOURCES = path.join(DS, 'image-sources.json');     // curated {id: "File:…"}
const MANIFEST = path.join(DS, 'images.json');           // generated {id: {...}}
const CANDIDATES = path.join(DS, 'image-candidates.json');
const REJECTS = path.join(DS, 'image-rejects.json');
const REQUEST = path.join(DS, 'image-request.json');     // [id, …] for `auto`
const API = 'https://commons.wikimedia.org/w/api.php';
const LEAD_WIDTH = 800;   // infobox @2x; the app also asks for a 400 @1x via srcset
const UA = 'ListOfGods-ImageIngest/1.0 (https://listofgods.com; weningerii@gmail.com) node-https';

// Optional local WebP conversion; absent in the sandbox, present in CI.
let sharp = null;
try { sharp = require('sharp'); } catch (_) { /* Commons thumbnails ship as-is */ }

const readJSON = (f, dflt) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return dflt; } };
const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── HTTP with the mandatory descriptive User-Agent + 429 backoff ────────────
function getJSON(url) { return get(url, 'json'); }
function get(url, as, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA, 'Accept-Encoding': 'identity' } }, (res) => {
      const { statusCode, headers } = res;
      if (statusCode === 429) {
        const wait = (parseInt(headers['retry-after'], 10) || 5) * 1000;
        res.resume();
        return sleep(wait).then(() => get(url, as, redirects).then(resolve, reject));
      }
      if (statusCode >= 300 && statusCode < 400 && headers.location && redirects < 5) {
        res.resume();
        const next = new URL(headers.location, url).toString();
        return get(next, as, redirects + 1).then(resolve, reject);
      }
      if (statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${statusCode} for ${url}`)); }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (as === 'buffer') return resolve({ buf, contentType: headers['content-type'] || '' });
        try { resolve(JSON.parse(buf.toString('utf8'))); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout ' + url)));
  });
}

const EXT_FIELDS = ['Artist', 'Credit', 'LicenseShortName', 'License', 'LicenseUrl', 'UsageTerms', 'AttributionRequired', 'Attribution', 'Copyrighted', 'Restrictions', 'ImageDescription'];

// One imageinfo query: sized-thumb URL + gated license metadata for a File: title.
async function imageInfo(fileTitle, width = LEAD_WIDTH) {
  const u = new URL(API);
  u.search = new URLSearchParams({
    action: 'query', titles: fileTitle, prop: 'imageinfo',
    iiprop: 'url|size|extmetadata', iiurlwidth: String(width),
    iiextmetadatafilter: EXT_FIELDS.join('|'), iiextmetadatalanguage: 'en',
    format: 'json', formatversion: '2',
  }).toString();
  const data = await getJSON(u.toString());
  const page = data && data.query && data.query.pages && data.query.pages[0];
  if (!page || page.missing || !page.imageinfo || !page.imageinfo[0]) return null;
  return page.imageinfo[0]; // {url, thumburl, thumbwidth, thumbheight, descriptionurl, extmetadata}
}

const slugFile = (title) => title.replace(/^File:/i, '').trim();
const extOf = (ct, url) => {
  if (/webp/.test(ct)) return 'webp'; if (/png/.test(ct)) return 'png';
  if (/jpe?g/.test(ct)) return 'jpg'; if (/gif/.test(ct)) return 'gif';
  const m = (url || '').match(/\.(jpe?g|png|webp|gif)(?:$|\?)/i); return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
};

// ── fetchOne: download + license-gate + optimize + record ONE approved File: ──
// The shared per-image core used by both `fetch` (curated titles) and `auto`
// (search-picked titles). Every path re-verifies the license here, so no image
// is ever written without passing the PD/CC0 gate. Returns a small status.
async function fetchOne(id, title, manifest, opts = {}) {
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
  // Archive the raw extmetadata for provenance (license state at ingest).
  fs.mkdirSync(path.join(IMG_DIR, '_meta'), { recursive: true });
  writeJSON(path.join(IMG_DIR, '_meta', `${id}.json`), { title, fetchedFrom: src, extmetadata: info.extmetadata });

  manifest[id] = {
    file, w, h,
    license: { key: verdict.license.key, name: verdict.license.shortName || 'Public domain', url: verdict.license.url || null },
    author: verdict.author || null,
    authorUrl: verdict.authorUrl || null,
    source: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
    title,
    bytes: buf.length,
  };
  return { status: 'ok', file, w, h, bytes: buf.length, license: verdict.license.shortName || verdict.license.key };
}

// One Commons search → the PD/CC0-passing hits, in the API's relevance order.
// Shared by `discover` (review) and `auto` (pick). File namespace (6) only.
async function searchCandidates(query, limit = 15) {
  const u = new URL(API);
  u.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: '6', gsrlimit: String(limit),
    prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '320',
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
    if (v.accept) ok.push({ title: page.title, thumb: info.thumburl, w: info.width, h: info.height, license: v.license.shortName || v.license.key, author: v.author });
  }
  return ok;
}

// ── fetch: download + optimize the curated {id: File:} mapping ───────────────
async function cmdFetch(opts) {
  const sources = readJSON(SOURCES, {});
  const ids = Object.keys(sources);
  if (!ids.length) { console.log('no data-sources/image-sources.json entries — nothing to fetch.'); return; }
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const manifest = readJSON(MANIFEST, {});
  const rejects = {};
  let fetched = 0, skipped = 0, rejected = 0;

  for (const id of ids) {
    const title = sources[id];
    const r = await fetchOne(id, title, manifest, opts);
    if (r.status === 'skip') { skipped++; continue; }
    if (r.status === 'reject') {
      console.warn(`  ✗ ${id} <- ${title}: REJECT (${r.reason})`);
      rejects[id] = { title, reason: r.reason, ...(r.license ? { license: r.license } : {}) };
      rejected++; await sleep(300); continue;
    }
    console.log(`  ✓ ${id}  ${r.file}  ${r.w}×${r.h || '?'}  ${(r.bytes / 1024).toFixed(0)}KB  [${r.license}]`);
    fetched++;
    await sleep(400); // courteous pacing
  }

  // Drop manifest entries whose source mapping was removed.
  for (const id of Object.keys(manifest)) if (!sources[id]) delete manifest[id];
  writeJSON(MANIFEST, sortObj(manifest));
  if (Object.keys(rejects).length) writeJSON(REJECTS, rejects);
  console.log(`\nfetch: ${fetched} fetched, ${skipped} up-to-date, ${rejected} rejected. manifest: ${Object.keys(manifest).length} images.`);
  if (rejected) console.log(`  rejects logged to ${path.relative(ROOT, REJECTS)}`);
}

// ── auto: search + take the top PD/CC0 hit + fetch, for each requested id ─────
// The one-shot path (no discover→review→fetch round-trip): reads figure ids from
// data-sources/image-request.json (or --id), searches Commons, and fetches the
// FIRST license-verified PD/CC0 result that downloads clean, recording the chosen
// File: back into image-sources.json. Convenience over curation — a human can
// swap the title in image-sources.json and re-run fetch to override the pick.
async function cmdAuto(opts) {
  let ids = opts.id ? [opts.id] : readJSON(REQUEST, null);
  if (!Array.isArray(ids) || !ids.length) { console.log('no data-sources/image-request.json ids (and no --id) — nothing to auto-ingest.'); return; }
  const byId = Object.fromEntries(loadFigures().map((p) => [p.id, p]));
  const sources = readJSON(SOURCES, {});
  const manifest = readJSON(MANIFEST, {});
  const rejects = {};
  let done = 0, skipped = 0, failed = 0;

  for (const id of ids) {
    if (manifest[id] && !opts.force) { console.log(`  = ${id}: already has an image, skipping`); skipped++; continue; }
    const p = byId[id];
    if (!p) { console.warn(`  ! ${id}: not a known figure id`); rejects[id] = { reason: 'unknown figure id' }; failed++; continue; }
    const q = `${(p.name && p.name.primary) || id} ${p.tradition || ''}`.trim();
    let cands;
    try { cands = await searchCandidates(q, 15); } catch (e) { console.warn(`  ! ${id}: search failed ${e.message}`); rejects[id] = { reason: 'search error: ' + e.message, query: q }; failed++; await sleep(400); continue; }
    if (!cands.length) { console.warn(`  ✗ ${id}: no PD/CC0 candidate for "${q}"`); rejects[id] = { reason: 'no PD/CC0 candidate', query: q }; failed++; await sleep(400); continue; }

    // Walk candidates in relevance order until one downloads clean.
    let placed = false;
    for (const c of cands) {
      const r = await fetchOne(id, c.title, manifest, opts);
      if (r.status === 'ok') {
        sources[id] = c.title;
        console.log(`  ✓ ${id}  ${c.title}  ${r.file}  ${r.w}×${r.h || '?'}  ${(r.bytes / 1024).toFixed(0)}KB  [${r.license}]`);
        placed = true; done++; break;
      }
      console.warn(`    · ${id} <- ${c.title}: ${r.status}${r.reason ? ' (' + r.reason + ')' : ''}`);
      await sleep(300);
    }
    if (!placed) { rejects[id] = { reason: 'all PD/CC0 candidates failed to fetch', query: q }; failed++; }
    await sleep(400);
  }

  writeJSON(SOURCES, sortObj(sources));
  writeJSON(MANIFEST, sortObj(manifest));
  if (Object.keys(rejects).length) writeJSON(REJECTS, rejects);
  console.log(`\nauto: ${done} ingested, ${skipped} already had images, ${failed} failed. manifest: ${Object.keys(manifest).length} images.`);
  if (failed) console.log(`  failures logged to ${path.relative(ROOT, REJECTS)}`);
}

// ── discover: propose PD/CC0 candidates for human review (fetches nothing) ───
async function cmdDiscover(opts) {
  const corpus = loadFigures();
  const have = new Set(Object.keys(readJSON(SOURCES, {})).concat(Object.keys(readJSON(MANIFEST, {}))));
  let pool = corpus.filter((p) => !have.has(p.id));
  if (opts.id) pool = pool.filter((p) => p.id === opts.id);
  if (opts.trad) pool = pool.filter((p) => (p.tradition || '').toLowerCase() === opts.trad.toLowerCase());
  // Bias toward figures most likely to have public-domain art: deities first.
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
  console.log(`\ndiscover: ${proposed} figures with PD/CC0 candidates → ${path.relative(ROOT, CANDIDATES)}. Review, then copy chosen "title" into data-sources/image-sources.json and run fetch.`);
}

// ── check: re-verify licenses of already-ingested files ─────────────────────
async function cmdCheck() {
  const manifest = readJSON(MANIFEST, {});
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

// ── figure corpus (for discover) via the shared vm loader ───────────────────
function loadFigures() {
  const { loadCorpus } = require('./build-tiers.cjs');
  const PR = loadCorpus({ quiet: true });
  return Object.values(PR.seedPeople);
}
const sortObj = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
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
  if (!sharp && (cmd === 'fetch' || cmd === 'auto')) console.log('(note: `sharp` not installed — saving Commons thumbnails as-is; CI installs sharp for WebP.)');
  if (cmd === 'fetch') return cmdFetch(opts);
  if (cmd === 'auto') return cmdAuto(opts);
  if (cmd === 'discover') return cmdDiscover(opts);
  if (cmd === 'check') return cmdCheck();
  console.log('usage: node scripts/ingest-images.cjs <discover|auto|fetch|check> [--id ID] [--limit N] [--trad T] [--force]');
  process.exitCode = 2;
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { imageInfo, extOf };
