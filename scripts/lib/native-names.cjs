/*
 * native-names.cjs — native-script / native-language search terms for a figure.
 *
 * The gap this closes: identification and image search ran entirely in English
 * romanization, while the corpus already carries each figure's native form
 * (`name.transliterations`, present on 97.5% of figures — Ἀκεσώ for Aceso,
 * Перун for Perkūnas, 河伯 for Habaek). Searching in English only is searching
 * with one eye closed, in two specific ways:
 *
 *   1. Wikidata entity resolution. wbsearchentities takes a `language`; its
 *      labels are multilingual. A Lithuanian deity searched in Lithuanian, a
 *      Japanese figure by its kanji, an Andean figure in Spanish resolve where
 *      the romanization misses — and the QID is the gateway to everything
 *      downstream (P18 image, P373 Commons category), which is language-neutral
 *      once found. 539 figures currently resolve to NO entity at all.
 *   2. Commons free-text search. File descriptions are written in the
 *      uploading institution's language: the Guaman Poma drawings (the best
 *      Inca source) are catalogued in Spanish, Siberian/Turkic material in
 *      Russian, Nusantara material in Indonesian, CJK material in native script.
 *
 * Everything here is PURE and unit-tested offline (test/native-names.test.cjs);
 * the network callers live in wikidata.cjs / ingest-images.cjs.
 *
 * Homonym caution (the session's hard-won lesson): native-script search RAISES
 * collision risk — short native strings collide with more things, and CJK in
 * particular is dense. So native hits are review-tier evidence, never an
 * auto-ship signal, and every candidate still passes the same gates.
 */
'use strict';

// ── script detection ────────────────────────────────────────────────────────
// Ordered: the first range that matches wins. Latin is the fallback.
const SCRIPT_RANGES = [
  ['greek', /[Ͱ-Ͽἀ-῿]/],
  ['cyrillic', /[Ѐ-ӿԀ-ԯ]/],
  ['hebrew', /[֐-׿]/],
  ['arabic', /[؀-ۿݐ-ݿﭐ-﷿]/],
  ['syriac', /[܀-ݏ]/],
  ['devanagari', /[ऀ-ॿ]/],
  ['bengali', /[ঀ-৿]/],
  ['gurmukhi', /[਀-੿]/],
  ['gujarati', /[઀-૿]/],
  ['oriya', /[଀-୿]/],
  ['tamil', /[஀-௿]/],
  ['telugu', /[ఀ-౿]/],
  ['kannada', /[ಀ-೿]/],
  ['malayalam', /[ഀ-ൿ]/],
  ['sinhala', /[඀-෿]/],
  ['thai', /[฀-๿]/],
  ['lao', /[຀-໿]/],
  ['tibetan', /[ༀ-࿿]/],
  ['burmese', /[က-႟]/],
  ['georgian', /[Ⴀ-ჿⴀ-⴯]/],
  ['ethiopic', /[ሀ-፿]/],
  ['khmer', /[ក-៿]/],
  ['mongolian', /[᠀-᢯]/],
  ['armenian', /[԰-֏]/],
  ['runic', /[ᚠ-᛿]/],
  ['coptic', /[Ⲁ-⳿]/],
  ['hangul', /[가-힯ᄀ-ᇿ㄰-㆏]/],
  ['kana', /[぀-ヿ]/],
  ['han', /[一-鿿㐀-䶿]/],
  ['cuneiform', /[\u{12000}-\u{123FF}]/u],
  ['hieroglyph', /[\u{13000}-\u{1342F}]/u],
];

function scriptOf(s) {
  const str = String(s || '');
  for (const [name, re] of SCRIPT_RANGES) if (re.test(str)) return name;
  return 'latin';
}

// Scripts nobody CATALOGS in: cuneiform/hieroglyph/runic strings are display
// forms for our own pages — no Commons description or Wikidata label is
// written in them, so searching them burns API calls to return nothing.
const UNSEARCHABLE_SCRIPTS = new Set(['cuneiform', 'hieroglyph', 'runic', 'coptic']);

// Script → Wikidata/MediaWiki language codes to search, best first.
const LANGS_FOR_SCRIPT = {
  greek: ['el', 'grc'],
  cyrillic: ['ru'],
  hebrew: ['he'],
  arabic: ['ar', 'fa'],
  syriac: ['syc'],
  devanagari: ['hi', 'sa'],
  bengali: ['bn'],
  gurmukhi: ['pa'],
  gujarati: ['gu'],
  oriya: ['or'],
  tamil: ['ta'],
  telugu: ['te'],
  kannada: ['kn'],
  malayalam: ['ml'],
  sinhala: ['si'],
  thai: ['th'],
  lao: ['lo'],
  tibetan: ['bo'],
  burmese: ['my'],
  georgian: ['ka'],
  ethiopic: ['am'],
  khmer: ['km'],
  mongolian: ['mn'],
  armenian: ['hy'],
  hangul: ['ko'],
  kana: ['ja'],
  han: ['zh'],
  latin: [],
};

