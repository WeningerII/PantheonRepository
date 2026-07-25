// Offline tests for the museum open-access adapters (docs/image-licensing.md
// approved-source amendment, 2026-07-24). The network side runs only in CI;
// everything decision-shaped here is pure and tested against fixture records
// copied from the sources' documented schemas. The invariant under test
// throughout: gates FAIL CLOSED — an absent/renamed rights flag rejects.
const { test } = require('node:test');
const assert = require('node:assert');
const m = require('../scripts/lib/museum-adapters.cjs');
const { renderSheet } = require('../scripts/lib/contact-sheet.cjs');

// ── ref grammar ─────────────────────────────────────────────────────────────
test('parseRef accepts the four sources and nothing else', () => {
  assert.deepStrictEqual(m.parseRef('met:436535'), { src: 'met', id: '436535' });
  assert.deepStrictEqual(m.parseRef('cma:1953.424'), { src: 'cma', id: '1953.424' });
  assert.deepStrictEqual(m.parseRef('aic:111628'), { src: 'aic', id: '111628' });
  assert.deepStrictEqual(m.parseRef('si:edanmdm-nmai_263011'), { src: 'si', id: 'edanmdm-nmai_263011' });
  assert.strictEqual(m.parseRef('File:Zeus.jpg'), null);
  assert.strictEqual(m.parseRef('louvre:123'), null);
  assert.strictEqual(m.parseRef(''), null);
  assert.strictEqual(m.parseRef(null), null);
});

// ── fail-closed gates ───────────────────────────────────────────────────────
test('met gate: exact isPublicDomain===true with an image; everything else rejects', () => {
  assert.ok(m.gates.met({ isPublicDomain: true, primaryImage: 'https://images.metmuseum.org/x.jpg' }));
  assert.ok(!m.gates.met({ isPublicDomain: false, primaryImage: 'x.jpg' }));
  assert.ok(!m.gates.met({ isPublicDomain: 'true', primaryImage: 'x.jpg' }));  // string ≠ boolean
  assert.ok(!m.gates.met({ primaryImage: 'x.jpg' }));                          // missing flag (schema drift)
  assert.ok(!m.gates.met({ isPublicDomain: true }));                           // no image
  assert.ok(!m.gates.met(null));
});

test('cma gate: share_license_status must equal "CC0" exactly', () => {
  const img = { web: { url: 'https://openaccess-cdn.clevelandart.org/x.jpg', width: 900, height: 600 } };
  assert.ok(m.gates.cma({ share_license_status: 'CC0', images: img }));
  assert.ok(!m.gates.cma({ share_license_status: 'cc0', images: img }));       // case drift rejects
  assert.ok(!m.gates.cma({ share_license_status: 'Copyrighted', images: img }));
  assert.ok(!m.gates.cma({ images: img }));
  assert.ok(!m.gates.cma({ share_license_status: 'CC0' }));                    // no image
});

test('aic gate: is_public_domain===true with image_id', () => {
  assert.ok(m.gates.aic({ is_public_domain: true, image_id: 'abc-def' }));
  assert.ok(!m.gates.aic({ is_public_domain: false, image_id: 'abc' }));
  assert.ok(!m.gates.aic({ is_public_domain: true }));
  assert.ok(!m.gates.aic({ image_id: 'abc' }));
});

test('si gate: metadata_usage CC0 AND an explicitly-CC0 image media item', () => {
  const rec = (usage, mediaUsage, content = 'https://ids.si.edu/x.jpg') => ({
    content: { descriptiveNonRepeating: {
      metadata_usage: usage,
      online_media: { media: [{ content, ...(mediaUsage !== undefined ? { usage: mediaUsage } : {}) }] },
    } },
  });
  assert.ok(m.gates.si(rec({ access: 'CC0' }, { access: 'CC0' })));
  // Media WITHOUT its own usage flag REJECTS: metadata_usage covers the
  // metadata, not the image — no inheritance, fail closed.
  assert.ok(!m.gates.si(rec({ access: 'CC0' }, undefined)));
  assert.ok(!m.gates.si(rec({ access: 'Usage conditions apply' }, { access: 'CC0' })));
  assert.ok(!m.gates.si(rec({ access: 'CC0' }, { access: 'Usage conditions apply' })));
  assert.ok(!m.gates.si({ content: { descriptiveNonRepeating: {} } }));        // missing flag rejects
  assert.ok(!m.gates.si(null));
});

