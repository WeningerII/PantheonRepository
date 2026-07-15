/* Pantheon Registry — citation link resolver (Tier 1).
 *
 * Turns a citation reference string (e.g. "Apollod. 2.4.1", "Rigveda 10.14",
 * "Vansina, Jan. The Children of Woot. 1978.") into a URL that lets a reader
 * follow the source, or null when the reference is not something we can point
 * at (a vague descriptor, an inscription, a bare etymology).
 *
 * Design guarantees (Tier 1):
 *   - Deep links target ONLY hosts + URL schemes verified to exist
 *     (Theoi Classical Texts, sacred-texts.com, BibleGateway, quran.com).
 *   - Everything else that still looks like a real source resolves to a SEARCH
 *     URL (Wikipedia / Wikisource / Google Books / Google Scholar / archive.org).
 *     A search endpoint returns 200 whether or not the item is found, so these
 *     links cannot 404 — they are a "find this source" affordance, never a
 *     claimed deep link.
 *   - Pure + deterministic: no network, no Date, no randomness. Same input
 *     always yields the same output, so the static build stays reproducible.
 *
 * Dual-mode: assigns window.PRCite in the browser (inlined as a classic
 * <script> by build.py, before the JSX) AND exports { citeUrl, citeSegments }
 * under CommonJS (require()d by scripts/build-static.cjs and the unit test).
 */
