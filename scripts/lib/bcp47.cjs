/*
 * bcp47.cjs — classify a run of text by the writing system it is actually in,
 * and return a BCP-47 script subtag ("und-Arab", "und-Cyrl", …) to hang on the
 * element carrying it. Pure and corpus-free, like scripts/lib/lead-figure.cjs,
 * so it unit-tests without loading the 28 MB corpus.
 *
 * WHY it exists: the static pages declare lang="en" once on <html> and then
 * render Arabic, Hebrew, Devanagari, Ethiopic, Cyrillic, Han, Greek, Ugaritic
 * and Egyptian hieroglyphs inside it — epithets, native names, aliases, Russian
 * scholarship in the citation lists — on 903 of the 5,721 figure pages, with
 * zero body-level lang anywhere in the corpus. That is a WCAG 3.1.2 (AA)
 * failure with a concrete cost: a screen reader meeting
 * <li>العزى</li> in an English document either falls silent or spells out
 * Unicode character names. axe implements no rule for this, which is how it
 * survived an accessibility score of 100.
 *
 * WHY mechanically rather than from the data: the corpus does carry
 * epithets[].language, but as free prose — "tibetan", "Yoruba", "Old Norse" —
 * on 2,245 of 3,893 epithets. Mapping that to subtags needs a hand-curated
 * table that rots as the corpus grows and still leaves 1,648 epithets bare.
 * The Unicode Script property answers the same question for every run,
 * deterministically, with nothing to maintain.
 *
 * WHY "und-": the script is all we can prove. und-Arab asks a synthesizer for
 * an Arabic voice without claiming the text is Arabic rather than Persian,
 * Urdu or Sindhi — a claim nothing in the corpus supports. An assertive but
 * wrong language tag is worse than an honestly undetermined one, and und- is
 * the registered way to say so.
 */
'use strict';

// ISO 15924 subtag -> the Unicode Script property values that write it. Several
// script names can feed one subtag (see Jpan below), so counts accumulate per
// subtag rather than per script name.
//
// This is an identity map, not curation — each row is a fact about ISO 15924
// that cannot go out of date — so it is worth being wider than the corpus needs
// today. A script that IS missing from it fails safe: the run comes back
// untagged, exactly as it was before this file existed, never mistagged. The
// corpus currently renders 29 of these; the rest are the neighbours it keeps
// reaching into (Semitic, Anatolian, Indic, ancient Aegean).
const SCRIPTS = [
  ['Arab', ['Arabic']], ['Hebr', ['Hebrew']], ['Deva', ['Devanagari']],
  ['Ethi', ['Ethiopic']], ['Cyrl', ['Cyrillic']], ['Hani', ['Han']],
  ['Grek', ['Greek']], ['Egyp', ['Egyptian_Hieroglyphs']],
  // Japanese is written with kana *and* Han together, so a kana-bearing run is
  // Jpan whole — see the fixup below, which is why both kana feed one subtag.
  ['Jpan', ['Hiragana', 'Katakana']], ['Hang', ['Hangul']],
  ['Tibt', ['Tibetan']], ['Armn', ['Armenian']], ['Geor', ['Georgian']],
  ['Syrc', ['Syriac']], ['Thaa', ['Thaana']], ['Copt', ['Coptic']],
  ['Taml', ['Tamil']], ['Beng', ['Bengali']], ['Telu', ['Telugu']],
  ['Knda', ['Kannada']], ['Mlym', ['Malayalam']], ['Gujr', ['Gujarati']],
  ['Guru', ['Gurmukhi']], ['Orya', ['Oriya']], ['Sinh', ['Sinhala']],
  ['Thai', ['Thai']], ['Laoo', ['Lao']], ['Khmr', ['Khmer']],
  ['Mymr', ['Myanmar']], ['Mong', ['Mongolian']], ['Java', ['Javanese']],
  ['Bali', ['Balinese']], ['Xsux', ['Cuneiform']], ['Runr', ['Runic']],
  ['Ogam', ['Ogham']], ['Goth', ['Gothic']], ['Cher', ['Cherokee']],
  ['Cans', ['Canadian_Aboriginal']], ['Nkoo', ['Nko']], ['Tfng', ['Tifinagh']],
  ['Vaii', ['Vai']], ['Adlm', ['Adlam']], ['Xpeo', ['Old_Persian']],
  ['Mero', ['Meroitic_Hieroglyphs']],
  // Ancient Near East and Mediterranean — the corpus cites Ugaritic epithets in
  // cuneiform alphabet, Phoenician and Nabataean dedications, Old Turkic runes
  // and Old Italic theonyms, all of which read as plain Latin without these.
  ['Ugar', ['Ugaritic']], ['Phnx', ['Phoenician']], ['Nbat', ['Nabataean']],
  ['Armi', ['Imperial_Aramaic']], ['Samr', ['Samaritan']], ['Sarb', ['Old_South_Arabian']],
  ['Avst', ['Avestan']], ['Ital', ['Old_Italic']], ['Orkh', ['Old_Turkic']],
  ['Cari', ['Carian']], ['Lyci', ['Lycian']], ['Lydi', ['Lydian']],
  ['Lina', ['Linear_A']], ['Linb', ['Linear_B']], ['Glag', ['Glagolitic']],
  ['Brah', ['Brahmi']], ['Khar', ['Kharoshthi']],
].map(([tag, names]) => [tag, names.map((n) => new RegExp(`\\p{Script=${n}}`, 'gu'))]);