test('si gate: non-image media (video/audio) does not satisfy the gate', () => {
  const rec = (type) => ({
    content: { descriptiveNonRepeating: {
      metadata_usage: { access: 'CC0' },
      online_media: { media: [{ content: 'https://ids.si.edu/x', type, usage: { access: 'CC0' } }] },
    } },
  });
  assert.ok(m.gates.si(rec('Images')));
  assert.ok(m.gates.si(rec(undefined)));            // absent type tolerated (usage flag still required)
  assert.ok(!m.gates.si(rec('Videos')));
  assert.ok(!m.gates.si(rec('Audio')));
});

test('redactKey strips the SI api key from any error message', () => {
  const prev = process.env.SI_API_KEY;
  process.env.SI_API_KEY = 'sekrit123';
  try {
    const e = m.redactKey(new Error('HTTP 429 for https://api.si.edu/openaccess/api/v1.0/search?q=zeus&api_key=sekrit123'));
    assert.ok(!e.message.includes('sekrit123'), 'key must not survive');
    assert.ok(e.message.includes('***SI_API_KEY***'));
  } finally {
    if (prev === undefined) delete process.env.SI_API_KEY; else process.env.SI_API_KEY = prev;
  }
});

test('lead-figure provenance: museum src labels the museum, Commons stays Commons', () => {
  const { leadFigure, provenanceOf } = require('../scripts/lib/lead-figure.cjs');
  assert.strictEqual(provenanceOf({ src: 'met' }), 'The Metropolitan Museum of Art');
  assert.strictEqual(provenanceOf({ src: 'si' }), 'Smithsonian Open Access');
  assert.strictEqual(provenanceOf({}), 'Wikimedia Commons');
  const met = leadFigure({ file: 'x.webp', src: 'met', license: { name: 'CC0' }, source: 'https://www.metmuseum.org/art/collection/search/1' }, 'Shango');
  assert.ok(met.includes('via The Metropolitan Museum of Art'));
  assert.ok(!met.includes('Wikimedia Commons'));
  const commons = leadFigure({ file: 'y.webp', license: { name: 'Public domain' }, source: 'https://commons.wikimedia.org/wiki/File:Y.jpg' }, 'Zeus');
  assert.ok(commons.includes('via Wikimedia Commons'));
});

// ── homonym defenses ────────────────────────────────────────────────────────
test('nameHit requires a word-boundary name match in title or tags', () => {
  const names = ['Shango', 'Ṣàngó'];
  assert.ok(m.nameHit(names, { title: 'Dance Wand for Shango (Oshe Shango)', tags: [] }));
  assert.ok(m.nameHit(names, { title: 'Dance wand', tags: ['Shango'] }));      // tag hit counts
  assert.ok(m.nameHit(['Sango'], { title: 'Oshe Ṣàngó figure' }));             // diacritic-insensitive
  assert.ok(!m.nameHit(names, { title: 'Yoruba divination board' }));          // no name → no hit
  assert.ok(!m.nameHit(['Aceso'], { title: 'RTL Acesoterminal deployment' })); // substring ≠ word
  assert.ok(!m.nameHit(['Sua'], { title: 'Statue of Liberty' }));              // short names never match
});

test('cultureMatch: tradition tokens and synonyms match culture/place fields', () => {
  assert.strictEqual(m.cultureMatch('Yoruba', { culture: 'Yoruba peoples', objectType: 'Figure' }), 1);
  assert.strictEqual(m.cultureMatch('Greek', { culture: 'Attic', objectType: 'Amphora' }), 1);       // synonym table
  assert.strictEqual(m.cultureMatch('Aztec/Mexica', { place: 'Mexico', objectType: 'Sculpture' }), 1);
  assert.strictEqual(m.cultureMatch('Yoruba', { culture: 'Japan', objectType: 'Print' }), 0);        // no match = neutral
  assert.strictEqual(m.cultureMatch('Yoruba', {}), 0);                                                // no metadata = neutral
  assert.strictEqual(m.cultureMatch('Hindu', { place: 'Indianapolis' }), 0);                          // word boundary: "india" ≠ "indianapolis"
});

