/*
 * lead-figure.cjs — the PD/CC0 lead-portrait <figure> builder for the static
 * pages (scripts/build-static.cjs). Kept in its own pure, corpus-free module so
 * test/static.test.cjs can unit-test it directly without loading the 28 MB
 * corpus (requiring build-static.cjs would). The SPA renders the same infobox
 * from React in app/Detail.jsx — two render targets, one licensing rule
 * (scripts/lib/commons-license.cjs is the shared gate; the markup is
 * necessarily target-specific).
 *
 * `img` is the images.json record { file, w, h, license:{name,url}, author,
 * authorUrl, source, ... } (docs/image-licensing.md). Returns '' when the
 * figure has no image, so the header reads the same whether or not one exists.
 */
'use strict';

const { langAttr, markRuns } = require('./bcp47.cjs');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Honest per-source provenance (docs/image-licensing.md approved list): a
// museum-sourced record carries `src`; everything else came from Commons.
const SOURCE_LABELS = {
  met: 'The Metropolitan Museum of Art',
  cma: 'The Cleveland Museum of Art',
  aic: 'The Art Institute of Chicago',
  si: 'Smithsonian Open Access',
};
const provenanceOf = (img) => SOURCE_LABELS[img && img.src] || 'Wikimedia Commons';

/**
 * Alternative text for a lead portrait. The bare figure name duplicated the
 * <h1> directly beside it, so a screen reader read the name twice and learned
 * nothing about the picture. We cannot describe the artwork itself — nothing in
 * images.json does — but we can say honestly what it is.
 *
 * Attribution deliberately stays OUT of alt and lives only in the <figcaption>
 * beside it. Appending the credit made a screen reader announce it twice on the
 * 949 pages that have both, and the manifest's `author` field is not prose: 24
 * records carry a doubled name ("Unknown authorUnknown author"), 219 carry a
 * placeholder credit, and inca_sinchi_roca carries a 637-character donor list —
 * all of which became alt text a screen reader had to read out before the page.
 * A figcaption is the right place for a credit; alt is not.
 *
 * @param {string} name  figure display name (unescaped)
 * @returns {string} unescaped alt text
 */
const altTextFor = (name) => `Depiction of ${name}`;

/**
 * @param {object|null} img   images.json record (or falsy)
 * @param {string} name       figure display name (unescaped)
 * @param {string} [base='']  site base URL (BASE); the file self-hosts under
 *                            <base>assets/images/figures/
 * @returns {string} the <figure> HTML, or '' when there is no image
 */
function leadFigure(img, name, base = '') {
  if (!img || !img.file) return '';
  const license = (img.license && img.license.name) || 'Public domain';
  // 12 of the credited authors are written wholly in Han, Hangul or Devanagari
  // and 7 more gloss a Latin name with one ("Fujiwara no Takanobu (藤原隆信)"),
  // while the caption around them is English. So the subtag goes on the author's
  // own element when one script owns the whole name, and on the runs inside it
  // when it does not (scripts/lib/bcp47.cjs). The other 931 are Latin and get
  // neither — both helpers hand back the markup untouched.
  const al = langAttr(img.author);
  const authorText = al ? esc(img.author) : markRuns(esc(img.author));
  const author = img.authorUrl
    ? `<a href="${esc(img.authorUrl)}"${al} rel="nofollow noopener" target="_blank">${authorText}</a>`
    : (al ? `<span${al}>${authorText}</span>` : authorText);
  const credit = (img.author ? author + ' · ' : '')
    + (img.source
      ? `<a href="${esc(img.source)}" rel="nofollow noopener" target="_blank">${esc(license)}</a>`
      : esc(license))
    + ', via ' + esc(provenanceOf(img));
  // fetchpriority="high", never loading="lazy": this image paints at top:92px
  // in an 823px viewport, so it IS the LCP element on all 1,059 pages that have
  // one. Marking it lazy scored lcp-discovery-insight 0 on every one of them,
  // and worse, Lantern intermittently dropped a lazy image out of the LCP
  // dependency graph — PSI swung ~17 points run to run, which made these pages
  // impossible to regression-test at all.
  return `<figure class="lead">
<img src="${base}assets/images/figures/${esc(img.file)}" alt="${esc(altTextFor(name))}"${img.w ? ` width="${img.w}"` : ''}${img.h ? ` height="${img.h}"` : ''} fetchpriority="high" decoding="async">
<figcaption>${credit}</figcaption>
</figure>`;
}

module.exports = { leadFigure, esc, provenanceOf, altTextFor, SOURCE_LABELS };