// Tradition-name token → language code. Disambiguates scripts shared across
// languages (han: Chinese vs Japanese kanji vs Korean hanja; cyrillic: Russian
// vs Ukrainian vs Serbian) and supplies a language for LATIN-script native
// forms, where the script carries no signal but the tradition does.
const TRADITION_LANG = {
  japanese: 'ja', ryukyuan: 'ja', ainu: 'ja',
  korean: 'ko', jeju: 'ko',
  chinese: 'zh', bai: 'zh', naxi: 'zh', yi: 'zh', zhuang: 'zh', hmong: 'zh',
  vietnamese: 'vi', cham: 'vi',
  thai: 'th', lao: 'lo', khmer: 'km', burmese: 'my', mon: 'my', karen: 'my',
  tibetan: 'bo', bon: 'bo', mongol: 'mn', kalmyk: 'mn', buryat: 'mn',
  hindu: 'hi', vedic: 'sa', buddhist: 'sa', jain: 'sa', gondi: 'hi', bhil: 'hi', baiga: 'hi',
  tamil: 'ta', telugu: 'te', kannada: 'kn', malayalam: 'ml', sinhala: 'si', garo: 'bn',
  greek: 'el', hellenistic: 'el',
  roman: 'la', latin: 'la',
  egyptian: 'ar', kushite: 'ar', nubian: 'ar',
  arabian: 'ar', bedouin: 'ar', moorish: 'ar', bidan: 'ar', kanuri: 'ar', fur: 'ar', beja: 'ar',
  persian: 'fa', zoroastrian: 'fa', pamiri: 'fa', tajik: 'tg', kurdish: 'ku',
  azerbaijani: 'az', turkic: 'tr', turkish: 'tr', tengrist: 'tr',
  ottoman: 'tr', anatolian: 'tr',
  armenian: 'hy', udi: 'hy',
  kartvelian: 'ka', svan: 'ka', georgian: 'ka',
  jewish: 'he', yahwism: 'he', israelite: 'he', samaritan: 'he',
  amhara: 'am', tigrinya: 'am', qemant: 'am', oromo: 'am',
  slavic: 'ru', russian: 'ru', ossetian: 'ru', abkhaz: 'ru', altai: 'ru',
  chuvash: 'ru', mari: 'ru', udmurt: 'ru', komi: 'ru', mordvin: 'ru',
  yakut: 'ru', evenki: 'ru', nivkh: 'ru', chukchi: 'ru', koryak: 'ru',
  nenets: 'ru', khanty: 'ru', mansi: 'ru', ket: 'ru', tuvan: 'ru', buryat_ru: 'ru',
  aghul: 'ru', andi: 'ru', avar: 'ru', dargin: 'ru', lezgin: 'ru', lak: 'ru',
  chechen: 'ru', ingush: 'ru', kabardian: 'ru', adyghe: 'ru', balkar: 'ru',
  ukrainian: 'uk', polish: 'pl', czech: 'cs', serbian: 'sr', bulgarian: 'bg',
  lithuanian: 'lt', latvian: 'lv', estonian: 'et', finnish: 'fi', sami: 'se',
  norse: 'is', icelandic: 'is', norwegian: 'no', swedish: 'sv', danish: 'da',
  germanic: 'de', german: 'de', dutch: 'nl',
  welsh: 'cy', irish: 'ga', scottish: 'gd', breton: 'br', manx: 'gv', cornish: 'kw',
  basque: 'eu', catalan: 'ca',
  inca: 'es', quechua: 'es', aymara: 'es', muisca: 'es', mapuche: 'es',
  aztec: 'es', mexica: 'es', maya: 'es', nahua: 'es', zapotec: 'es', mixtec: 'es',
  huichol: 'es', tarahumara: 'es', totonac: 'es', purepecha: 'es',
  guarani: 'es', selknam: 'es', tehuelche: 'es', chamacoco: 'es', nivacle: 'es',
  huarochiri: 'es', chimu: 'es', moche: 'es', taino: 'es',
  tupi: 'pt', bororo: 'pt', kayapo: 'pt', baniwa: 'pt', marubo: 'pt',
  cashinahua: 'pt', mehinaku: 'pt', kisedje: 'pt', shipibo: 'es',
  haitian: 'fr', vodou: 'fr', dahomey: 'fr', fon: 'fr', dogon: 'fr',
  bambara: 'fr', mandinka: 'fr', serer: 'fr', wolof: 'fr', malagasy: 'fr',
  indonesian: 'id', javanese: 'id', balinese: 'id', ngaju: 'id', dayak: 'id',
  minangkabau: 'id', batak: 'id', toraja: 'id', sundanese: 'id',
  malay: 'ms', senoi: 'ms', orang: 'ms',
  tagalog: 'tl', bicolano: 'tl', ilocano: 'tl', visayan: 'tl', bontoc: 'tl',
  ifugao: 'tl', tagbanwa: 'tl', bagobo: 'tl', kinaray: 'tl', maranao: 'tl',
  hawaiian: 'haw', maori: 'mi', samoan: 'sm', tongan: 'to', fijian: 'fj',
  rapanui: 'es', niuean: 'niu',
};
const TRAD_STOPWORDS = new Set(['folk', 'religion', 'mythology', 'tradition', 'traditional',
  'highland', 'pantheon', 'and', 'the', 'of', 'religions', 'belief', 'beliefs',
  'supernaturalism', 'ancient', 'shamanism', 'cult', 'syncretic', 'royal', 'island', 'islands']);

