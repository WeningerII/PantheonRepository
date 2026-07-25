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
// MediaWiki rewrites the titles you ask for: it normalizes them (underscores,
// leading-cap, unicode form) and silently follows redirects. So the `title` on
// a result page is frequently NOT the string that was requested, and keying
// results by it drops those figures on the floor. The response carries the
// `normalized` and `redirects` mappings precisely so callers can undo this —
// resolveRequested walks them back to the original request.
function resolveRequested(data) {
  const back = new Map();   // returned title -> originally requested title
  const q = (data && data.query) || {};
  const chain = [...(q.normalized || []), ...(q.redirects || [])];
  // Apply in order: requested -> normalized -> redirect target.
  for (const step of chain) {
    if (!step || !step.from || !step.to) continue;
    const origin = back.get(step.from) || step.from;
    back.set(step.to, origin);
  }
  return back;
}

async function pageImages(lang, titles, { log = () => {} } = {}) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    u.search = new URLSearchParams({
      action: 'query', prop: 'pageimages', piprop: 'name', pilicense: 'free',
      pilimit: '50', redirects: '1', titles: chunk.join('|'),
      format: 'json', formatversion: '2',
    }).toString();
    let data;
    try { data = await getJSON(u.toString()); }
    catch (e) { log(`${lang}wiki batch: ${e.message}`); continue; }
    const back = resolveRequested(data);
    for (const p of ((data.query && data.query.pages) || [])) {
      if (!p || !p.title || !p.pageimage) continue;
      // Record under BOTH the returned title and the requested one, so the
      // caller finds it whichever key it holds.
      out[p.title] = p.pageimage;
      const orig = back.get(p.title);
      if (orig) out[orig] = p.pageimage;
    }
    if (i + 50 < titles.length) await sleep(200);
  }
  return out;
}

// Interface furniture that appears in article wikitext and is never a
// depiction of the subject: project logos, maintenance boxes, UI glyphs, audio
// speaker icons, flags/arms, map pins and locator maps, portal stars.
// Matched against the bare filename, case-insensitively.
// Matched against the filename with whitespace folded to "_", which is how
// MediaWiki titles round-trip (the API hands back "Question book-new.svg", the
// canonical title is "Question_book-new.svg" — both must hit).
const CHROME_FILE = new RegExp([
  '^(commons|wikisource|wiktionary|wikiquote|wikidata|wikinews|wikibooks|wikiversity|wikispecies|wikimedia)[-_]',
  '^(ambox|imbox|cmbox|tmbox|ombox|fmbox)',
  '^(nuvola|crystal|gnome|oojs|octicons|font_?awesome|material_?symbol)',
  '^(flag|coat_of_arms|escudo|bandera|drapeau)[-_]',
  '^(p_vip|portal|star_of_life|question_book|edit-clear|text_document|merge)',
  '^(red|blue|green|orange|purple|yellow|black|white)_pog',
  '^(searchtool|magnify-clip)',
  '[-_](locator|location)_map',
  '(speaker|loudspeaker|sound|audio)[-_]?icon',
  '(^|_)(disambig|padlock|lock|wiki_letter|folder|emblem|icon)[-_]',
  '(^|_)symbol_',
  '(^|_)(increase|decrease|steady)\\d*\\.',
].join('|'), 'i');

const isChromeFile = (name) => CHROME_FILE.test(
  String(name || '').replace(/^File:/i, '').replace(/\s+/g, '_').trim());

/**
 * Every file USED IN the body of many articles on ONE wiki.
 *
 * The gap this closes: `prop=pageimages` returns only the page's designated
 * lead image, and a great many mythology articles have no infobox at all —
 * their one 19th-century engraving or museum photograph sits in the body,
 * invisible to every path we had. `prop=images` lists them.
 *
 * Body images are NOT curated identification of the subject (an article can
 * illustrate a parent deity, a temple, a family tree), so callers must route
 * these to human/agent review rather than auto-shipping them.
 *
 * @returns {title: [filename, …]} — filenames WITHOUT the "File:" prefix, in
 *          article order, chrome already dropped.
 */
async function articleImages(lang, titles, { log = () => {}, perPage = 12 } = {}) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    u.search = new URLSearchParams({
      action: 'query', prop: 'images', imlimit: 'max', redirects: '1',
      titles: chunk.join('|'), format: 'json', formatversion: '2',
    }).toString();
    let data;
    try { data = await getJSON(u.toString()); }
    catch (e) { log(`${lang}wiki images batch: ${e.message}`); continue; }
    const back = resolveRequested(data);
    for (const p of ((data.query && data.query.pages) || [])) {
      if (!p || !p.title || !Array.isArray(p.images)) continue;
      const files = [];
      for (const im of p.images) {
        const name = String((im && im.title) || '').replace(/^[^:]+:/, '').trim();
        if (!name || isChromeFile(name)) continue;
        files.push(name);
        if (files.length >= perPage) break;
      }
      if (!files.length) continue;
      out[p.title] = files;
      const orig = back.get(p.title);
      if (orig) out[orig] = files;
    }
    if (i + 50 < titles.length) await sleep(200);
  }
  return out;
}

/**
 * Search ONE wiki for an article, in that wiki's own language, and return the
 * best title plus its lead image and Wikidata id in a single round trip.
 *
 * Why this exists separately from the sitelink path: a figure only reaches
 * sitelinks if `map` already resolved it to a Wikidata entity, and
 * wbsearchentities misses entities routinely — 1,378 corpus figures have no
 * QID at all. But the ARTICLE often exists anyway. Searching the wiki directly,
 * in the figure's own language, finds it and hands back both the image and the
 * QID (via pageprops.wikibase_item), which also repairs the mapping.
 *
 * @returns [{title, pageimage, qid, snippetTitle}] best-first
 */
async function searchWiki(lang, term, { limit = 3, log = () => {} } = {}) {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: term, gsrlimit: String(limit),
    gsrnamespace: '0', prop: 'pageimages|pageprops', piprop: 'name',
    pilicense: 'free', pilimit: String(limit), ppprop: 'wikibase_item',
    format: 'json', formatversion: '2',
  }).toString();
  let data;
  try { data = await getJSON(u.toString()); }
  catch (e) { log(`${lang}wiki search "${term}": ${e.message}`); return []; }
  const pages = (data.query && data.query.pages) || [];
  return pages
    .slice()
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .map((p) => ({
      title: p.title,
      pageimage: p.pageimage || null,
      qid: (p.pageprops && p.pageprops.wikibase_item) || null,
    }));
}

// Does an article title plausibly name the figure, rather than merely mention
// it? Requires the title to BE the name, or the name plus a parenthetical
// disambiguator ("Sarpedon (son of Zeus)") — never a title that just contains
// the word, which is how "Elisha Cursing the Children of Bethel" happens.
function titleNamesFigure(title, names) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const t = norm(title).replace(/\s*\([^)]*\)\s*$/, '');   // drop disambiguator
  return names.some((n) => {
    const nn = norm(n);
    return nn.length > 2 && t === nn;
  });
}

module.exports = {
  sitelinksOf, orderWikis, pageImages, wikiLangOf, resolveRequested,
  searchWiki, titleNamesFigure, BIG_WIKIS, articleImages, isChromeFile,
};