const LATIN = /\p{Script=Latin}/gu;
// Fast path: Common (digits, spaces, punctuation, symbols) and Inherited
// (combining marks) belong to whatever they sit beside, so a string made only
// of those plus Latin has nothing to tag. This bails on essentially every note,
// domain, era and citation in the corpus in one scan, which is what keeps 6,282
// pages × ~40 fields from each paying for a walk of the whole script table.
const NON_LATIN = /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;

const count = (s, res) => res.reduce((n, re) => n + ((s.match(re) || []).length), 0);

/**
 * The dominant writing system of a text run, as a BCP-47 script subtag.
 *
 * Dominant, not merely present: a mostly-English string with a parenthetical
 * gloss stays untagged, because tagging the whole element would hand the
 * English to a Greek voice — a worse outcome than inheriting "en". Elements
 * that mix scripts evenly get marked per run by the caller instead.
 *
 * @param {string} text  unescaped text content of one element
 * @returns {string|null} e.g. 'und-Arab'; null for Latin, digits, or empty
 */
function scriptSubtagOf(text) {
  const s = String(text == null ? '' : text);
  if (!s || !NON_LATIN.test(s)) return null;
  let tag = null;
  let best = count(s, [LATIN]);   // Latin competes; ties go to it, hence >
  let kana = 0;
  for (const [t, res] of SCRIPTS) {
    const n = count(s, res);
    if (t === 'Jpan') kana = n;
    if (n > best) { best = n; tag = t; }
  }
  // Han beside kana is Japanese, not Chinese — a synthesizer told und-Hani
  // reads 天照 with a Mandarin voice inside a Japanese name.
  if (tag === 'Hani' && kana > 0) tag = 'Jpan';
  return tag ? `und-${tag}` : null;
}

/**
 * The same, ready to splice into a start tag: ' lang="und-Arab"' or ''. Subtags
 * come from the fixed table above, so there is nothing here to escape.
 * @param {string} text  unescaped text content of one element
 * @returns {string}
 */
const langAttr = (text) => {
  const tag = scriptSubtagOf(text);
  return tag ? ` lang="${tag}"` : '';
};

// A stretch of non-Latin text standing as its own word or words. Spaces, digits
// and punctuation may sit inside it, but a Latin letter pressed against either
// end means this is a transliteration character inside a Latin word — "Qλdãns",
// "Bakъ", "Gӏal", all of which the corpus really contains — and not a switch of
// language. Switching a synthesizer's voice for one letter mid-word is worse
// than not switching at all, so the lookarounds exclude exactly that case.
const NL = '[^\\p{Script=Latin}\\p{Script=Common}\\p{Script=Inherited}]';
const RUNS = new RegExp(
  `(?<!\\p{Script=Latin})${NL}(?:[\\p{Script=Common}\\p{Script=Inherited}]*${NL})*(?!\\p{Script=Latin})`, 'gu');

/**
 * Wrap each non-Latin run inside otherwise-Latin text in its own <span lang>.
 *
 * For the case scriptSubtagOf() deliberately refuses: a native name glossed
 * inside English prose — "Гьорол эбел, the Mother of the Wind, is one of the
 * four personified Mothers…" — where no single script dominates the element, so
 * tagging the element would hand the English to a Cyrillic voice. WCAG 3.1.2 is
 * about passages, and an inline foreign word is exactly the passage it means.
 *
 * Takes ALREADY-ESCAPED text and only inserts <span>, so it cannot split an
 * entity: every entity this codebase emits is pure ASCII, and ASCII never falls
 * inside a non-Latin run.
 *
 * @param {string} escapedText  HTML-escaped text content
 * @returns {string} the same text with non-Latin runs wrapped
 */
const markRuns = (escapedText) => String(escapedText == null ? '' : escapedText)
  .replace(RUNS, (run) => {
    const l = langAttr(run);
    return l ? `<span${l}>${run}</span>` : run;
  });

module.exports = { scriptSubtagOf, langAttr, markRuns };