// Tradition string → language code (or null). Token-wise so
// "Amhara–Tigrinya highland folk religion" → am, "Jeju Island shamanism" → ko.
function langForTradition(tradition) {
  const toks = String(tradition || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t && !TRAD_STOPWORDS.has(t));
  for (const t of toks) if (TRADITION_LANG[t]) return TRADITION_LANG[t];
  return null;
}

// A transliteration KEY that is itself a language code/name we can search in.
const KEY_LANG = {
  ru: 'ru', uk: 'uk', ar: 'ar', fa: 'fa', he: 'he', el: 'el', grc: 'grc',
  ja: 'ja', ko: 'ko', zh: 'zh', vi: 'vi', th: 'th', hi: 'hi', sa: 'sa',
  ta: 'ta', te: 'te', bn: 'bn', tr: 'tr', az: 'az', tg: 'tg', hy: 'hy',
  ka: 'ka', am: 'am', es: 'es', pt: 'pt', fr: 'fr', de: 'de', it: 'it',
  nl: 'nl', pl: 'pl', cs: 'cs', lt: 'lt', lv: 'lv', et: 'et', fi: 'fi',
  sv: 'sv', no: 'no', da: 'da', is: 'is', id: 'id', ms: 'ms', tl: 'tl',
  la: 'la', latin: 'la', mi: 'mi', maori: 'mi', haw: 'haw',
  japanese: 'ja', korean: 'ko', chinese: 'zh', greek: 'el', russian: 'ru',
  finnish: 'fi', welsh: 'cy', 'modern-welsh': 'cy', 'middle-welsh': 'cy',
  irish: 'ga', 'old-irish': 'ga', 'old-norse': 'is', 'old norse': 'is',
  sanskrit: 'sa', devanagari: 'hi', quechua: 'qu', guarani: 'gn',
  nahuatl: 'nah', vietnamese: 'vi', tagalog: 'tl', hawaiian: 'haw',
  armenian: 'hy', georgian: 'ka', persian: 'fa', arabic: 'ar', hebrew: 'he',
};

