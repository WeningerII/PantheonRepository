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

  // Verified named-work links from the source-research pass: deep full-text
  // homes (sacred-texts, Wikisource, Theoi, SuttaCentral, ETCSL...) where
  // confirmed to exist, else a cannot-404 Wikipedia/Wikisource search.
  var EXTRA_KEYS = [
    { key: "roman inscriptions of britain", url: "https://en.wikipedia.org/wiki/Special:Search?search=Roman%20Inscriptions%20of%20Britain%20Collingwood&go=Go" },
    { key: "encyclopedia of new zealand", url: "https://en.wikipedia.org/wiki/Special:Search?search=Te%20Ara%20Encyclopedia%20of%20New%20Zealand&go=Go" },
    { key: "мифологическая энциклопедия", url: "https://en.wikipedia.org/wiki/Special:Search?search=Myths%20of%20the%20Peoples%20of%20the%20World&go=Go" },
    { key: "suomen kansan vanhat runot", url: "https://en.wikipedia.org/wiki/Special:Search?search=Suomen%20Kansan%20Vanhat%20Runot&go=Go" },
    { key: "homeric hymn to aphrodite", url: "https://www.theoi.com/Text/HomericHymns3.html" },
    { key: "chothe thangwai pakhangba", url: "https://en.wikipedia.org/wiki/Special:Search?search=Chothe+Thangwai+Pakhangba&go=Go" },
    { key: "mythological encyclopedia", url: "https://en.wikipedia.org/wiki/Special:Search?search=Myths%20of%20the%20Peoples%20of%20the%20World&go=Go" },
    { key: "russian primary chronicle", url: "https://en.wikipedia.org/wiki/Special:Search?search=Primary%20Chronicle&go=Go" },
    { key: "encyclopaedia britannica", url: "https://en.wikipedia.org/wiki/Special:Search?search=Encyclopaedia%20Britannica&go=Go" },
    { key: "nuosu origin narratives", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bamo%20Qubumo%20Nuosu%20Origin%20Narratives&go=Go" },
    { key: "etruscan bronze mirror", url: "https://en.wikipedia.org/wiki/Special:Search?search=Etruskische%20Spiegel%20Gerhard&go=Go" },
    { key: "encyclopaedia iranica", url: "https://en.wikipedia.org/wiki/Special:Search?search=Encyclopaedia%20Iranica&go=Go" },
    { key: "folklore del paraguay", url: "https://en.wikipedia.org/wiki/Special:Search?search=Dionisio%20Gonz%C3%A1lez%20Torres%20Folklore%20del%20Paraguay&go=Go" },
    { key: "historia de los incas", url: "https://en.wikisource.org/wiki/Special:Search?search=History%20of%20the%20Incas%20Sarmiento%20de%20Gamboa&go=Go" },
    { key: "dhammapada-aṭṭhakathā", url: "https://en.wikipedia.org/wiki/Special:Search?search=Dhammapada%20Atthakatha&go=Go" },
    { key: "dhammapada-atthakatha", url: "https://en.wikipedia.org/wiki/Special:Search?search=Dhammapada%20Atthakatha&go=Go" },
    { key: "dhammapada commentary", url: "https://en.wikipedia.org/wiki/Special:Search?search=Dhammapada%20Atthakatha&go=Go" },
    { key: "descent to the nether", url: "https://etcsl.orinst.ox.ac.uk/section1/tr141.htm" },
    { key: "trioedd ynys prydein", url: "https://en.wikipedia.org/wiki/Special:Search?search=Trioedd%20Ynys%20Prydein&go=Go" },
    { key: "serglige con culainn", url: "https://en.wikipedia.org/wiki/Special:Search?search=Serglige%20Con%20Culainn&go=Go" },
    { key: "histoyre du mechique", url: "https://en.wikipedia.org/wiki/Special:Search?search=Histoyre%20du%20Mechique&go=Go" },
    { key: "leyenda de los soles", url: "https://en.wikipedia.org/wiki/Special:Search?search=Leyenda%20de%20los%20Soles&go=Go" },
    { key: "compert con culainn", url: "https://en.wikipedia.org/wiki/Special:Search?search=Compert%20Con%20Culainn&go=Go" },
    { key: "compert con culaind", url: "https://en.wikipedia.org/wiki/Special:Search?search=Compert%20Con%20Culainn&go=Go" },
    { key: "sarmiento de gamboa", url: "https://en.wikisource.org/wiki/Special:Search?search=History%20of%20the%20Incas%20Sarmiento%20de%20Gamboa&go=Go" },
    { key: "magic lotus lantern", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bao+Lian+Deng+Magic+Lotus+Lantern&go=Go" },
    { key: "codex vindobonensis", url: "https://en.wikipedia.org/wiki/Special:Search?search=Codex%20Vindobonensis%20Mexicanus&go=Go" },
    { key: "amenhotep iii birth", url: "https://en.wikipedia.org/wiki/Special:Search?search=Amenhotep%20III%20divine%20birth%20Luxor%20Temple&go=Go" },
    { key: "etruskische spiegel", url: "https://en.wikipedia.org/wiki/Special:Search?search=Etruskische%20Spiegel%20Gerhard&go=Go" },
    { key: "battle of the trees", url: "https://sacred-texts.com/neu/celt/fab/index.htm" },
    { key: "treaty of naram-sin", url: "https://en.wikipedia.org/wiki/Special:Search?search=Treaty+of+Naram-Sin+Elam&go=Go" },
    { key: "cheonjiwang bonpuri", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cheonjiwang+Bonpuri&go=Go" },
    { key: "sumerian king list", url: "https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.2.1.1" },
    { key: "cabeço das fráguas", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cabe%C3%A7o%20das%20Fr%C3%A1guas%20inscription&go=Go" },
    { key: "cabeco das fraguas", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cabe%C3%A7o%20das%20Fr%C3%A1guas%20inscription&go=Go" },
    { key: "aided óenfhir aífe", url: "https://en.wikipedia.org/wiki/Special:Search?search=Aided%20%C3%93enfhir%20A%C3%ADfe&go=Go" },
    { key: "aided oenfhir aife", url: "https://en.wikipedia.org/wiki/Special:Search?search=Aided%20%C3%93enfhir%20A%C3%ADfe&go=Go" },
    { key: "assyrian king list", url: "https://en.wikipedia.org/wiki/Special:Search?search=Assyrian%20King%20List&go=Go" },
    { key: "sumerian king list", url: "https://etcsl.orinst.ox.ac.uk/section2/tr211.htm" },
    { key: "estonian mythology", url: "https://en.wikipedia.org/wiki/Special:Search?search=Estonian%20mythology&go=Go" },
    { key: "kingship in heaven", url: "https://en.wikipedia.org/wiki/Special:Search?search=Song%20of%20Kumarbi%20Kingship%20in%20Heaven&go=Go" },
    { key: "piye victory stela", url: "https://en.wikipedia.org/wiki/Special:Search?search=Victory%20stele%20of%20Piye&go=Go" },
    { key: "lludd and llevelys", url: "https://sacred-texts.com/neu/celt/mab/index.htm" },
    { key: "antara ibn shaddad", url: "https://en.wikipedia.org/wiki/Special:Search?search=Sirat%20Antar&go=Go" },
    { key: "marriage of yarikh", url: "https://en.wikipedia.org/wiki/Special:Search?search=Nikkal%20and%20Yarikh&go=Go" },
    { key: "old elamite treaty", url: "https://en.wikipedia.org/wiki/Special:Search?search=Treaty+of+Naram-Sin+Elam&go=Go" },
    { key: "commenta bernensia", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bern+Scholia+Lucan+Commenta+Bernensia&go=Go" },
    { key: "cath maige tuired", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cath%20Maige%20Tuired&go=Go" },
    { key: "movses khorenatsi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Movses%20Khorenatsi&go=Go" },
    { key: "tale of the heike", url: "https://en.wikipedia.org/wiki/Special:Search?search=Heike%20Monogatari&go=Go" },
    { key: "the samoa islands", url: "https://en.wikipedia.org/wiki/Special:Search?search=Augustin%20Kr%C3%A4mer%20Die%20Samoa-Inseln&go=Go" },
    { key: "jāmiʿ al-tawārīkh", url: "https://en.wikipedia.org/wiki/Special:Search?search=Rashid%20al-Din%20Jami%20al-tawarikh&go=Go" },
    { key: "sendai kuji hongi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Sendai%20Kuji%20Hongi%20Kujiki&go=Go" },
    { key: "polo de ondegardo", url: "https://en.wikipedia.org/wiki/Special:Search?search=Polo%20de%20Ondegardo&go=Go" },
    { key: "aided con culainn", url: "https://en.wikipedia.org/wiki/Special:Search?search=Aided+Con+Culainn+Death+of+Cu+Chulainn&go=Go" },
    { key: "мифы народов мира", url: "https://en.wikipedia.org/wiki/Special:Search?search=Myths%20of%20the%20Peoples%20of%20the%20World&go=Go" },
    { key: "yarikh and nikkal", url: "https://en.wikipedia.org/wiki/Special:Search?search=Nikkal%20and%20Yarikh&go=Go" },
    { key: "manchester museum", url: "https://en.wikipedia.org/wiki/Special:Search?search=Koptos+stela+God%27s+Wife+Iset&go=Go" },
    { key: "liver of piacenza", url: "https://en.wikipedia.org/wiki/Special:Search?search=Liver+of+Piacenza&go=Go" },
    { key: "sayakbai karalaev", url: "https://en.wikipedia.org/wiki/Special:Search?search=Sayakbai+Karalaev&go=Go" },
    { key: "lithuanian dainos", url: "https://en.wikipedia.org/wiki/Special:Search?search=Lithuanian+dainos&go=Go" },
    { key: "primary chronicle", url: "https://en.wikipedia.org/wiki/Special:Search?search=Primary%20Chronicle&go=Go" },
    { key: "patmutyun hayots", url: "https://en.wikipedia.org/wiki/Special:Search?search=Movses%20Khorenatsi&go=Go" },
    { key: "heike monogatari", url: "https://en.wikipedia.org/wiki/Special:Search?search=Heike%20Monogatari&go=Go" },
    { key: "judicial papyrus", url: "https://en.wikipedia.org/wiki/Special:Search?search=Judicial%20Papyrus%20of%20Turin&go=Go" },
    { key: "papyrus of turin", url: "https://en.wikipedia.org/wiki/Special:Search?search=Judicial%20Papyrus%20of%20Turin&go=Go" },
    { key: "jami al-tawarikh", url: "https://en.wikipedia.org/wiki/Special:Search?search=Rashid%20al-Din%20Jami%20al-tawarikh&go=Go" },
    { key: "erythraean paean", url: "https://en.wikipedia.org/wiki/Special:Search?search=Erythraean%20Paean%20Asclepius&go=Go" },
    { key: "erythraean paian", url: "https://en.wikipedia.org/wiki/Special:Search?search=Erythraean%20Paean%20Asclepius&go=Go" },
    { key: "wasting sickness", url: "https://en.wikipedia.org/wiki/Special:Search?search=Serglige%20Con%20Culainn&go=Go" },
    { key: "hatshepsut birth", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hatshepsut%20divine%20birth%20Deir%20el-Bahari&go=Go" },
    { key: "encyclopedia.com", url: "https://en.wikipedia.org/wiki/Special:Search?search=Encyclopedia.com&go=Go" },
    { key: "dictys cretensis", url: "https://www.theoi.com/Text/DictysCretensis1.html" },
    { key: "lludd a llefelys", url: "https://sacred-texts.com/neu/celt/mab/index.htm" },
    { key: "scholia on lucan", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bern+Scholia+Lucan+Commenta+Bernensia&go=Go" },
    { key: "inanna's descent", url: "https://etcsl.orinst.ox.ac.uk/section1/tr141.htm" },
    { key: "ystoria taliesin", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ystoria%20Taliesin&go=Go" },
    { key: "gonzález torres", url: "https://en.wikipedia.org/wiki/Special:Search?search=Dionisio%20Gonz%C3%A1lez%20Torres%20Folklore%20del%20Paraguay&go=Go" },
    { key: "saṃyutta nikāya", url: "https://suttacentral.net/sn4.25" },
    { key: "samyutta nikaya", url: "https://suttacentral.net/sn4.25" },
    { key: "erlang bao juan", url: "https://en.wikipedia.org/wiki/Special:Search?search=Erlang%20Baojuan%20precious%20scroll&go=Go" },
    { key: "compert mongáin", url: "https://en.wikipedia.org/wiki/Special:Search?search=Compert%20Mong%C3%A1in&go=Go" },
    { key: "compert mongain", url: "https://en.wikipedia.org/wiki/Special:Search?search=Compert%20Mong%C3%A1in&go=Go" },
    { key: "hymn. hom. aphr", url: "https://www.theoi.com/Text/HomericHymns3.html" },
    { key: "aífe's only son", url: "https://en.wikipedia.org/wiki/Special:Search?search=Aided%20%C3%93enfhir%20A%C3%ADfe&go=Go" },
    { key: "inganji karinga", url: "https://en.wikipedia.org/wiki/Special:Search?search=Alexis%20Kagame&go=Go" },
    { key: "philo of byblos", url: "https://en.wikipedia.org/wiki/Special:Search?search=Philo%20of%20Byblos%20Sanchuniathon&go=Go" },
    { key: "tochmarc étaíne", url: "https://en.wikipedia.org/wiki/Special:Search?search=Tochmarc%20%C3%89ta%C3%ADne&go=Go" },
    { key: "tochmarc etaine", url: "https://en.wikipedia.org/wiki/Special:Search?search=Tochmarc%20%C3%89ta%C3%ADne&go=Go" },
    { key: "wooing of étaín", url: "https://en.wikipedia.org/wiki/Special:Search?search=Tochmarc%20%C3%89ta%C3%ADne&go=Go" },
    { key: "wooing of etain", url: "https://en.wikipedia.org/wiki/Special:Search?search=Tochmarc%20%C3%89ta%C3%ADne&go=Go" },
    { key: "de agri cultura", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cato%20De%20Agri%20Cultura&go=Go" },
    { key: "chothe thangwai", url: "https://en.wikipedia.org/wiki/Special:Search?search=Chothe+Thangwai+Pakhangba&go=Go" },
    { key: "hattusa archive", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hattusa%20Bogazkoy%20archive&go=Go" },
    { key: "kitab al-aghani", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kitab%20al-Aghani&go=Go" },
    { key: "god's wife iset", url: "https://en.wikipedia.org/wiki/Special:Search?search=Koptos+stela+God%27s+Wife+Iset&go=Go" },
    { key: "song of hedammu", url: "https://en.wikipedia.org/wiki/Special:Search?search=Song+of+Hedammu&go=Go" },
    { key: "inana's descent", url: "https://etcsl.orinst.ox.ac.uk/section1/tr141.htm" },
    { key: "sonpi bunmyaku", url: "https://en.wikipedia.org/wiki/Special:Search?search=Sonpi%20Bunmyaku&go=Go" },
    { key: "zouche-nuttall", url: "https://en.wikipedia.org/wiki/Special:Search?search=Codex%20Zouche-Nuttall&go=Go" },
    { key: "narty kaddzhyt", url: "https://en.wikipedia.org/wiki/Special:Search?search=Nart%20saga%20Ossetian&go=Go" },
    { key: "komi mythology", url: "https://en.wikipedia.org/wiki/Special:Search?search=Komi%20mythology&go=Go" },
    { key: "táin bó fraích", url: "https://sacred-texts.com/neu/hroi/hroiv2.htm" },
    { key: "tain bo fraich", url: "https://sacred-texts.com/neu/hroi/hroiv2.htm" },
    { key: "turin judicial", url: "https://en.wikipedia.org/wiki/Special:Search?search=Judicial%20Papyrus%20of%20Turin&go=Go" },
    { key: "erlang baojuan", url: "https://en.wikipedia.org/wiki/Special:Search?search=Erlang%20Baojuan%20precious%20scroll&go=Go" },
    { key: "tochmarc emire", url: "https://en.wikipedia.org/wiki/Special:Search?search=Tochmarc%20Emire&go=Go" },
    { key: "wooing of emer", url: "https://en.wikipedia.org/wiki/Special:Search?search=Tochmarc%20Emire&go=Go" },
    { key: "ragnar lodbrok", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ragnars%20saga%20lo%C3%B0br%C3%B3kar&go=Go" },
    { key: "papyrus harris", url: "https://en.wikipedia.org/wiki/Special:Search?search=Papyrus%20Harris%20I&go=Go" },
    { key: "kitab al-asnam", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ibn%20al-Kalbi%20Kitab%20al-Asnam&go=Go" },
    { key: "dongmyeongwang", url: "https://en.wikipedia.org/wiki/Special:Search?search=Yi%20Gyu-bo%20Dongmyeongwang-pyeon&go=Go" },
    { key: "tale of ragnar", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ragnarssona%20%C3%BE%C3%A1ttr&go=Go" },
    { key: "pakhangba puya", url: "https://en.wikipedia.org/wiki/Special:Search?search=Chothe+Thangwai+Pakhangba&go=Go" },
    { key: "voyage of bran", url: "https://sacred-texts.com/neu/celt/vob/index.htm" },
    { key: "god-list ktu .", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ugaritic%20god%20list%20KTU%201.118&go=Go" },
    { key: "gesta hunnorum", url: "https://en.wikipedia.org/wiki/Special:Search?search=Gesta+Hunnorum+et+Hungarorum+Simon+of+K%C3%A9za&go=Go" },
    { key: "diego de landa", url: "https://sacred-texts.com/nam/maya/ybac/index.htm" },
    { key: "đại việt sử ký", url: "https://en.wikipedia.org/wiki/Special:Search?search=%C4%90%E1%BA%A1i%20Vi%E1%BB%87t%20s%E1%BB%AD%20k%C3%BD%20to%C3%A0n%20th%C6%B0&go=Go" },
    { key: "dai viet su ky", url: "https://en.wikipedia.org/wiki/Special:Search?search=%C4%90%E1%BA%A1i%20Vi%E1%BB%87t%20s%E1%BB%AD%20k%C3%BD%20to%C3%A0n%20th%C6%B0&go=Go" },
    { key: "hanes taliesin", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ystoria%20Taliesin&go=Go" },
    { key: "ugaritic baal", url: "https://en.wikipedia.org/wiki/Special:Search?search=Baal%20Cycle%20Ugaritic&go=Go" },
    { key: "völsunga saga", url: "https://sacred-texts.com/neu/vlsng/index.htm" },
    { key: "volsunga saga", url: "https://sacred-texts.com/neu/vlsng/index.htm" },
    { key: "dhītaro sutta", url: "https://suttacentral.net/sn4.25" },
    { key: "sa'dan-toraja", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hetty%20Nooy-Palm%20Sa%27dan-Toraja&go=Go" },
    { key: "dresden codex", url: "https://en.wikipedia.org/wiki/Special:Search?search=Dresden%20Codex&go=Go" },
    { key: "rashīd al-dīn", url: "https://en.wikipedia.org/wiki/Special:Search?search=Rashid%20al-Din%20Jami%20al-tawarikh&go=Go" },
    { key: "rashid al-din", url: "https://en.wikipedia.org/wiki/Special:Search?search=Rashid%20al-Din%20Jami%20al-tawarikh&go=Go" },
    { key: "tale of mutsu", url: "https://en.wikipedia.org/wiki/Special:Search?search=Mutsu%20Waki&go=Go" },
    { key: "bao lian deng", url: "https://en.wikipedia.org/wiki/Special:Search?search=Baolian%20Deng%20Lotus%20Lantern%20legend&go=Go" },
    { key: "lotus lantern", url: "https://en.wikipedia.org/wiki/Special:Search?search=Baolian%20Deng%20Lotus%20Lantern%20legend&go=Go" },
    { key: "srvandzteants", url: "https://en.wikipedia.org/wiki/Special:Search?search=Garegin%20Srvandztiants&go=Go" },
    { key: "srvandztiants", url: "https://en.wikipedia.org/wiki/Special:Search?search=Garegin%20Srvandztiants&go=Go" },
    { key: "book of idols", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ibn%20al-Kalbi%20Kitab%20al-Asnam&go=Go" },
    { key: "alexis kagame", url: "https://en.wikipedia.org/wiki/Special:Search?search=Alexis%20Kagame&go=Go" },
    { key: "ubucurabwenge", url: "https://en.wikipedia.org/wiki/Special:Search?search=Alexis%20Kagame&go=Go" },
    { key: "sanchuniathon", url: "https://en.wikipedia.org/wiki/Special:Search?search=Philo%20of%20Byblos%20Sanchuniathon&go=Go" },
    { key: "ragnar's sons", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ragnarssona%20%C3%BE%C3%A1ttr&go=Go" },
    { key: "volsunga saga", url: "https://sacred-texts.com/neu/vlsng/index.htm" },
    { key: "bao lian deng", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bao+Lian+Deng+Magic+Lotus+Lantern&go=Go" },
    { key: "vindobonensis", url: "https://en.wikipedia.org/wiki/Special:Search?search=Codex%20Vindobonensis%20Mexicanus&go=Go" },
    { key: "cyfranc lludd", url: "https://sacred-texts.com/neu/celt/mab/index.htm" },
    { key: "book of songs", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kitab%20al-Aghani&go=Go" },
    { key: "sīrat ʿantara", url: "https://en.wikipedia.org/wiki/Special:Search?search=Sirat%20Antar&go=Go" },
    { key: "berne scholia", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bern+Scholia+Lucan+Commenta+Bernensia&go=Go" },
    { key: "simon of keza", url: "https://en.wikipedia.org/wiki/Special:Search?search=Gesta+Hunnorum+et+Hungarorum+Simon+of+K%C3%A9za&go=Go" },
    { key: "simon of kéza", url: "https://en.wikipedia.org/wiki/Special:Search?search=Gesta+Hunnorum+et+Hungarorum+Simon+of+K%C3%A9za&go=Go" },
    { key: "kumarbi cycle", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kumarbi+Cycle&go=Go" },
    { key: "azuma kagami", url: "https://en.wikipedia.org/wiki/Special:Search?search=Azuma%20Kagami&go=Go" },
    { key: "codex zouche", url: "https://en.wikipedia.org/wiki/Special:Search?search=Codex%20Zouche-Nuttall&go=Go" },
    { key: "welsh triads", url: "https://en.wikipedia.org/wiki/Special:Search?search=Trioedd%20Ynys%20Prydein&go=Go" },
    { key: "codex bodley", url: "https://en.wikipedia.org/wiki/Special:Search?search=Codex%20Bodley&go=Go" },
    { key: "oghuz khagan", url: "https://en.wikipedia.org/wiki/Special:Search?search=Oghuz%20Khagan%20epic&go=Go" },
    { key: "madrid codex", url: "https://en.wikipedia.org/wiki/Special:Search?search=Madrid%20Codex%20Maya&go=Go" },
    { key: "ragnars saga", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ragnars%20saga%20lo%C3%B0br%C3%B3kar&go=Go" },
    { key: "baolian deng", url: "https://en.wikipedia.org/wiki/Special:Search?search=Baolian%20Deng%20Lotus%20Lantern%20legend&go=Go" },
    { key: "chimalpopoca", url: "https://en.wikipedia.org/wiki/Special:Search?search=Anales%20de%20Cuauhtitlan%20Codex%20Chimalpopoca&go=Go" },
    { key: "ibn al-kalbi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ibn%20al-Kalbi%20Kitab%20al-Asnam&go=Go" },
    { key: "sanchoniatho", url: "https://en.wikipedia.org/wiki/Special:Search?search=Philo%20of%20Byblos%20Sanchuniathon&go=Go" },
    { key: "bell. trojan", url: "https://www.theoi.com/Text/DictysCretensis1.html" },
    { key: "immram brain", url: "https://sacred-texts.com/neu/celt/vob/index.htm" },
    { key: "agathangelos", url: "https://en.wikipedia.org/wiki/Special:Search?search=Agathangelos+History+of+the+Armenians&go=Go" },
    { key: "piye victory", url: "https://en.wikipedia.org/wiki/Special:Search?search=Victory%20stele%20of%20Piye&go=Go" },
    { key: "koptos stela", url: "https://en.wikipedia.org/wiki/Special:Search?search=Koptos+stela+God%27s+Wife+Iset&go=Go" },
    { key: "bern scholia", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bern+Scholia+Lucan+Commenta+Bernensia&go=Go" },
    { key: "meher kapısı", url: "https://en.wikipedia.org/wiki/Special:Search?search=Meher%20Kap%C4%B1s%C4%B1%20inscription&go=Go" },
    { key: "meher kapisi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Meher%20Kap%C4%B1s%C4%B1%20inscription&go=Go" },
    { key: "oghuz kagan", url: "https://en.wikipedia.org/wiki/Special:Search?search=Oghuz%20Khagan%20epic&go=Go" },
    { key: "diné bahane", url: "https://en.wikipedia.org/wiki/Special:Search?search=Din%C3%A9%20Bahane&go=Go" },
    { key: "dine bahane", url: "https://en.wikipedia.org/wiki/Special:Search?search=Din%C3%A9%20Bahane&go=Go" },
    { key: "bamo qubumo", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bamo%20Qubumo%20Nuosu%20Origin%20Narratives&go=Go" },
    { key: "charachidze", url: "https://en.wikipedia.org/wiki/Special:Search?search=Georges%20Charachidz%C3%A9&go=Go" },
    { key: "sasna tsřer", url: "https://en.wikipedia.org/wiki/Special:Search?search=Daredevils%20of%20Sassoun&go=Go" },
    { key: "sasna tsrer", url: "https://en.wikipedia.org/wiki/Special:Search?search=Daredevils%20of%20Sassoun&go=Go" },
    { key: "jewang ungi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Jewang%20Ungi&go=Go" },
    { key: "yi seunghyu", url: "https://en.wikipedia.org/wiki/Special:Search?search=Jewang%20Ungi&go=Go" },
    { key: "cuauhtitlan", url: "https://en.wikipedia.org/wiki/Special:Search?search=Anales%20de%20Cuauhtitlan%20Codex%20Chimalpopoca&go=Go" },
    { key: "al-iṣfahānī", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kitab%20al-Aghani%20al-Isfahani&go=Go" },
    { key: "al-isfahani", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kitab%20al-Aghani%20al-Isfahani&go=Go" },
    { key: "collingwood", url: "https://en.wikipedia.org/wiki/Special:Search?search=Roman%20Inscriptions%20of%20Britain%20Collingwood&go=Go" },
    { key: "ragnarssona", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ragnarssona%20%C3%BE%C3%A1ttr&go=Go" },
    { key: "horace carm", url: "https://en.wikipedia.org/wiki/Special:Search?search=Horace%20Odes%20Carmina&go=Go" },
    { key: "bacchylides", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bacchylides&go=Go" },
    { key: "bell trojan", url: "https://www.theoi.com/Text/DictysCretensis1.html" },
    { key: "birth cycle", url: "https://en.wikipedia.org/wiki/Special:Search?search=Amenhotep%20III%20divine%20birth%20Luxor%20Temple&go=Go" },
    { key: "hyakurenshō", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hyakurensh%C5%8D&go=Go" },
    { key: "hyakurensho", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hyakurensh%C5%8D&go=Go" },
    { key: "al-isfahani", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kitab%20al-Aghani&go=Go" },
    { key: "sirat antar", url: "https://en.wikipedia.org/wiki/Special:Search?search=Sirat%20Antar&go=Go" },
    { key: "cheonjiwang", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cheonjiwang+Bonpuri&go=Go" },
    { key: "tolkāppiyam", url: "https://en.wikipedia.org/wiki/Special:Search?search=Tolk%C4%81ppiyam&go=Go" },
    { key: "tolkappiyam", url: "https://en.wikipedia.org/wiki/Special:Search?search=Tolk%C4%81ppiyam&go=Go" },
    { key: "mag tuired", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cath%20Maige%20Tuired&go=Go" },
    { key: "khorenatsi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Movses%20Khorenatsi&go=Go" },
    { key: "pali canon", url: "https://suttacentral.net/" },
    { key: "baal cycle", url: "https://en.wikipedia.org/wiki/Special:Search?search=Baal%20Cycle%20Ugaritic&go=Go" },
    { key: "khorenatsi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Movses%20Khorenatsi&go=Go" },
    { key: "rosenfield", url: "https://en.wikipedia.org/wiki/Special:Search?search=The%20Dynastic%20Arts%20of%20the%20Kushans%20Rosenfield&go=Go" },
    { key: "udmurt vos", url: "https://en.wikipedia.org/wiki/Special:Search?search=Udmurt%20Vos&go=Go" },
    { key: "saturnalia", url: "https://en.wikipedia.org/wiki/Special:Search?search=Macrobius%20Saturnalia&go=Go" },
    { key: "mutsu waki", url: "https://en.wikipedia.org/wiki/Special:Search?search=Mutsu%20Waki&go=Go" },
    { key: "kuji hongi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Sendai%20Kuji%20Hongi%20Kujiki&go=Go" },
    { key: "abu simbel", url: "https://en.wikipedia.org/wiki/Special:Search?search=Abu%20Simbel&go=Go" },
    { key: "britannica", url: "https://en.wikipedia.org/wiki/Special:Search?search=Encyclopaedia%20Britannica&go=Go" },
    { key: "hellanicus", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hellanicus%20of%20Lesbos&go=Go" },
    { key: "dongmyeong", url: "https://en.wikipedia.org/wiki/Special:Search?search=Yi%20Gyu-bo%20Dongmyeongwang-pyeon&go=Go" },
    { key: "theocritus", url: "https://www.theoi.com/Text/TheocritusIdylls1.html" },
    { key: "dict. cret", url: "https://www.theoi.com/Text/DictysCretensis1.html" },
    { key: "virsaladze", url: "https://en.wikipedia.org/wiki/Special:Search?search=Elene+Virsaladze&go=Go" },
    { key: "nimuendajú", url: "https://en.wikipedia.org/wiki/Special:Search?search=Curt%20Nimuendaj%C3%BA&go=Go" },
    { key: "nimuendaju", url: "https://en.wikipedia.org/wiki/Special:Search?search=Curt%20Nimuendaj%C3%BA&go=Go" },
    { key: "cad goddeu", url: "https://sacred-texts.com/neu/celt/fab/index.htm" },
    { key: "hinilawod", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hinilawod&go=Go" },
    { key: "sugidanon", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hinilawod&go=Go" },
    { key: "nooy-palm", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hetty%20Nooy-Palm%20Sa%27dan-Toraja&go=Go" },
    { key: "oghuznāme", url: "https://en.wikipedia.org/wiki/Special:Search?search=Oghuz%20Khagan%20epic&go=Go" },
    { key: "oghuzname", url: "https://en.wikipedia.org/wiki/Special:Search?search=Oghuz%20Khagan%20epic&go=Go" },
    { key: "egharevba", url: "https://en.wikipedia.org/wiki/Special:Search?search=Jacob%20Egharevba&go=Go" },
    { key: "lodbrokar", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ragnars%20saga%20lo%C3%B0br%C3%B3kar&go=Go" },
    { key: "macr. sat", url: "https://en.wikipedia.org/wiki/Special:Search?search=Macrobius%20Saturnalia&go=Go" },
    { key: "macrobius", url: "https://en.wikipedia.org/wiki/Special:Search?search=Macrobius%20Saturnalia&go=Go" },
    { key: "king list", url: "https://etcsl.orinst.ox.ac.uk/section2/tr211.htm" },
    { key: "huainanzi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Huainanzi&go=Go" },
    { key: "ondegardo", url: "https://en.wikipedia.org/wiki/Special:Search?search=Polo%20de%20Ondegardo&go=Go" },
    { key: "yi gyu-bo", url: "https://en.wikipedia.org/wiki/Special:Search?search=Yi%20Gyu-bo%20Dongmyeongwang-pyeon&go=Go" },
    { key: "hor. carm", url: "https://en.wikipedia.org/wiki/Special:Search?search=Horace%20Odes%20Carmina&go=Go" },
    { key: "dict cret", url: "https://www.theoi.com/Text/DictysCretensis1.html" },
    { key: "chatelain", url: "https://en.wikipedia.org/wiki/Special:Search?search=H%C3%A9li+Chatelain+Folk-Tales+of+Angola&go=Go" },
    { key: "kat godeu", url: "https://sacred-texts.com/neu/celt/fab/index.htm" },
    { key: "naram-sin", url: "https://en.wikipedia.org/wiki/Special:Search?search=Treaty+of+Naram-Sin+Elam&go=Go" },
    { key: "suludnon", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hinilawod&go=Go" },
    { key: "tipitaka", url: "https://suttacentral.net/" },
    { key: "vǫlsunga", url: "https://sacred-texts.com/neu/vlsng/index.htm" },
    { key: "volsunga", url: "https://sacred-texts.com/neu/vlsng/index.htm" },
    { key: "völsunga", url: "https://sacred-texts.com/neu/vlsng/index.htm" },
    { key: "kaddzhyt", url: "https://en.wikipedia.org/wiki/Special:Search?search=Nart%20saga%20Ossetian&go=Go" },
    { key: "vǫlsunga", url: "https://sacred-texts.com/neu/vlsng/index.htm" },
    { key: "betanzos", url: "https://en.wikipedia.org/wiki/Special:Search?search=Juan%20de%20Betanzos%20Suma%20y%20narraci%C3%B3n&go=Go" },
    { key: "varro ll", url: "https://en.wikipedia.org/wiki/Special:Search?search=Varro%20De%20Lingua%20Latina&go=Go" },
    { key: "bonfante", url: "https://en.wikipedia.org/wiki/Special:Search?search=Larissa%20Bonfante&go=Go" },
    { key: "diedrich", url: "https://en.wikipedia.org/wiki/Special:Search?search=Diedrich&go=Go" },
    { key: "serglige", url: "https://en.wikipedia.org/wiki/Special:Search?search=Serglige%20Con%20Culainn&go=Go" },
    { key: "abeghian", url: "https://en.wikipedia.org/wiki/Special:Search?search=Daredevils%20of%20Sassoun&go=Go" },
    { key: "al-faraj", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kitab%20al-Aghani%20al-Isfahani&go=Go" },
    { key: "lumholtz", url: "https://en.wikipedia.org/wiki/Special:Search?search=Carl%20Lumholtz&go=Go" },
    { key: "hor carm", url: "https://en.wikipedia.org/wiki/Special:Search?search=Horace%20Odes%20Carmina&go=Go" },
    { key: "cato agr", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cato%20De%20Agri%20Cultura&go=Go" },
    { key: "enn. ann", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ennius%20Annales&go=Go" },
    { key: "volsunga", url: "https://sacred-texts.com/neu/vlsng/index.htm" },
    { key: "völsunga", url: "https://sacred-texts.com/neu/vlsng/index.htm" },
    { key: "el-kurru", url: "https://en.wikipedia.org/wiki/Special:Search?search=El-Kurru&go=Go" },
    { key: "bradbury", url: "https://en.wikipedia.org/wiki/Special:Search?search=Bradbury%20Benin%20Kingdom%20Edo-speaking%20Peoples&go=Go" },
    { key: "mechique", url: "https://en.wikipedia.org/wiki/Special:Search?search=Histoyre%20du%20Mechique&go=Go" },
    { key: "piacenza", url: "https://en.wikipedia.org/wiki/Special:Search?search=Liver+of+Piacenza&go=Go" },
    { key: "karalaev", url: "https://en.wikipedia.org/wiki/Special:Search?search=Sayakbai+Karalaev&go=Go" },
    { key: "de landa", url: "https://sacred-texts.com/nam/maya/ybac/index.htm" },
    { key: "toàn thư", url: "https://en.wikipedia.org/wiki/Special:Search?search=%C4%90%E1%BA%A1i%20Vi%E1%BB%87t%20s%E1%BB%AD%20k%C3%BD%20to%C3%A0n%20th%C6%B0&go=Go" },
    { key: "toan thu", url: "https://en.wikipedia.org/wiki/Special:Search?search=%C4%90%E1%BA%A1i%20Vi%E1%BB%87t%20s%E1%BB%AD%20k%C3%BD%20to%C3%A0n%20th%C6%B0&go=Go" },
    { key: "taliesin", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ystoria%20Taliesin&go=Go" },
    { key: "moytura", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cath%20Maige%20Tuired&go=Go" },
    { key: "iranica", url: "https://en.wikipedia.org/wiki/Special:Search?search=Encyclopaedia%20Iranica&go=Go" },
    { key: "beowulf", url: "https://en.wikisource.org/wiki/Beowulf" },
    { key: "nuttall", url: "https://en.wikipedia.org/wiki/Special:Search?search=Codex%20Zouche-Nuttall&go=Go" },
    { key: "mencius", url: "https://sacred-texts.com/cfu/menc/index.htm" },
    { key: "tregear", url: "https://en.wikipedia.org/wiki/Special:Search?search=Edward%20Tregear%20Maori-Polynesian%20Comparative%20Dictionary&go=Go" },
    { key: "nafanua", url: "https://en.wikipedia.org/wiki/Special:Search?search=Augustin%20Kr%C3%A4mer%20Die%20Samoa-Inseln&go=Go" },
    { key: "vainakh", url: "https://en.wikipedia.org/wiki/Special:Search?search=Vainakh%20religion&go=Go" },
    { key: "córdova", url: "https://en.wikipedia.org/wiki/Special:Search?search=Juan%20de%20C%C3%B3rdova%20Vocabulario%20en%20lengua%20zapoteca&go=Go" },
    { key: "cordova", url: "https://en.wikipedia.org/wiki/Special:Search?search=Juan%20de%20C%C3%B3rdova%20Vocabulario%20en%20lengua%20zapoteca&go=Go" },
    { key: "fgrhist", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hellanicus%20of%20Lesbos&go=Go" },
    { key: "kumarbi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Song%20of%20Kumarbi%20Kingship%20in%20Heaven&go=Go" },
    { key: "enn ann", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ennius%20Annales&go=Go" },
    { key: "hattusa", url: "https://en.wikipedia.org/wiki/Special:Search?search=Hattusa%20Bogazkoy%20archive&go=Go" },
    { key: "hedammu", url: "https://en.wikipedia.org/wiki/Special:Search?search=Song+of+Hedammu&go=Go" },
    { key: "kumarbi", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kumarbi+Cycle&go=Go" },
    { key: "povest'", url: "https://en.wikipedia.org/wiki/Special:Search?search=Primary%20Chronicle&go=Go" },
    { key: "ctu a -", url: "https://en.wikipedia.org/wiki/Special:Search?search=Meher%20Kap%C4%B1s%C4%B1%20inscription&go=Go" },
    { key: "nikaya", url: "https://suttacentral.net/" },
    { key: "cypria", url: "https://www.theoi.com/Text/EpicCycle.html" },
    { key: "mengzi", url: "https://sacred-texts.com/cfu/menc/index.htm" },
    { key: "movses", url: "https://en.wikipedia.org/wiki/Special:Search?search=Movses%20Khorenatsi&go=Go" },
    { key: "pulotu", url: "https://en.wikipedia.org/wiki/Special:Search?search=Augustin%20Kr%C3%A4mer%20Die%20Samoa-Inseln&go=Go" },
    { key: "cil ii", url: "https://en.wikipedia.org/wiki/Special:Search?search=Corpus%20Inscriptionum%20Latinarum&go=Go" },
    { key: "sappho", url: "https://sacred-texts.com/cla/usappho/index.htm" },
    { key: "kujiki", url: "https://en.wikipedia.org/wiki/Special:Search?search=Sendai%20Kuji%20Hongi%20Kujiki&go=Go" },
    { key: "ur iii", url: "https://etcsl.orinst.ox.ac.uk/section2/tr211.htm" },
    { key: "aghānī", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kitab%20al-Aghani%20al-Isfahani&go=Go" },
    { key: "kagame", url: "https://en.wikipedia.org/wiki/Special:Search?search=Alexis%20Kagame&go=Go" },
    { key: "wright", url: "https://en.wikipedia.org/wiki/Special:Search?search=Roman%20Inscriptions%20of%20Britain%20Collingwood&go=Go" },
    { key: "de agr", url: "https://en.wikipedia.org/wiki/Special:Search?search=Cato%20De%20Agri%20Cultura&go=Go" },
    { key: "ennius", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ennius%20Annales&go=Go" },
    { key: "jocano", url: "https://en.wikipedia.org/wiki/Special:Search?search=F.+Landa+Jocano&go=Go" },
    { key: "te ara", url: "https://en.wikipedia.org/wiki/Special:Search?search=Te%20Ara%20Encyclopedia%20of%20New%20Zealand&go=Go" },
    { key: "aghani", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kitab%20al-Aghani&go=Go" },
    { key: "dainos", url: "https://en.wikipedia.org/wiki/Special:Search?search=Lithuanian+dainos&go=Go" },
    { key: "etcsl", url: "https://etcsl.orinst.ox.ac.uk/" },
    { key: "ktu .", url: "https://en.wikipedia.org/wiki/Special:Search?search=Aqhat%20epic&go=Go" },
    { key: "ktu .", url: "https://en.wikipedia.org/wiki/Special:Search?search=Kirta%20Epic%20Keret%20Ugarit&go=Go" },
    { key: "ktu .", url: "https://en.wikipedia.org/wiki/Special:Search?search=Nikkal%20and%20Yarikh&go=Go" },
    { key: "ktu .", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ugaritic%20god%20list%20KTU%201.118&go=Go" },
    { key: "rs .", url: "https://en.wikipedia.org/wiki/Special:Search?search=Ugaritic%20god%20list%20KTU%201.118&go=Go" }
  ];
  function matchExtra(sn) {
    for (var i = 0; i < EXTRA_KEYS.length; i++) {
      if (headContains(sn, EXTRA_KEYS[i].key)) return EXTRA_KEYS[i].url;
    }
    return null;
  }

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
      || /\b(?:Bk\.|Book\s+[IVXLC0-9]|Ch\.|Chap\.|Pt\.|Part\s+[IVXLC0-9]|vol\.|s\.v\.)/.test(s);
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
    var ex = matchExtra(norm(seg));
    if (ex) return ex;
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
