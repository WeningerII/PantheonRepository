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

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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
  const credit = (img.author
    ? (img.authorUrl
      ? `<a href="${esc(img.authorUrl)}" rel="nofollow noopener" target="_blank">${esc(img.author)}</a>`
      : esc(img.author)) + ' · '
    : '')
    + (img.source
      ? `<a href="${esc(img.source)}" rel="nofollow noopener" target="_blank">${esc(license)}</a>`
      : esc(license))
    + ', via Wikimedia Commons';
  return `<figure class="lead">
<img src="${base}assets/images/figures/${esc(img.file)}" alt="${esc(name)}"${img.w ? ` width="${img.w}"` : ''}${img.h ? ` height="${img.h}"` : ''} loading="lazy" decoding="async">
<figcaption>${credit}</figcaption>
</figure>`;
}

module.exports = { leadFigure, esc };
