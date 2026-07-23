/*
 * sanity-check.cjs — the Tier-A file gate (docs/image-pipeline.md).
 *
 * A P18 claim is curated ("this image depicts this entity") but not infallible:
 * vandalism, planetary-symbol SVGs, and cult-site photos exist. Before a P18
 * pick auto-ships, the FILE itself must look like a lead portrait — a raster
 * depiction, not scenery, not a glyph, not a panorama. Anything that fails
 * drops to the human review tier; nothing is discarded outright. Pure and
 * unit-tested offline (test/image-pipeline.test.cjs); the license gate
 * (commons-license.cjs) is separate and always runs too.
 */
'use strict';

// Scenery/context vocabulary — the Zeus lesson ("Temple of Olympian Zeus …
// ruins" was the top CC0 hit). Applied to the TITLE only: categories often
// legitimately mention museums/sites for photos OF statues held there.
const SCENERY = /\b(temple|ruins?|sanctuary|archaeological|excavation|museum exterior|site of|location|map of|plan of|panorama|panoramic|landscape|aerial|street|square|mount|hill|valley|lake|river mouth|coastline|skyline|view (of|from)|overlook)\b/i;

// Symbol/diagram vocabulary — a planet glyph or emblem "depicts" a god on
// Wikidata but is not a portrait.
const SYMBOLIC = /\b(symbol|logo|icon|glyph|sigil|emblem|flag|coat of arms|seal of|diagram|chart|sign|pictogram|monogram)\b/i;

/**
 * @param {object} f  { title, mime, width, height }  (from Commons imageinfo)
 * @returns {{pass: boolean, reasons: string[], signals: string[]}}
 *   reasons — why it failed (empty when pass)
 *   signals — which positive checks were evaluated, recorded to the manifest
 *             _meta so a bad batch is mass-revertible by cause
 */
function sanityCheck(f) {
  const title = String((f && f.title) || '');
  const mime = String((f && f.mime) || '');
  const w = (f && f.width) || 0, h = (f && f.height) || 0;
  const reasons = [];
  const signals = ['not-vector', 'not-scenery', 'not-symbol', 'aspect', 'min-size'];

  // Vector files are glyphs/diagrams in practice — paintings and photographs
  // are rasters. (SVG also bypasses the server thumbnailer's raster path.)
  if (/svg|xml/i.test(mime) || /\.svg$/i.test(title)) reasons.push('vector/symbol file');
  if (SCENERY.test(title)) reasons.push('scenery/context title: ' + (title.match(SCENERY) || [])[0]);
  if (SYMBOLIC.test(title)) reasons.push('symbol/diagram title: ' + (title.match(SYMBOLIC) || [])[0]);
  // Extreme landscape aspect is a vista, not a portrait; tiny files are junk.
  if (w && h && w / h > 2.4) reasons.push(`panoramic aspect ${w}×${h}`);
  if (w && w < 200) reasons.push(`too small (${w}px wide)`);

  return { pass: reasons.length === 0, reasons, signals };
}

module.exports = { sanityCheck, SCENERY, SYMBOLIC };
