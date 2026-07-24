/*
 * museum-adapters.cjs — approved museum open-access sources for the image
 * pipeline (docs/image-pipeline.md; policy: docs/image-licensing.md).
 *
 * The owner's rule (amended 2026-07-24 with sign-off): PD/CC0 ONLY, from an
 * APPROVED LIST of sources whose rights status is a machine-readable flag we
 * verify in code — never a human-written caption. Commons remains primary;
 * these adapters add the museums whose open-access programs release their OWN
 * photography of their OWN objects as CC0, which dissolves the
 * photographer-copyright problem that blocks Commons photos of 3D works
 * (masks, figures, ritual objects — exactly the traditions with the least
 * coverage).
 *
 * Every adapter:
 *   - searches by a figure's names, returns a COMMON candidate shape carrying
 *     the structured metadata (culture / object type / date) the homonym
 *     defenses and the review sheet need;
 *   - gates FAIL-CLOSED: the documented rights flag must equal the documented
 *     open value exactly — a missing/renamed field rejects, so upstream schema
 *     drift can never ship an image;
 *   - is review-only: nothing from a museum auto-ships; candidates land on the
 *     owner's contact sheet (wrong image ≫ no image).
 *
 * Sources (keyless unless noted):
 *   met  Metropolitan Museum of Art  isPublicDomain === true
 *   cma  Cleveland Museum of Art     share_license_status === "CC0"
 *   aic  Art Institute of Chicago    is_public_domain === true
 *   si   Smithsonian Open Access     metadata_usage.access === "CC0"
 *        (needs SI_API_KEY — free at api.data.gov; adapter skips cleanly
 *        when unset so the sweep works day one and improves with the key)
 *
 * Network runs in CI only (the dev sandbox has no route to these hosts); the
 * decision logic is pure and unit-tested offline (test/museum-adapters.test.cjs).
 */
'use strict';
const { get, getJSON, sleep } = require('./wiki-http.cjs');

// ── refs ────────────────────────────────────────────────────────────────────
// A museum pick travels the review→approved→ingest path as "src:id" (e.g.
// "met:436535") — the same slot a Commons "File:…" title occupies, so the
// sheet export, approvals file, sources ledger, and blocklist all work
// unchanged. parseRef is the single decoder.
const REF_RE = /^(met|cma|aic|si):(.+)$/;
const parseRef = (s) => {
  const m = typeof s === 'string' ? s.match(REF_RE) : null;
  return m ? { src: m[1], id: m[2] } : null;
};

// ── fail-closed license gates (pure) ────────────────────────────────────────
// Exact equality with the documented open value; anything else — including a
// missing field after upstream schema drift — rejects.
const gates = {
  met: (rec) => !!(rec && rec.isPublicDomain === true && rec.primaryImage),
  cma: (rec) => !!(rec && rec.share_license_status === 'CC0' && rec.images && rec.images.web && rec.images.web.url),
  aic: (rec) => !!(rec && rec.is_public_domain === true && rec.image_id),
  si: (rec) => {
    const dnr = rec && rec.content && rec.content.descriptiveNonRepeating;
    if (!dnr || !dnr.metadata_usage || dnr.metadata_usage.access !== 'CC0') return false;
    const media = dnr.online_media && Array.isArray(dnr.online_media.media) ? dnr.online_media.media : [];
    return media.some((m) => m && m.content && (!m.usage || m.usage.access === 'CC0'));
  },
};

// ── homonym defenses (pure) ─────────────────────────────────────────────────