(function () {
  'use strict';

  // ---- text helpers -------------------------------------------------------
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // fold diacritics
      .replace(/\s+/g, ' ')
      .trim();
  }
  function enc(s) { return encodeURIComponent(String(s)); }
  // plus-encoded query for search endpoints (space -> '+'); keeps UTF-8 diacritics
  function plusQuery(s) {
    return encodeURIComponent(String(s).replace(/\s+/g, ' ').trim()).replace(/%20/g, '+');
  }

  // ---- guards: strings that are NOT a citable work ------------------------
  // If any of these appear, the segment is etymology / linguistic
  // reconstruction / raw material culture — do not link it.
  // NB: no bare "tablet" here — Mesopotamian epics (Enuma Elish, Gilgamesh,
  // Atrahasis) are cited by tablet; genuine clay/Linear-B tablet references are
  // still caught by "inscription", "excavated", or "linear a/b".
  var KILL = /\b(?:weekday|cognates?|reconstructed|folk[- ]etymolog\w*|baptismal\s+vow|inscriptions?|stel(?:e|a|es|ae)|excavated|ostrac\w*|graffit\w*|linear\s+[ab]\b|proto-[a-z]|place-?names?|toponym\w*)\b/i;
  var VAGUE = /\b(?:throughout|various(?:ly)?|passim|oral\s+tradition|corpus|generally|widespread|numerous|scattered|unattested|and\s+elsewhere)\b/i;

  // Bible: many book names are common English words/first-names ("John",
  // "Mark", "Numbers", "Job", "Acts"), so a book only counts as scripture when
  // it is immediately followed by a chapter number. Captures the passage so we
  // hand BibleGateway a clean "Book chap:verse" rather than the whole segment.
  var BIBLE_PASSAGE = /\b((?:(?:1|2|3|i|ii|iii)\s+)?(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalms?|proverbs|ecclesiastes|song of songs|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)\s+\d+(?::\d+(?:[-–]\d+)?)?)/i;

  // ---- classical Greek & Roman primary sources ----------------------------
  // type 'theoiBook': deep-link the cited BOOK on Theoi (base{N}.html), clamped
  //   to a verified max; falls back to base1.html landing when out of range.
  // type 'theoiFlat': single verified landing page (no per-book split).
  // type 'wiki': Wikipedia Special:Search on `q` (cannot 404) — used where the
  //   text is not on Theoi or the book files were not verified.
  // Keys are author-anchored so a deep link never resolves to the wrong author.
  var CLASSICAL = [
    { type: 'theoiBook', base: 'Apollodorus', max: 3, epitome: true,
      keys: ['apollod.', 'apollodorus', 'ps.-apollodorus', 'pseudo-apollodorus'] },
    { type: 'theoiBook', base: 'HomerIliad', max: 24,
      keys: ['hom. il.', 'homer iliad', 'homer, iliad', 'iliad', 'il.'] },
    { type: 'theoiBook', base: 'HomerOdyssey', max: 24,
      keys: ['hom. od.', 'homer odyssey', 'homer, odyssey', 'odyssey', 'od.'] },
    { type: 'theoiBook', base: 'OvidMetamorphoses', max: 15,
      keys: ['ov. met.', 'ovid metamorphoses', 'ovid, metamorphoses'] },
    { type: 'theoiBook', base: 'ApolloniusRhodius', max: 4,
      keys: ['ap. rhod.', 'a.r.', 'apoll. rhod.', 'apollonius rhodius', 'apollonius argonautica', 'apollonius', 'argonautica'] },
    { type: 'theoiBook', base: 'QuintusSmyrnaeus', max: 14,
      keys: ['q.s.', 'quint. smyrn.', 'quintus smyrnaeus', 'posthomerica', 'fall of troy'] },
    { type: 'theoiFlat', file: 'HesiodTheogony',
      keys: ['hes. theog.', 'hesiod theogony', 'theogony', 'theog.'] },
    { type: 'theoiFlat', file: 'HesiodWorksDays',
      keys: ['hes. op.', 'hesiod works and days', 'works and days', 'works & days'] },
    { type: 'theoiFlat', file: 'HesiodShield',
      keys: ['hes. sc.', 'shield of heracles', 'aspis'] },
    { type: 'theoiFlat', file: 'HyginusFabulae1',
      keys: ['hyg. fab.', 'hyginus fabulae', 'fabulae'] },
    { type: 'theoiFlat', file: 'HomericHymns1',
      keys: ['hom. hymn', 'homeric hymn', 'homeric hymns'] },
    // Wikipedia search (verified not to 404 by construction)
    { type: 'wiki', q: 'Hesiod', keys: ['hes.', 'hesiod'] },
    { type: 'wiki', q: 'Homer', keys: ['hom.', 'homer'] },
    { type: 'wiki', q: 'Pausanias Description of Greece', keys: ['paus.', 'pausanias', 'periegesis', 'description of greece'] },
    { type: 'wiki', q: 'Pindar', keys: ['pind.', 'pindar', 'pyth.', 'ol.', 'nem.', 'isth.', 'pythian ode', 'olympian ode', 'nemean ode', 'isthmian ode'] },
    { type: 'wiki', q: 'Aeneid', keys: ['verg. aen.', 'virgil aeneid', 'aeneid', 'aen.', 'aeneis'] },
    { type: 'wiki', q: 'Georgics', keys: ['verg. g.', 'georgics', 'georgica'] },
    { type: 'wiki', q: 'Ovid Fasti', keys: ['ov. fast.', 'ovid fasti', 'fasti', 'fast.'] },
    { type: 'wiki', q: 'Diodorus Siculus Library of History', keys: ['diod.', 'diodorus', 'diod. sic.', 'd.s.', 'bibliotheca historica', 'library of history'] },
    { type: 'wiki', q: 'Strabo Geography', keys: ['strab.', 'strabo', 'geographica'] },
    { type: 'wiki', q: 'Herodotus Histories', keys: ['hdt.', 'herodotus', 'herod.'] },
    { type: 'wiki', q: 'Euripides', keys: ['eur.', 'euripides'] },
    { type: 'wiki', q: 'Aeschylus', keys: ['aesch.', 'aeschylus'] },
    { type: 'wiki', q: 'Sophocles', keys: ['soph.', 'sophocles'] },
    { type: 'wiki', q: 'Callimachus', keys: ['callim.', 'callimachus'] },
    { type: 'wiki', q: 'Plutarch Parallel Lives', keys: ['plut.', 'plutarch', 'moralia'] },
    { type: 'wiki', q: 'Cicero De Natura Deorum', keys: ['cic.', 'cicero', 'de natura deorum'] },
    { type: 'wiki', q: 'Livy Ab Urbe Condita', keys: ['liv.', 'livy', 'livius', 'ab urbe condita'] },
    { type: 'wiki', q: 'Statius Thebaid', keys: ['stat.', 'statius', 'thebaid', 'theb.', 'achilleid'] },
    { type: 'wiki', q: 'Dionysiaca Nonnus', keys: ['nonn.', 'nonnus', 'dionysiaca', 'dion.'] },
    { type: 'wiki', q: 'Aelian On the Nature of Animals', keys: ['ael.', 'aelian', 'de natura animalium', 'varia historia'] },
    { type: 'wiki', q: 'Catasterismi', keys: ['eratosth.', 'eratosthenes', 'catasterismi', 'catast.'] },
    { type: 'wiki', q: 'Justin (historian)', keys: ['just.', 'justin', 'justinus', 'pompeius trogus'] },
    { type: 'wiki', q: 'Proclus Chrestomathia', keys: ['procl.', 'proclus', 'chrestomathia', 'chrest.'] },
    { type: 'wiki', q: 'Orphic Hymns', keys: ['orph. hymn', 'orphic hymn', 'orphic hymns'] },
    { type: 'wiki', q: 'Antoninus Liberalis Metamorphoses', keys: ['ant. lib.', 'antoninus liberalis'] },
    { type: 'wiki', q: 'Hyginus De Astronomica', keys: ['hyg. astr.', 'astronomica', 'poetica astronomica', 'de astronomia'] },
    { type: 'wiki', q: 'Cassius Dio Roman History', keys: ['cassius dio', 'cass. dio', 'dio cassius', 'dio. cass.'] },
    { type: 'wiki', q: 'Velleius Paterculus', keys: ['velleius paterculus', 'vell. pat.', 'velleius'] },
    { type: 'wiki', q: 'Dionysius of Halicarnassus Roman Antiquities', keys: ['dionysius of halicarnassus', 'dion. hal.', 'dionysius halicarnassus', 'dion. halic.'] },
    { type: 'wiki', q: 'Sima Qian Records of the Grand Historian', keys: ['sima qian', 'shiji', 'shih chi', 'records of the grand historian'] },
    { type: 'wiki', q: 'Valerius Flaccus Argonautica', keys: ['valerius flaccus', 'val. fl.'] },
    { type: 'wiki', q: 'Lucan Pharsalia', keys: ['lucan', 'pharsalia', 'bellum civile'] }
  ];

  // ---- scripture & canonical sacred / epic texts --------------------------
  // type 'st': sacred-texts.com index dir/file (verified). type 'bible':
  // BibleGateway passage search. type 'quran': quran.com deep link. type
  // 'wiki'/'wikisource': search endpoints (cannot 404).
  var SCRIPTURE = [
    { type: 'st', path: 'hin/rigveda/', keys: ['rigveda', 'rig veda', 'rig-veda', 'rgveda'] },
    { type: 'st', path: 'hin/maha/', keys: ['mahabharata', 'maha-bharata', 'mbh.', 'mbh ', 'adi parva', 'sabha parva', 'vana parva', 'aranyaka parva', 'virata parva', 'udyoga parva', 'bhishma parva', 'drona parva', 'karna parva', 'shalya parva', 'sauptika parva', 'stri parva', 'shanti parva', 'anushasana parva', 'mausala parva', 'harivamsa'] },
    { type: 'st', path: 'hin/rama/', keys: ['ramayana', 'valmiki ramayana', 'bala kanda', 'ayodhya kanda', 'aranya kanda', 'kishkindha kanda', 'sundara kanda', 'yuddha kanda', 'uttara kanda'] },
    { type: 'st', path: 'hin/gita/', keys: ['bhagavad gita', 'bhagavad-gita', 'bhagavadgita'] },
    { type: 'st', path: 'zor/', keys: ['avesta', 'zend-avesta', 'zend avesta', 'yasna', 'yasht', 'vendidad', 'videvdat', 'bundahishn'] },
    { type: 'st', path: 'neu/poe/', keys: ['poetic edda', 'elder edda', 'saemundar edda', 'voluspa', 'havamal', 'grimnismal', 'vafthrudnismal', 'lokasenna', 'skirnismal', 'baldrs draumar', 'rigsthula', 'hymiskvida', 'thrymskvida'] },
    { type: 'st', path: 'neu/pre/', keys: ['prose edda', 'younger edda', 'snorra edda', 'gylfaginning', 'skaldskaparmal'] },
    { type: 'st', path: 'neu/heim/', keys: ['heimskringla', 'ynglinga saga'] },
    { type: 'st', path: 'neu/celt/mab/', keys: ['mabinogion', 'mabinogi', 'four branches', 'pwyll', 'branwen', 'manawydan', 'culhwch'] },
    { type: 'st', file: 'ane/enuma.htm', keys: ['enuma elish', 'enuma elis', 'when on high', 'babylonian creation epic', 'epic of creation'] },
    { type: 'st', path: 'egy/ebod/', keys: ['book of the dead', 'egyptian book of the dead', 'book of going forth by day', 'papyrus of ani', 'pert em hru'] },
    { type: 'quran', keys: ["qur'an", 'quran', 'koran', 'al-quran', 'al quran', 'the noble quran', 'surah'] },
    { type: 'wikisource', keys: ['sama veda', 'samaveda', 'yajurveda', 'yajur veda', 'atharvaveda', 'atharva veda'] },
    { type: 'wiki', keys: ['upanishad', 'upanisad', 'isha upanishad', 'katha upanishad', 'chandogya upanishad', 'brihadaranyaka', 'kena upanishad', 'mundaka upanishad'] },
    { type: 'wiki', keys: ['purana', 'bhagavata purana', 'srimad bhagavatam', 'vishnu purana', 'shiva purana', 'markandeya purana', 'devi mahatmya', 'harivamsa', 'skanda purana', 'matsya purana', 'linga purana'] },
    { type: 'wikisource', keys: ['kojiki', 'records of ancient matters'] },
    { type: 'wikisource', keys: ['nihon shoki', 'nihongi', 'chronicles of japan'] },
    { type: 'wiki', keys: ['popol vuh', 'popol wuj'] },
    { type: 'wiki', keys: ['epic of gilgamesh', 'gilgamesh'] },
    { type: 'wiki', keys: ['atrahasis', 'atra-hasis'] },
    { type: 'wiki', keys: ['pyramid texts', 'coffin texts'] },
    { type: 'wikisource', keys: ['kalevala'] },
    { type: 'wikisource', keys: ['tao te ching', 'daodejing', 'dao de jing', 'tao teh king'] },
    { type: 'wiki', keys: ['shanhaijing', 'shan hai jing', 'classic of mountains and seas'] },
    { type: 'wiki', keys: ['tain bo cuailnge', 'cattle raid of cooley', 'lebor gabala', 'book of invasions'] },
    { type: 'wiki', keys: ['shahnameh', 'shahnama', 'book of kings'] },
    { type: 'wiki', keys: ['secret history of the mongols'] }
  ];

  // Flatten to [{key, entry}] sorted longest-key-first so the most specific
  // match wins (e.g. "hom. il." beats "il.", "bhagavad gita" beats nothing).
  function flatten(table) {
    var out = [];
    for (var i = 0; i < table.length; i++) {
      var e = table[i];
      for (var j = 0; j < e.keys.length; j++) out.push({ key: norm(e.keys[j]), entry: e });
    }
    out.sort(function (a, b) { return b.key.length - a.key.length; });
    return out;
  }
  var CLASSICAL_KEYS = flatten(CLASSICAL);
  var SCRIPTURE_KEYS = flatten(SCRIPTURE);

  // A key matches when the normalized head begins with it at a word boundary
  // (so "il." matches "il. 2.1" but not "iliad", and "od." matches "od." only).
  function headMatches(head, key) {
    if (head.indexOf(key) !== 0) return false;
    var after = head.charAt(key.length);
    return after === '' || !/[a-z0-9]/.test(after);
  }
  // A distinctive long key (>=7 chars, e.g. "gylfaginning", "mahabharata")
  // may match anywhere in the head at a word boundary, so "Snorri Sturluson,
  // Gylfaginning" resolves via the mapped work even though the author leads.
  // Short keys ("od.", "il.", "hom.") stay prefix-anchored to avoid collisions.
  function headContains(head, key) {
    var idx = head.indexOf(key);
    while (idx !== -1) {
      var before = idx === 0 ? '' : head.charAt(idx - 1);
      var after = head.charAt(idx + key.length);
      if ((before === '' || !/[a-z0-9]/.test(before)) && (after === '' || !/[a-z0-9]/.test(after))) return true;
      idx = head.indexOf(key, idx + 1);
    }
    return false;
  }
  function matchTable(flat, head) {
    for (var i = 0; i < flat.length; i++) {
      var k = flat[i].key;
      if (k.length >= 7 ? headContains(head, k) : headMatches(head, k)) return flat[i].entry;
    }
    return null;
  }

  // ---- split a (possibly compound) reference into work segments -----------
  // Split on ';' only — commas chain locators inside one work
  // ("Apollod. 2.2.1, 2.4.1-4" is ONE work).
  function splitSegments(ref) {
    return String(ref).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // Strip a trailing locator + descriptive parentheticals to get the linkable
  // head; keep the (possibly empty) locator for book deep-linking.
  var NUMREF = '\\d+(?:\\.\\d+)*(?:[\\u2013-]\\d+(?:\\.\\d+)*)?';
  var LOCWORD = '(?:fr\\.|frr\\.|frag(?:ment)?s?\\.?|ch\\.|chap\\.|cap\\.|v\\.|vv\\.|ll?\\.|lines?|book|bk\\.|no\\.|\\u00a7+|pp\\.|p\\.|col\\.|rune|tablet|spell|hymn)';
  var SIGIL = '(?:\\s+(?:M-?W|D-?K|S-?M|K-?A|TrGF|PMGF?|SLG|SM|West|Bernab\\u00e9|Snell(?:-Maehler)?|Voigt|Radt|Diehl|Kock))';
  // The locator must begin at a word boundary (start or whitespace) so the
  // leading LOCWORD ("l." etc.) can't match the "l." inside a work abbreviation
  // like "Il." (Iliad) and swallow half the head.
  var LOCATOR_RE = new RegExp('(?:^|\\s)(?:' + LOCWORD + '\\s*)?' + NUMREF + '(?:\\s*[,\\s]\\s*' + NUMREF + ')*' + SIGIL + '?\\s*$', 'i');

  function headLocator(seg) {
    var s = seg.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    var locator = '';
    var m = s.match(LOCATOR_RE);
    if (m && m.index > 0) { locator = m[0].trim(); s = s.slice(0, m.index); }
    // Strip trailing whitespace/commas/colons but KEEP a trailing period — the
    // classical keys are author abbreviations that end in one ("apollod.").
    var head = s.replace(/[\s,;:]+$/, '').trim();
    return { head: head, locator: locator };
  }

  function firstBookNumber(locator) {
    var m = String(locator).match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }

  // ---- URL builders per source family -------------------------------------
  function theoiUrl(entry, locator, seg) {
    if (entry.type === 'theoiFlat') return 'https://www.theoi.com/Text/' + entry.file + '.html';
    // theoiBook
    if (entry.epitome && /(?:^|\s)(?:epit(?:ome)?\.?|E\.?\s*\d)/i.test(seg)) {
      return 'https://www.theoi.com/Text/' + entry.base + 'E.html';
    }
    var n = firstBookNumber(locator);
    if (!n || n < 1 || n > entry.max) n = 1;
    return 'https://www.theoi.com/Text/' + entry.base + n + '.html';
  }
  function wikiSearch(q) {
    return 'https://en.wikipedia.org/wiki/Special:Search?search=' + plusQuery(q) + '&go=Go';
  }
  function wikisourceSearch(q) {
    return 'https://en.wikisource.org/wiki/Special:Search?search=' + plusQuery(q) + '&go=Go';
  }
  function sacredText(entry) {
    return 'https://www.sacred-texts.com/' + (entry.path || entry.file);
  }
  function bibleGateway(seg) {
    return 'https://www.biblegateway.com/passage/?search=' + enc(seg.replace(/\s+/g, ' ').trim()) + '&version=KJV';
  }
  function quranUrl(seg) {
    var m = seg.match(/(\d{1,3})\s*[:.]\s*(\d{1,3})/);
    if (m) return 'https://quran.com/' + parseInt(m[1], 10) + '/' + parseInt(m[2], 10);
    var m2 = seg.match(/\b(?:surah|sura|chapter)\s+(\d{1,3})/i);
    if (m2) return 'https://quran.com/' + parseInt(m2[1], 10);
    return 'https://quran.com';
  }

  // ---- best-effort search fallback for modern books / journal articles ----
  function firstSurname(s) {
    // "Surname, Given" -> Surname
    var m = s.match(/^\s*([A-ZÀ-Þ][\p{L}'’-]+)\s*,/u);
    if (m) return m[1];
    // "J. M. Surname," / "F. Landa Surname" -> Surname (skip leading initials)
    var m2 = s.match(/^\s*(?:[A-ZÀ-Þ]\.?\s+){1,3}([A-ZÀ-Þ][\p{L}'’-]{2,})/u);
    return m2 ? m2[1] : '';
  }
  function bookQuery(s) {
    var t = s
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\bpp?\.\s*\d+(?:\s*[–-]\s*\d+)?/gi, ' ')
      .replace(/\bvol\.?\s*\d+/gi, ' ').replace(/\bno\.?\s*\d+/gi, ' ')
      .replace(/\b\d{1,3}\/\d{1,3}\b/g, ' ')
      .replace(/\b(1[5-9]\d{2}|20[0-2]\d)\b/g, ' ')
      .replace(/\b(?:press|university|univ|publishers?|verlag|routledge|brill|macmillan|blackwell|thames(?:\s+&?\s*hudson)?|penguin|clarendon|cornell|harvard|yale|princeton|chicago|oxford|cambridge|madison|london|new york|berlin|paris|leiden|boston|editions?|éditions)\b/gi, ' ')
      .replace(/[.,;:"“”]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
    var words = t.split(' ').filter(Boolean).slice(0, 12);
    return words.length >= 2 ? words.join(' ') : null;
  }
  function searchFallback(seg) {
    var s = seg.trim();
    if (s.length < 8) return null;
    var quoted = s.match(/["“”'‘’]([^"“”'‘’]{8,})["“”'‘’]/);
    var journalish = /\b(journal|folklore|review|studies|quarterly|bulletin|zeitschrift|revue|anthropos|ethnos|numen|proceedings|annals)\b/i.test(s)
      || /\b\d{1,3}\s*\(\s*(?:19|20)\d{2}\s*\)\s*[:,]\s*\d+/.test(s)
      || /,\s*(?:19|20)\d{2}\s*,\s*pp?\.\s*\d/.test(s);
    var hasYear = /\b(?:1[5-9]\d{2}|20[0-2]\d)\b/.test(s);
    var scholarly = hasYear || quoted
      || /\b(?:press|university|univ\.|verlag|routledge|brill|macmillan|éditions|editions|museum bulletin|memoir)\b/i.test(s)
      // "Surname, Given" OR "J. M. Surname," (initials-first author)
      || /^[A-ZÀ-Þ][\p{L}'’.-]+,\s+[A-ZÀ-Þ]/u.test(s)
      || /^(?:[A-ZÀ-Þ]\.\s*){1,3}[A-ZÀ-Þ][\p{L}'’-]+[,\s]/u.test(s)
      // a cited-work locator (colonial chronicles etc.: "Cobo Bk. XII", "Cieza Pt. II Ch. 5")
      || /\b(?:Bk\.|Book\s+[IVXLC0-9]|Ch\.|Chap\.|Pt\.|Part\s+[IVXLC0-9]|vol\.|s\.v\.)\b/.test(s);
    if (!scholarly) return null;
    if (quoted && journalish) {
      var q = '"' + quoted[1] + '"';
      var sn = firstSurname(s);
      if (sn) q += ' ' + sn;
      return 'https://scholar.google.com/scholar?q=' + plusQuery(q);
    }
    var bq = bookQuery(s);
    if (!bq) return null;
    var preScan = /\b(?:1[5-8]\d{2}|19[0-2]\d)\b/.test(s) && !/\b(?:19[3-9]\d|20[0-2]\d)\b/.test(s);
    return preScan
      ? 'https://archive.org/search?query=' + plusQuery(bq)
      : 'https://www.google.com/search?tbm=bks&q=' + plusQuery(bq);
  }

  // ---- resolve one segment ------------------------------------------------
  function resolveSegment(seg) {
    if (!seg || KILL.test(seg) || VAGUE.test(seg)) return null;
    var hl = headLocator(seg);
    if (!hl.head) return null;
    var head = norm(hl.head);
    if (head.length < 2) return null;

    var c = matchTable(CLASSICAL_KEYS, head);
    if (c) {
      if (c.type === 'wiki') return wikiSearch(c.q);
      return theoiUrl(c, hl.locator, seg);
    }
    var sc = matchTable(SCRIPTURE_KEYS, head);
    if (sc) {
      if (sc.type === 'st') return sacredText(sc);
      if (sc.type === 'quran') return quranUrl(seg);
      if (sc.type === 'wikisource') return wikisourceSearch(hl.head);
      if (sc.type === 'wiki') return wikiSearch(hl.head);
    }
    var bib = seg.match(BIBLE_PASSAGE);
    if (bib) return bibleGateway(bib[1]);
    return searchFallback(seg);
  }

  // ---- public API ---------------------------------------------------------
  // citeUrl: the URL of the FIRST resolvable work in the reference, or null.
  function citeUrl(ref) {
    if (typeof ref !== 'string') return null;
    var segs = splitSegments(ref);
    for (var i = 0; i < segs.length; i++) {
      var u = resolveSegment(segs[i]);
      if (u) return u;
    }
    return null;
  }
  // citeSegments: [{ text, url }] per ';'-separated work (url may be null),
  // for renderers that want to link each cited work individually.
  function citeSegments(ref) {
    if (typeof ref !== 'string' || !ref) return [{ text: String(ref == null ? '' : ref), url: null }];
    var segs = splitSegments(ref);
    if (!segs.length) return [{ text: ref, url: null }];
    return segs.map(function (seg) { return { text: seg, url: resolveSegment(seg) }; });
  }

  var api = { citeUrl: citeUrl, citeSegments: citeSegments };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.PRCite = api;
})();
