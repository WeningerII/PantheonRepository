/*
 * contact-sheet.cjs — the Tier-B human-review page (docs/image-pipeline.md).
 *
 * Renders data-sources/image-review.json into ONE self-contained HTML file the
 * owner opens locally: a card per figure with up to 3 license-verified
 * candidates. Keyboard: 1/2/3 approve that option, x = none of these,
 * j/k or arrows move between cards, e = export. Decisions persist in
 * localStorage and export as data-sources/image-approved.json, which the
 * owner commits — CI then ingests the approvals (re-running the license gate).
 *
 * This page is an internal review tool, not the product: its thumbnails
 * reference Commons thumb URLs directly (fine per API etiquette). The
 * PRODUCT never hotlinks — approved picks are downloaded and self-hosted.
 */
'use strict';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function renderSheet(review) {
  const ids = Object.keys(review || {}).sort();
  const total = ids.length;

  // n→title mapping the export script reads; \u003c-escaped like every other
  // embedded JSON block in this repo (a title containing </script> must not
  // terminate the block).
  const data = {};
  for (const id of ids) {
    data[id] = (review[id].options || []).map((o) => o.title);
  }

  const cards = ids.map((id) => {
    const r = review[id];
    const opts = (r.options || []).slice(0, 3).map((o, i) => `
      <figure data-n="${i + 1}">
        <img src="${esc(o.thumb)}" alt="option ${i + 1}" loading="lazy">
        <figcaption><b>${i + 1}</b> · ${esc(o.license)}${o.author ? ' · ' + esc(o.author) : ''}
          · <a href="https://commons.wikimedia.org/wiki/${esc(encodeURIComponent(o.title))}" target="_blank" rel="noopener">source</a>
          ${o.score != null ? ` · score ${esc(o.score)}` : ''}</figcaption>
      </figure>`).join('');
    return `
  <section class="card" id="card-${esc(id)}" data-id="${esc(id)}" tabindex="0">
    <h2>${esc(r.name || id)} <small>${esc(r.tradition || '')}${r.qid ? ' · ' + esc(r.qid) : ''} · via ${esc(r.via || '?')}</small></h2>
    <div class="opts">${opts}
      <figure class="none" data-n="x"><div>✕</div><figcaption><b>x</b> · none of these</figcaption></figure>
    </div>
  </section>`;
  }).join('\n');

  const empty = `<p class="empty">Nothing to review — every candidate has been decided. 🎉</p>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pantheon image review — ${total} figure${total === 1 ? '' : 's'}</title>
<style>
:root{color-scheme:light dark}
body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:0 0 6rem;background:#faf8f3;color:#1a1a1a}
@media(prefers-color-scheme:dark){body{background:#141310;color:#e8e6e0}}
header{position:sticky;top:0;background:inherit;border-bottom:1px solid #8884;padding:.7rem 1rem;z-index:2;display:flex;gap:1.2rem;align-items:baseline}
header .keys{opacity:.6;font-size:.85em}
.card{max-width:64rem;margin:1rem auto;padding:1rem;border:1px solid #8884;border-radius:8px;outline:none}
.card.active{border-color:#4a7dbd;box-shadow:0 0 0 2px #4a7dbd44}
.card.decided{opacity:.45}
.card h2{margin:.1rem 0 .6rem;font-size:1.05rem}.card h2 small{opacity:.6;font-weight:400}
.opts{display:flex;gap:.8rem;flex-wrap:wrap}
.opts figure{margin:0;width:180px;cursor:pointer;border:2px solid transparent;border-radius:6px;padding:4px}
.opts figure.picked{border-color:#2a8a4a;background:#2a8a4a18}
.opts img{width:100%;height:170px;object-fit:contain;background:#8881;border-radius:4px;display:block}
.opts .none div{width:100%;height:170px;display:flex;align-items:center;justify-content:center;font-size:2rem;opacity:.5;background:#8881;border-radius:4px}
figcaption{font-size:.75rem;opacity:.75;margin-top:.3rem;line-height:1.35}
.empty{text-align:center;opacity:.6;margin:4rem 0}
footer{position:fixed;bottom:0;left:0;right:0;background:inherit;border-top:1px solid #8884;padding:.7rem 1rem;display:flex;gap:1rem;align-items:center}
button{font:inherit;padding:.45rem .9rem;border:1px solid #8886;border-radius:6px;background:#8881;cursor:pointer}
</style></head><body>
<header><b>Pantheon image review</b> <span><span id="done">0</span>/${total} decided</span>
<span class="keys">keys: <b>1/2/3</b> approve · <b>x</b> none · <b>j/k</b> move · <b>u</b> undo · <b>e</b> export</span></header>
<main>
${total ? cards : empty}
</main>
<footer><button id="export">Export image-approved.json</button>
<span style="opacity:.6;font-size:.85em">Save the download as <code>data-sources/image-approved.json</code>, commit, push — CI ingests it (license gate re-runs).</span></footer>
<script id="sheet-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById('sheet-data').textContent);
  var KEY = 'pr-image-review-v1';
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  var cards = [].slice.call(document.querySelectorAll('.card'));
  var idx = 0;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function paint() {
    var done = 0;
    cards.forEach(function (c, i) {
      var id = c.getAttribute('data-id');
      var pick = state[id]; // undefined | null (= none) | title string
      c.classList.toggle('active', i === idx);
      c.classList.toggle('decided', pick !== undefined);
      if (pick !== undefined) done++;
      [].slice.call(c.querySelectorAll('.opts figure')).forEach(function (f) {
        var n = f.getAttribute('data-n');
        var title = n === 'x' ? null : data[id][+n - 1];
        f.classList.toggle('picked', pick !== undefined && pick === title);
      });
    });
    var d = document.getElementById('done'); if (d) d.textContent = done;
  }
  function decide(n) {
    if (!cards.length) return;
    var id = cards[idx].getAttribute('data-id');
    if (n === 'x') state[id] = null;
    else { var t = data[id][+n - 1]; if (t === undefined) return; state[id] = t; }
    save(); move(1);
  }
  function move(d) {
    if (!cards.length) return;
    idx = Math.max(0, Math.min(cards.length - 1, idx + d));
    paint();
    cards[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function undo() {
    if (!cards.length) return;
    delete state[cards[idx].getAttribute('data-id')];
    save(); paint();
  }
  function doExport() {
    var blob = new Blob([JSON.stringify(state, null, 2) + '\\n'], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'image-approved.json';
    document.body.appendChild(a); a.click(); a.remove();
  }
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '1' || e.key === '2' || e.key === '3') decide(e.key);
    else if (e.key === 'x' || e.key === '0') decide('x');
    else if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'u') undo();
    else if (e.key === 'e') doExport();
  });
  cards.forEach(function (c, i) {
    c.addEventListener('click', function () { idx = i; paint(); });
    [].slice.call(c.querySelectorAll('.opts figure')).forEach(function (f) {
      f.addEventListener('click', function (e) { e.stopPropagation(); idx = i; decide(f.getAttribute('data-n')); });
    });
  });
  var ex = document.getElementById('export'); if (ex) ex.addEventListener('click', doExport);
  paint();
})();
</script>
</body></html>\n`;
}

module.exports = { renderSheet };