// Values that are prose, not names: the etymology note, long strings, and
// anything with sentence punctuation. A name is short and clause-free.
const PROSE = /["“”]|\s[—–-]\s|\b(from|meaning|lit\.|literally|cognate|derived|compare|cf\.)\b/i;
const isNameLike = (v) => {
  const s = String(v || '').trim();
  return !!s && s.length <= 40 && !PROSE.test(s) && !/[.;]\s/.test(s);
};

// Scholarly transliteration systems — Latin-script renderings produced by
// Egyptology/Assyriology/Indology conventions ("sꜣt-ı͗mn", "ḫattušili").
// They are display scholarship, NOT a language anyone catalogues in, so
// assigning them the tradition's language sends nonsense to the search API.
const SCHOLARLY_KEYS = new Set([
  'mdc-transliteration', 'mdc', 'egyptian', 'egyptian-transliteration',
  'akkadian', 'sumerian', 'hittite', 'ugaritic', 'eblaite', 'hurrian',
  'luwian', 'elamite', 'avestan', 'pahlavi', 'old-persian', 'proto-indo-european',
  'pie', 'reconstructed', 'reconstructed_iranian', 'proto-iranian', 'proto-slavic',
  'linear-b', 'mycenaean', 'phoenician-transliteration', 'transliteration',
]);
// The Egyptological/Semitic transliteration character set (aleph/ayin hooks,
// under-dots, under-bars). Its presence marks a scholarly rendering whatever
// the key is called.
const SCHOLARLY_CHARS = /[ꜣꜥı͗ẖḥḏṭṣḫšṯẓḍġḳṛṇṃḷ]|[̣̱̄]/;
const isScholarly = (key, text) =>
  SCHOLARLY_KEYS.has(String(key || '').toLowerCase()) || SCHOLARLY_CHARS.test(String(text || ''));

// Split a value into script-homogeneous runs. Corpus values often pack a
// native form and its romanization into ONE string ("Сварогъ Svarogŭ"); as a
// single query that matches nothing, so each run is searched on its own.
function scriptRuns(value) {
  // Strip parenthetical glosses — "河伯（ハベク）" is the name plus a reading
  // aid; the parenthesized part is not part of the searchable name.
  const cleaned = String(value || '').replace(/[(（][^)）]*[)）]/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const runs = [];
  for (const p of parts) {
    const s = scriptOf(p);
    const last = runs[runs.length - 1];
    if (last && last.script === s) last.text += ' ' + p;
    else runs.push({ script: s, text: p });
  }
  // A single-script value stays whole (multi-word names like "源 頼家" survive).
  return runs.length <= 1 ? [{ script: scriptOf(cleaned), text: cleaned }] : runs;
}

/**
 * The searchable native forms of a figure, deduped and language-tagged.
 * @returns {Array<{text, script, langs: string[]}>}
 */
function nativeForms(fig) {
  const t = (fig && fig.name && fig.name.transliterations) || {};
  const tradLang = langForTradition(fig && fig.tradition);
  const seen = new Set();
  const out = [];
  for (const key of Object.keys(t)) {
    if (key === 'etymology') continue;
    const raw = t[key];
    if (typeof raw !== 'string' || !isNameLike(raw)) continue;
    // A value may list variants ("Ζεύς / Δίας"), and may pack a native form
    // together with its romanization ("Сварогъ Svarogŭ") — split both ways.
    for (const variant of raw.split(/\s*[\/;,]\s*/)) {
      for (const run of scriptRuns(variant)) {
        const text = run.text.trim();
        const script = run.script;
        if (!isNameLike(text) || text.length < 2) continue;
        if (UNSEARCHABLE_SCRIPTS.has(script)) continue;
        // Scholarly transliteration is not a searchable language form.
        if (script === 'latin' && isScholarly(key, text)) continue;
        const dedupe = script + ':' + text.toLowerCase();
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        // Language preference: the key's own language, then the tradition's,
        // then whatever the script implies.
        const langs = [];
        const push = (l) => { if (l && !langs.includes(l)) langs.push(l); };
        push(KEY_LANG[key.toLowerCase()]);
        if (script !== 'latin') { push(tradLang); for (const l of (LANGS_FOR_SCRIPT[script] || [])) push(l); }
        else { push(tradLang); }
        if (!langs.length) continue;   // no language to search in → not useful
        out.push({ text, script, langs });
      }
    }
  }
  // Non-Latin scripts first: they are the highest-signal (an exact CJK/Cyrillic
  // string is a much stronger match than another romanization).
  out.sort((a, b) => (a.script === 'latin' ? 1 : 0) - (b.script === 'latin' ? 1 : 0));
  return out;
}

/**
 * Flat (term, lang) query list for a figure, capped. Each native form is
 * queried in its best language only — breadth across FORMS beats depth on one.
 * @returns {Array<{term, lang, script}>}
 */
function searchTerms(fig, cap = 3) {
  const out = [];
  for (const f of nativeForms(fig)) {
    out.push({ term: f.text, lang: f.langs[0], script: f.script });
    if (out.length >= cap) break;
  }
  return out;
}

/** Does any native form of the figure appear in a text (Commons title/description)? */
function nativeHit(fig, text) {
  const hay = String(text || '');
  if (!hay) return false;
  return nativeForms(fig).some((f) => f.script !== 'latin' && f.text.length >= 2 && hay.includes(f.text));
}

module.exports = {
  scriptOf, nativeForms, searchTerms, nativeHit, langForTradition, isNameLike,
  scriptRuns, isScholarly,
  SCRIPT_RANGES, LANGS_FOR_SCRIPT, TRADITION_LANG, KEY_LANG, UNSEARCHABLE_SCRIPTS,
};
