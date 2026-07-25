/*
 * wiki-images.cjs — lead images from EVERY language Wikipedia, via sitelinks.
 *
 * The gap this closes: the pipeline used Wikidata for identification and
 * Commons for files, but never touched the ~300 language Wikipedias that sit
 * between them. A Wikidata entity carries `sitelinks` — the exact article about
 * that entity in each wiki — and each article has a curated lead image. A
 * figure invisible on English Wikipedia routinely has a well-illustrated
 * article in Russian, Japanese, Persian, Armenian, Georgian, Thai, Telugu…
 *
 * This is CURATED identification of the same class as P18: the sitelink is a
 * 1:1 entity→article mapping made by editors, and the lead image is the image
 * those editors chose to represent it. So it ships on the same terms as P18 —
 * license gate + sanity check — rather than going to human review.
 *
 * Rule 1 of docs/image-licensing.md still binds: a page image that lives as a
 * LOCAL upload on some wiki (frequently non-free fair-use) is rejected; only
 * files that resolve on commons.wikimedia.org pass, and the Commons license
 * gate then runs on them exactly as for every other path.
 *
 * Efficiency: queries are batched per wiki, 50 article titles per request, so
 * covering thousands of figures across dozens of wikis costs tens of calls,
 * not thousands.
 */
'use strict';
const { getJSON, sleep } = require('./wiki-http.cjs');

// Wikis worth querying, roughly by article richness for mythology/history
// subjects. The figure's own tradition-language wiki is always queried first
// (see orderWikis) — this list is the breadth pass after that.
const BIG_WIKIS = [
  'en', 'de', 'fr', 'ru', 'es', 'ja', 'zh', 'it', 'pt', 'fa', 'ar', 'pl', 'nl',
  'sv', 'uk', 'tr', 'ko', 'id', 'vi', 'he', 'hi', 'el', 'cs', 'fi', 'hu', 'no',
  'da', 'ro', 'bg', 'sr', 'hr', 'ca', 'th', 'ms', 'et', 'lt', 'lv', 'sl', 'sk',
  'az', 'ka', 'hy', 'kk', 'uz', 'ta', 'te', 'ml', 'kn', 'mr', 'bn', 'ne', 'si',
  'my', 'km', 'lo', 'mn', 'bo', 'am', 'sw', 'yo', 'ig', 'ha', 'zu', 'af', 'is',
  'ga', 'cy', 'eu', 'gl', 'la', 'sq', 'mk', 'be', 'tt', 'ba', 'ce', 'os', 'cv',
  'sah', 'tg', 'ky', 'ur', 'ps', 'ku', 'ckb', 'jv', 'su', 'tl', 'ceb', 'war',
  'mi', 'haw', 'sm', 'to', 'fj', 'mg', 'qu', 'ay', 'gn', 'nah', 'ht', 'yi',
];

// sitelink key ("ruwiki") → wiki language code ("ru"). Non-Wikipedia projects
// (commonswiki, wikiquote, …) are not article sitelinks and are skipped.
const wikiLangOf = (key) => {
  const m = /^([a-z0-9_-]+)wiki$/.exec(String(key || ''));
  if (!m) return null;
  const lang = m[1].replace(/_/g, '-');
  if (['commons', 'species', 'meta', 'source', 'data'].includes(lang)) return null;
  return lang;
};

/**
 * All article sitelinks of an entity, as {lang: title}.
 */
function sitelinksOf(entity) {
  const out = {};
  const sl = (entity && entity.sitelinks) || {};
  for (const key of Object.keys(sl)) {
    const lang = wikiLangOf(key);
    if (lang && sl[key] && sl[key].title) out[lang] = sl[key].title;
  }
  return out;
}

/**
 * Order the wikis to try for a figure: its own tradition language first (the
 * article most likely to be illustrated with a culturally correct image),
 * then the big wikis, then anything else it has.
 */
function orderWikis(links, preferLangs = []) {
  const have = Object.keys(links);
  const seen = new Set();
  const out = [];
  const push = (l) => { if (links[l] && !seen.has(l)) { seen.add(l); out.push(l); } };
  for (const l of preferLangs) push(l);
  for (const l of BIG_WIKIS) push(l);
  for (const l of have) push(l);
  return out;
}

/**
 * Batch-fetch lead images for many articles on ONE wiki.
 * @param lang    wiki language code
 * @param titles  article titles (any number; chunked 50/request)
 * @returns {title: filename} — filename WITHOUT the "File:" prefix
 */
async function pageImages(lang, titles, { log = () => {} } = {}) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    u.search = new URLSearchParams({
      action: 'query', prop: 'pageimages', piprop: 'name', pilicense: 'free',
      pilimit: '50', titles: chunk.join('|'), format: 'json', formatversion: '2',
    }).toString();
    let data;
    try { data = await getJSON(u.toString()); }
    catch (e) { log(`${lang}wiki batch: ${e.message}`); continue; }
    for (const p of ((data.query && data.query.pages) || [])) {
      if (p && p.title && p.pageimage) out[p.title] = p.pageimage;
    }
    if (i + 50 < titles.length) await sleep(200);
  }
  return out;
}

module.exports = { sitelinksOf, orderWikis, pageImages, wikiLangOf, BIG_WIKIS };
