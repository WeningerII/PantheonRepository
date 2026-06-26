// Deterministic note-sanitizer: strips internal/plumbing scaffolding that the
// kin-completion sweep left in figure `notes` (and lifecycle/relations notes)
// from reaching the public detail page. Two moves:
//   1. REWORD disambiguation jargon, preserving the useful "distinct from X" fact:
//        "The id-suffix _X disambiguates from Y" -> "Distinct from Y"
//   2. STRIP pure-plumbing sentences (id-wiring, externalRef provenance, reciprocity
//      bookkeeping, tier-compute mechanics) — anything carrying a hard internal marker.
// Idempotent. Used by gen-new-figures (transcript notes) and the one-time SEED codemod.

// A sentence is pure plumbing if it carries any of these code/bookkeeping terms.
const HARD = /externalRef|\bwired to\b|wires to the existing|RECIPROCAL-NEEDED|Reciprocal edge|Reciprocal of the existing|not yet registered|already records|schemaVersion|statusAtConception|status-at-conception|eraOrdering|stress test|stress case|Tests dynastic|the registry uses the disambiguating|registry threshold|individuated-figure threshold|2-entry .* budget|should add [A-Za-z0-9_]+ to parentIds|lists only .+ as parent and should add/;

// Only touch notes that actually carry a trigger — keeps clean notes byte-identical.
const TRIGGER = /externalRef|\bwired to\b|wires to the existing|RECIPROCAL|Reciprocal edge|Reciprocal of the existing|already records|id-suffix|Id-suffixed|Disambiguator _|disambiguating id|statusAtConception|status-at-conception|eraOrdering|stress test|stress case|Tests dynastic|not yet registered|schemaVersion|registry threshold|individuated-figure threshold|to parentIds/;

function sanitizeNote(s) {
  if (typeof s !== 'string' || !s || !TRIGGER.test(s)) return s;
  let t = s;
  // 1. Disambiguation rewrites (keep the "distinct from X" information).
  t = t.replace(/\bId-suffixed\s+`?_[A-Za-z0-9_]+`?\s+to\s+disambiguate\s+(?:it\s+|her\s+|him\s+|them\s+)?from\s+/g, 'Distinct from ');
  t = t.replace(/\bThe\s+id-suffix\s+`?_[A-Za-z0-9_]+`?\s+disambiguates?\s+(?:it\s+|her\s+|him\s+|them\s+)?from\s+/g, 'Distinct from ');
  t = t.replace(/\b(?:The\s+)?Disambiguator\s+`?_[A-Za-z0-9_]+`?\s+(?:distinguishes?|disambiguates?)\s+(?:it\s+|her\s+|him\s+|them\s+)?from\s+/g, 'Distinct from ');
  t = t.replace(/\s*\bby\s+id-suffix\b/g, '');
  // "— the registry uses the disambiguating id `X`" tail -> gone
  t = t.replace(/\s*[—-]\s*the\s+registry\s+uses\s+the\s+disambiguating\s+id\s+`?[A-Za-z0-9_]+`?/g, '');
  // 2. Targeted clause strips that leave a clean head clause behind.
  //    "Foo; greek_x already records ... ." -> "Foo."
  t = t.replace(/;\s*(?:the existing figure\s+)?[A-Za-z][A-Za-z0-9_ ]*\s+already\s+records[^.]*\./g, '.');
  //    "Foo; X wired to greek_... ." -> "Foo."
  t = t.replace(/;\s*[A-Za-z][A-Za-z ]*\s+wired\s+to\s+greek_[^.]*\./g, '.');
  //    "Mother of Tros; the existing figure greek_tros should add greek_x to parentIds." -> "Mother of Tros."
  //    (a developer TODO that resolved into a real parentIds reconciliation; the
  //    mythological head clause is the keeper. The standalone-sentence form
  //    "The existing X entry lists only Y as parent and should add Z to
  //    parentIds." is dropped by the HARD sentence filter below.)
  t = t.replace(/;\s*(?:the existing figure\s+)?[A-Za-z][A-Za-z0-9_ ]*\s+should\s+add\s+[A-Za-z0-9_]+\s+to\s+parentIds[^.]*\./gi, '.');
  // 3. Sentence-level strip: drop any remaining sentence carrying a hard marker.
  t = t.split(/(?<=[.!?])\s+/).filter((seg) => !HARD.test(seg)).join(' ');
  // 4. Tidy whitespace/punctuation left by the cuts.
  t = t.replace(/\s+([.,;:])/g, '$1').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ')
       .replace(/;\s*\./g, '.').replace(/\.\s*;/g, '.').replace(/\s*—\s*\./g, '.')
       .replace(/^[;,\s—-]+/, '').replace(/[;,\s—]+$/, '').trim();
  if (t && !/[.!?]$/.test(t)) t += '.';
  return t;
}

// Apply to a figure's note-bearing fields in place.
function sanitizeFigureNotes(f) {
  if (!f || typeof f !== 'object') return f;
  if (typeof f.notes === 'string') f.notes = sanitizeNote(f.notes);
  for (const ph of (f.lifecycle || [])) if (ph && typeof ph.notes === 'string') ph.notes = sanitizeNote(ph.notes);
  for (const r of (f.relations || [])) if (r && typeof r.notes === 'string') r.notes = sanitizeNote(r.notes);
  return f;
}

module.exports = { sanitizeNote, sanitizeFigureNotes, HARD };
