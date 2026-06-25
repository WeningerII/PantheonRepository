#!/usr/bin/env node
/*
 * One-time codemod: apply the note-sanitizer to the hand-seeded `notes:` string
 * literals in app/data.js. Transcript-sourced notes are cleaned in the generator
 * (gen-new-figures), but the hand-coded SEED figures + supplement-map notes are
 * not regenerated, so they need this in-place pass. The sanitizer's patterns are
 * plain-text (externalRef, "wired to greek_", "id-suffix _X disambiguates from")
 * and never span a JS escape, so operating on the encoded literal body is safe;
 * the early-out keeps clean literals byte-identical. After running this, run the
 * generators + build so the regenerated blocks stay consistent.
 * Run: node scripts/sanitize-seed-notes.cjs
 */
const fs = require('fs');
const path = require('path');
const { sanitizeNote } = require('./sanitize-notes.cjs');
const DATA = path.join(__dirname, '..', 'app', 'data.js');

let src = fs.readFileSync(DATA, 'utf8');
let n = 0;
const fix = (re, q) => {
  src = src.replace(re, (m, body) => {
    const s = sanitizeNote(body);
    if (s === body) return m;
    n++;
    return `notes: ${q}${s}${q}`;
  });
};
// single-quoted and double-quoted note literals (body allows escaped chars)
fix(/notes: '((?:[^'\\]|\\.)*)'/g, "'");
fix(/notes: "((?:[^"\\]|\\.)*)"/g, '"');
fs.writeFileSync(DATA, src);
console.log(`sanitized ${n} note literals in app/data.js`);