const norm = (s) => String(s || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Does any of the figure's names appear as a word in the candidate's title or
// subject tags? Required — a museum hit with no name connection is noise.
function nameHit(names, cand) {
  const hay = [cand.title, ...(cand.tags || [])].map(norm).join(' | ');
  return names.some((n) => {
    const nn = norm(n);
    return nn.length > 3 && new RegExp('\\b' + nn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(hay);
  });
}

// Tradition → culture keywords. The corpus names most traditions after the
// people (Akan, Yoruba, Koyukon…), so the tradition tokens themselves match
// museum `culture`/`place` fields; this table adds synonyms for the big
// traditions whose art-world labels differ. Fallback is the tradition tokens.
const CULTURE_SYNONYMS = {
  greek: ['greek', 'attic', 'hellenistic', 'mycenaean', 'corinthian', 'boeotian', 'cycladic', 'greece'],
  roman: ['roman', 'rome', 'italic'],
  egyptian: ['egyptian', 'egypt'],
  norse: ['norse', 'viking', 'scandinavian', 'icelandic', 'norwegian', 'swedish', 'danish'],
  hindu: ['india', 'indian', 'nepal', 'nepalese', 'chola', 'pala', 'rajasthan', 'tamil'],
  buddhist: ['buddhist', 'tibet', 'tibetan', 'india', 'japan', 'china', 'thai', 'burma', 'nepal'],
  chinese: ['china', 'chinese'],
  japanese: ['japan', 'japanese'],
  korean: ['korea', 'korean'],
  aztec: ['aztec', 'mexica', 'mexico', 'mexican'],
  maya: ['maya', 'mayan', 'guatemala', 'mexico'],
  inca: ['inca', 'peru', 'peruvian', 'andean'],
  yoruba: ['yoruba', 'nigeria', 'nigerian'],
  mesopotamian: ['mesopotamia', 'mesopotamian', 'sumerian', 'babylonian', 'assyrian', 'akkadian', 'iraq'],
  celtic: ['celtic', 'gaulish', 'gallo roman', 'iron age'],
  irish: ['irish', 'ireland', 'celtic'],
  slavic: ['slavic', 'russian', 'polish', 'ukrainian', 'bohemian'],
  zoroastrian: ['persian', 'iran', 'iranian', 'sasanian', 'achaemenid'],
  phoenician: ['phoenician', 'punic', 'levantine'],
  hittite: ['hittite', 'anatolian', 'anatolia', 'turkey'],
};
const TRAD_STOPWORDS = new Set(['folk', 'religion', 'mythology', 'tradition', 'traditional', 'highland', 'pantheon', 'and', 'the', 'of', 'religions', 'belief', 'beliefs', 'supernaturalism', 'ancient']);
function cultureKeywords(tradition) {
  const toks = norm(tradition).split(' ').filter((t) => t.length > 2 && !TRAD_STOPWORDS.has(t));
  const syn = new Set(toks);
  for (const t of toks) for (const k of (CULTURE_SYNONYMS[t] || [])) syn.add(k);
  return [...syn];
}
// 1 = a culture/place field matches the tradition; 0 = no signal either way.
function cultureMatch(tradition, cand) {
  const kws = cultureKeywords(tradition);
  if (!kws.length) return 0;
  const hay = norm([cand.culture, cand.place, cand.objectType].filter(Boolean).join(' '));
  if (!hay) return 0;
  return kws.some((k) => hay.includes(k)) ? 1 : 0;
}

// Natural-history and other systematically-colliding namespaces (taxa named
// after Greek heroes, minerals, fossils…). Smithsonian search spans NMNH, so
// these classes MUST be rejected before review.
// Stems (no trailing \b — they must match plurals/derivations: "Insects",
// "butterflies") plus whole words for the short terms that would otherwise
// collide with ordinary art vocabulary ("moth" in "mother").
const NATURAL_HISTORY_TYPES = /\b(insect|butterfl|beetle|lepidoptera|specimen|fossil|mineral|meteorite|herbarium|mollus|crustacean|taxiderm)|\b(moths?|plants?|birds?|mammals?|fishes|reptiles?|amphibians?|shells?|eggs?|nests?|skulls?|skeletons?)\b/i;
const BAD_TITLE = /\b(distribution|holotype|paratype|subsp|\bvar\b|genus|species|crater|asteroid|locomotive|banknote|stamp sheet|jersey|stadium|scoreboard)\b/i;
function naturalHistoryReject(cand) {
  if (NATURAL_HISTORY_TYPES.test(String(cand.objectType || ''))) return true;
  if (cand.unit && /^NMNH/i.test(cand.unit) && !/anthro/i.test(cand.unit)) return true; // NMNH minus anthropology
  if (BAD_TITLE.test(String(cand.title || ''))) return true;
  return false;
}

// Object types that are DEPICTION-shaped (art of a subject, not furniture).
const DEPICTION_TYPE = /\b(statue|statuette|figure|figurine|sculpture|relief|bust|mask|painting|print|drawing|icon|amulet|stele|stela|plaque|vessel|vase|amphora|krater|carving|totem|effigy|idol|miniature|manuscript|folio|tapestry|fresco|bronze|terracotta)\b/i;

// Rank a museum candidate for the review sheet. Name-hit is a precondition
// (checked separately) — this orders the survivors. The lesson from the
// Commons batches stands: this score ORDERS candidates for a human, it never
// ships one.
function scoreMuseum(cand, names, tradition) {
  let s = 0;
  s += cultureMatch(tradition, cand) * 4;
  if (DEPICTION_TYPE.test(String(cand.objectType || '') + ' ' + String(cand.title || ''))) s += 2;
  if (naturalHistoryReject(cand)) s -= 8;
  return s;
}

// ── thin network per source (CI only) ───────────────────────────────────────
const PACE_MS = 160; // polite pacing between museum API calls

async function metSearch(name, cap = 6) {
  const q = encodeURIComponent(name);
  const data = await getJSON(`https://collectionapi.metmuseum.org/public/collection/v1/search?q=${q}&hasImages=true`);
  const ids = (data && Array.isArray(data.objectIDs) ? data.objectIDs : []).slice(0, cap);
  const out = [];
  for (const oid of ids) {
    await sleep(PACE_MS);
    let rec; try { rec = await getJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${oid}`); } catch (_) { continue; }
    if (!gates.met(rec)) continue;
    out.push({
      ref: `met:${rec.objectID}`, src: 'met', title: rec.title || '',
      thumb: rec.primaryImageSmall || rec.primaryImage, full: rec.primaryImage,
      culture: rec.culture || '', place: rec.country || '', objectType: rec.objectName || '',
      date: rec.objectDate || '', credit: rec.artistDisplayName || '',
      url: rec.objectURL || `https://www.metmuseum.org/art/collection/search/${rec.objectID}`,
      tags: Array.isArray(rec.tags) ? rec.tags.map((t) => t && t.term).filter(Boolean) : [],
      license: 'CC0 (Met Open Access)',
    });
  }
  return out;
}
async function metGet(id) {
  const rec = await getJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${encodeURIComponent(id)}`);
  return gates.met(rec) ? { full: rec.primaryImage, title: rec.title || '', credit: rec.artistDisplayName || '', url: rec.objectURL || '', record: rec } : null;
}

async function cmaSearch(name, cap = 8) {
  const q = encodeURIComponent(name);
  const data = await getJSON(`https://openaccess-api.clevelandart.org/api/artworks/?q=${q}&cc0=1&has_image=1&limit=${cap}`);
  const rows = (data && Array.isArray(data.data)) ? data.data : [];
  return rows.filter((r) => gates.cma(r)).map((r) => ({
    ref: `cma:${r.id}`, src: 'cma', title: r.title || '',
    thumb: r.images.web.url, full: (r.images.print && r.images.print.url) || r.images.web.url,
    w: r.images.web.width, h: r.images.web.height,
    culture: Array.isArray(r.culture) ? r.culture.join('; ') : (r.culture || ''),
    objectType: r.type || '', date: r.creation_date || '',
    credit: (Array.isArray(r.creators) && r.creators[0] && r.creators[0].description) || '',
    url: r.url || '', tags: [], license: 'CC0',
  }));
}
async function cmaGet(id) {
  const data = await getJSON(`https://openaccess-api.clevelandart.org/api/artworks/${encodeURIComponent(id)}`);
  const r = data && data.data;
  return gates.cma(r) ? { full: (r.images.print && r.images.print.url) || r.images.web.url, title: r.title || '', credit: (Array.isArray(r.creators) && r.creators[0] && r.creators[0].description) || '', url: r.url || '', record: r } : null;
}

const AIC_FIELDS = 'id,title,is_public_domain,image_id,date_display,place_of_origin,artwork_type_title,classification_titles';
const aicImg = (iiif, imageId, w) => `${iiif || 'https://www.artic.edu/iiif/2'}/${imageId}/full/${w},/0/default.jpg`;
async function aicSearch(name, cap = 8) {
  const q = encodeURIComponent(name);
  const data = await getJSON(`https://api.artic.edu/api/v1/artworks/search?q=${q}&fields=${AIC_FIELDS}&limit=${cap}`);
  const iiif = data && data.config && data.config.iiif_url;
  const rows = (data && Array.isArray(data.data)) ? data.data : [];
  return rows.filter((r) => gates.aic(r)).map((r) => ({
    ref: `aic:${r.id}`, src: 'aic', title: r.title || '',
    thumb: aicImg(iiif, r.image_id, 400), full: aicImg(iiif, r.image_id, 843),
    culture: r.place_of_origin || '', objectType: r.artwork_type_title || '',
    date: r.date_display || '', credit: '',
    url: `https://www.artic.edu/artworks/${r.id}`,
    tags: Array.isArray(r.classification_titles) ? r.classification_titles : [],
    license: 'CC0 (AIC Open Access)',
  }));
}
async function aicGet(id) {
  const data = await getJSON(`https://api.artic.edu/api/v1/artworks/${encodeURIComponent(id)}?fields=${AIC_FIELDS}`);
  const iiif = data && data.config && data.config.iiif_url;
  const r = data && data.data;
  return gates.aic(r) ? { full: aicImg(iiif, r.image_id, 843), title: r.title || '', credit: '', url: `https://www.artic.edu/artworks/${r.id}`, record: r } : null;
}

const siKey = () => process.env.SI_API_KEY || '';
function siToCand(row) {
  const dnr = row.content && row.content.descriptiveNonRepeating;
  const idx = (row.content && row.content.indexedStructured) || {};
  const media = ((dnr && dnr.online_media && dnr.online_media.media) || []).find((m) => m && m.content && (!m.usage || m.usage.access === 'CC0'));
  if (!media) return null;
  return {
    ref: `si:${row.id}`, src: 'si', title: row.title || '',
    thumb: media.thumbnail || media.content, full: media.content,
    culture: Array.isArray(idx.culture) ? idx.culture.join('; ') : '',
    objectType: Array.isArray(idx.object_type) ? idx.object_type.join('; ') : '',
    date: Array.isArray(idx.date) ? idx.date.join('; ') : '',
    credit: (dnr && dnr.data_source) || '', unit: (dnr && dnr.unit_code) || '',
    url: (dnr && dnr.record_link) || `https://www.si.edu/object/${row.id}`,
    tags: [], license: 'CC0 (Smithsonian Open Access)',
  };
}
async function siSearch(name, cap = 8) {
  if (!siKey()) return [];
  const q = encodeURIComponent(name);
  const data = await getJSON(`https://api.si.edu/openaccess/api/v1.0/search?q=${q}&rows=${cap}&api_key=${siKey()}`);
  const rows = (data && data.response && Array.isArray(data.response.rows)) ? data.response.rows : [];
  return rows.filter((r) => gates.si(r)).map(siToCand).filter(Boolean);
}
async function siGet(id) {
  if (!siKey()) return null;
  const data = await getJSON(`https://api.si.edu/openaccess/api/v1.0/content/${encodeURIComponent(id)}?api_key=${siKey()}`);
  const row = data && data.response;
  if (!row || !gates.si(row)) return null;
  const c = siToCand(row);
  return c ? { full: c.full, title: c.title, credit: c.credit, url: c.url, record: { id: row.id, title: row.title, unit: c.unit } } : null;
}

// ── the two entry points the pipeline uses ──────────────────────────────────

const SEARCHERS = { met: metSearch, cma: cmaSearch, aic: aicSearch, si: siSearch };
const GETTERS = { met: metGet, cma: cmaGet, aic: aicGet, si: siGet };
const activeSources = () => ['met', 'cma', 'aic', ...(siKey() ? ['si'] : [])];

/**
 * Search every active source for a figure. Returns gated, name-verified,
 * homonym-filtered candidates sorted by score — for the REVIEW SHEET only.
 * Per-source failures degrade to that source contributing nothing.
 */
async function searchAll(names, tradition, { perSourceCap = 6, log = () => {} } = {}) {
  const out = [];
  const seen = new Set();
  for (const src of activeSources()) {
    for (const name of names.slice(0, 2)) {
      try {
        for (const c of await SEARCHERS[src](name, perSourceCap)) {
          if (!seen.has(c.ref)) { seen.add(c.ref); out.push(c); }
        }
      } catch (e) { log(`${src} search "${name}": ${e.message}`); }
      await sleep(PACE_MS);
    }
  }
  const kept = out.filter((c) => nameHit(names, c) && !naturalHistoryReject(c));
  kept.forEach((c) => { c.score = scoreMuseum(c, names, tradition); });
  kept.sort((a, b) => b.score - a.score);
  return kept;
}

/**
 * Resolve an approved "src:id" ref for ingest: re-runs the source's rights
 * gate NOW (ingest-time re-verification, same invariant as Commons), returns
 * {full, title, credit, url, record} or null when the gate no longer passes.
 */
async function resolveRef(ref) {
  const p = parseRef(ref);
  if (!p) return null;
  return GETTERS[p.src](p.id);
}

module.exports = {
  parseRef, gates, nameHit, cultureKeywords, cultureMatch, naturalHistoryReject,
  scoreMuseum, searchAll, resolveRef, activeSources, siToCand, aicImg,
  DEPICTION_TYPE, NATURAL_HISTORY_TYPES,
};