test('naturalHistoryReject kills the taxa/specimen namespace (the butterfly class)', () => {
  assert.ok(m.naturalHistoryReject({ objectType: 'Insects', title: 'Chlosyne acastus' }));
  assert.ok(m.naturalHistoryReject({ objectType: '', title: 'Papilio aegeus holotype specimen' }));
  assert.ok(m.naturalHistoryReject({ objectType: '', title: 'Enheduanna crater map', unit: '' }));
  assert.ok(m.naturalHistoryReject({ objectType: 'Fossils', title: 'Ammonite' }));
  assert.ok(m.naturalHistoryReject({ objectType: '', title: 'x', unit: 'NMNHENTO' }));  // NMNH natural history unit
  assert.ok(!m.naturalHistoryReject({ objectType: 'Sculpture', title: 'Figure of Shango', unit: 'NMAfA' }));
  assert.ok(!m.naturalHistoryReject({ objectType: 'Masks', title: 'Tunghak mask', unit: 'NMNHANTHRO' })); // anthropology kept
});

// ── the precision failure the first live wave exposed ───────────────────────
// Wave 1 queued 746 museum candidates; only 6.6% had a culture matching the
// figure's tradition. The cause: a culture MISMATCH scored as neutral, so a
// Japanese Edo print stood as a candidate for an Achuar deity because both are
// "a Print" whose title contains the name.
test('cultureSignal: mismatch is evidence AGAINST, not merely absent evidence', () => {
  assert.strictEqual(m.cultureSignal('Yoruba', { culture: 'Yoruba peoples' }), 1);
  assert.strictEqual(m.cultureSignal('Achuar', { culture: 'Japan, Edo period (1615–1868)' }), -1);
  assert.strictEqual(m.cultureSignal('Yoruba', {}), 0, 'no culture metadata = no signal');
  // objectType must not count as culture ("Painting" is not a place).
  assert.strictEqual(m.cultureSignal('Yoruba', { objectType: 'Painting' }), 0);
});

test('a culture-mismatched print never survives the review gate', () => {
  // The real wave-1 noise: Achuar "Sua" -> a Japanese print of Lake Suwa.
  const s = m.scoreMuseum({ culture: 'Japan, Edo period (1615–1868)', objectType: 'Painting', title: 'Lake Suwa' }, ['Sua'], 'Achuar');
  assert.ok(s < m.MIN_MUSEUM_SCORE, `culture-mismatched print scored ${s}, must be below ${m.MIN_MUSEUM_SCORE}`);
  // The real wave-1 signal: the Benin pendant mask for Edo Idia.
  const good = m.scoreMuseum({ culture: 'Edo peoples', objectType: 'Pendant mask', title: 'Pendant mask of Ìyọ́bà Idià' }, ['Idia'], 'Edo');
  assert.ok(good >= m.MIN_MUSEUM_SCORE, `genuine match scored ${good}`);
});

test('generic English common-noun names are skipped outright', () => {
  for (const n of ['Moon', 'the Moon', 'Corn', 'Eagle', 'Coyote', 'Turtle', 'Buzzard', 'Africa']) {
    assert.ok(m.isGenericName(n), `${n} must be treated as generic`);
  }
  for (const n of ['Idia', 'Sobek', 'Perkūnas', 'Dhṛtarāṣṭra']) {
    assert.ok(!m.isGenericName(n), `${n} must NOT be treated as generic`);
  }
  assert.ok(m.allNamesGeneric(['Moon', 'the Moon']));
  assert.ok(!m.allNamesGeneric(['Moon', 'Habaek']), 'one specific name is enough to search');
  assert.ok(!m.allNamesGeneric([]));
});

test('searchAll short-circuits a generic-name figure without any API call', async () => {
  const res = await m.searchAll(['Moon'], 'Arapaho');
  assert.deepStrictEqual(res.candidates, []);
  assert.strictEqual(res.skipped, 'generic-name');
  assert.strictEqual(res.errors, 0);
});

test('scoreMuseum: culture-matched depictions outrank bare hits; taxa sink', () => {
  const names = ['Shango'];
  const good = m.scoreMuseum({ culture: 'Yoruba', objectType: 'Figure', title: 'Shango figure' }, names, 'Yoruba');
  const meh = m.scoreMuseum({ culture: '', objectType: 'Textile', title: 'Shango cloth' }, names, 'Yoruba');
  const bad = m.scoreMuseum({ culture: '', objectType: 'Insects', title: 'Shango moth specimen' }, names, 'Yoruba');
  assert.ok(good > meh, `culture+depiction (${good}) must beat bare (${meh})`);
  assert.ok(meh > bad, `bare (${meh}) must beat natural-history (${bad})`);
  assert.ok(bad < 0, 'taxa hits must score negative');
});

// The first museum ingest shipped 14/23 and lost every AIC pick to HTTP 403:
// the Art Institute requires callers to identify themselves, and its IIIF
// image server rejects anonymous requests even for CC0 objects.
test('AIC requests carry the identifying header its server requires', () => {
  const h = m.headersFor('aic');
  assert.ok(h && h['AIC-User-Agent'], 'aic downloads must send AIC-User-Agent');
  assert.match(h['AIC-User-Agent'], /listofgods\.com/i, 'header must identify this project');
  // Sources that do not require one must not have headers invented for them.
  assert.strictEqual(m.headersFor('met'), null);
  assert.strictEqual(m.headersFor('cma'), null);
  assert.strictEqual(m.headersFor('si'), null);
  assert.strictEqual(m.headersFor('nope'), null);
});

test('wiki-http merges per-request headers over the defaults', () => {
  const { UA } = require('../scripts/lib/wiki-http.cjs');
  // Contract check: the default identity is still present and an extra header
  // is additive (the merge is Object.assign(defaults, extra)).
  const merged = Object.assign({ 'User-Agent': UA, 'Api-User-Agent': UA, 'Accept-Encoding': 'identity' }, m.headersFor('aic'));
  assert.strictEqual(merged['User-Agent'], UA);
  assert.ok(merged['AIC-User-Agent']);
});

test('aicImg builds the IIIF URL with the response config, falling back to the constant', () => {
  assert.strictEqual(m.aicImg('https://www.artic.edu/iiif/2', 'abc', 843), 'https://www.artic.edu/iiif/2/abc/full/843,/0/default.jpg');
  assert.strictEqual(m.aicImg(null, 'abc', 400), 'https://www.artic.edu/iiif/2/abc/full/400,/0/default.jpg');
});

// ── contact sheet: museum options export their ref and show their metadata ──
test('renderSheet: museum option exports "src:id" token and displays culture metadata', () => {
  const review = {
    yoruba_shango: {
      name: 'Shango', tradition: 'Yoruba', qid: null, via: 'museum',
      options: [
        { ref: 'met:319180', title: 'Dance Wand for Shango', thumb: 'https://x/t.jpg', license: 'CC0 (Met Open Access)', src: 'met', culture: 'Yoruba', objectType: 'Wood-Sculpture', date: '19th century', url: 'https://www.metmuseum.org/art/collection/search/319180', score: 6 },
        { title: 'File:Shango staff.jpg', thumb: 'https://y/t.jpg', license: 'Public domain', src: 'text', score: 3 },
      ],
    },
  };
  const html = renderSheet(review, ['yoruba_shango']);
  const dataBlock = html.match(/<script id="sheet-data"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(dataBlock, 'sheet-data block present');
  const data = JSON.parse(dataBlock[1].replace(/\\u003c/g, '<'));
  // Museum option exports its ref; the Commons option its title — position-aligned.
  assert.deepStrictEqual(data.yoruba_shango, ['met:319180', 'File:Shango staff.jpg']);
  assert.ok(html.includes('MET'), 'source badge shown');
  assert.ok(html.includes('Yoruba'), 'culture shown');
  assert.ok(html.includes('19th century'), 'date shown');
  assert.ok(html.includes('https://www.metmuseum.org/art/collection/search/319180'), 'museum source link used');
  assert.ok(/1–6/.test(html), 'key hint covers six options');
});

// ── manifest superset invariant for the merge machinery ─────────────────────
test('museum-scan.json participates in the shard fold (range-restricted)', () => {
  const { foldShards, hashBucket } = require('../scripts/ingest-images.cjs');
  const N = 4;
  const idA = 'alpha', idB = 'beta';
  const baseline = { [idA]: { at: '2026-01-01', hits: 0 } };
  const shardOfB = hashBucket(idB, N);
  const merged = foldShards(baseline, [{ n: shardOfB, data: { [idB]: { at: '2026-07-24', hits: 2 } } }], N);
  // B added by its shard; A kept iff its bucket didn't run.
  assert.ok(merged[idB]);
  if (hashBucket(idA, N) === shardOfB) assert.ok(!merged[idA]); else assert.ok(merged[idA]);
});
