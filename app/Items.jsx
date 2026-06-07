// ═══════════════════════════════════════════════════════════════════════════
//  Items.jsx — the material-culture registry: index + item detail slide-over.
//  Items are first-class objects. Unlike powers (traced by genealogical descent)
//  an object has a fixed identity and is traced by CUSTODY — who forged it, who
//  held it, to whom it passed. The registry is built in data.js (holders gathered
//  from every figure's materialCulture[], merged with cited ITEM_LORE) and read
//  here via window.allItems / window.itemById.
// ═══════════════════════════════════════════════════════════════════════════

const { useMemo: __iMemo, useEffect: __iEff, useState: __iState } = React;

// kind → index-group label + display order. Curated kinds lead; the unset
// catch-all ('other') always sinks to the bottom.
const ITEM_KIND_LABEL = {
  weapon: 'Weapons',
  garment: 'Worn & borne',
  symbol: 'Regalia & symbols',
  tool: 'Tools',
  vessel: 'Vessels',
  'ritual-object': 'Ritual objects',
};
const ITEM_KIND_ORDER = ['weapon', 'garment', 'symbol', 'tool', 'vessel', 'ritual-object'];
function itemKindLabel(kind) {
  if (!kind || kind === 'other') return 'Other objects';
  return ITEM_KIND_LABEL[kind] ||
    String(kind).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function itemKindRank(kind) {
  const i = ITEM_KIND_ORDER.indexOf(kind);
  if (i >= 0) return i;                 // curated kinds, in order
  if (!kind || kind === 'other') return 99; // catch-all last
  return 50;                            // any other named kind, between
}

const humanizeItem = (s) => String(s || '').replace(/[-_]+/g, ' ');
// A non-Latin script renders its glyphs large (runic, Greek, Devanagari…).
const isGlyphScript = (script) => !!script && !/latin/i.test(script);

// Index-row badge: a custody chain beats a plain holder count.
function itemBadge(it) {
  if (it.custodyCount > 0) return { label: `${it.custodyCount}-step custody`, cls: 'item-badge-custody' };
  if (it.holderCount > 1) return { label: `${it.holderCount} holders`, cls: 'item-badge-multi' };
  return null;
}

// Resolve a custody step / holder's external name (may be a string or {name,…}).
function externalName(ext) {
  if (!ext) return '—';
  if (typeof ext === 'string') return ext;
  const name = (typeof ext.name === 'string' ? ext.name : null) || ext.id || '—';
  return ext.tradition ? `${name} · ${ext.tradition}` : name;
}

// ── Items index ────────────────────────────────────────────────────────────
function Items({ items, byId, selectedItemId, onOpenItem }) {
  const [q, setQ] = __iState('');

  const groups = __iMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = !query ? items : items.filter((it) => {
      const hay = [it.displayName, it.id, it.classId, it.kind,
        ...(it.names || []).map((n) => n.value)].join(' ').toLowerCase();
      return hay.includes(query);
    });
    const byKind = new Map();
    for (const it of filtered) {
      const k = it.kind || 'other';
      if (!byKind.has(k)) byKind.set(k, []);
      byKind.get(k).push(it);
    }
    return [...byKind.entries()].sort((a, b) =>
      (itemKindRank(a[0]) - itemKindRank(b[0])) ||
      itemKindLabel(a[0]).localeCompare(itemKindLabel(b[0])));
  }, [items, q]);

  const showcased = __iMemo(() => items.filter((it) => it.custodyCount > 0).length, [items]);

  return (
    <div className="items-view">
      <div className="items-head">
        <div className="items-head-row">
          <h2 className="items-title">Items <span className="items-count">{items.length}</span></h2>
          {showcased > 0 && (
            <span className="items-showcased">{showcased} with a traced custody chain</span>
          )}
        </div>
        <p className="items-sub">
          Mythic objects, traced by custody — who forged each, who held it, and to whom it passed.
        </p>
        <div className="items-search">
          <input
            placeholder="Filter items…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter items"
          />
          {q && <button className="items-search-clear" onClick={() => setQ('')} title="Clear">×</button>}
        </div>
      </div>

      <div className="items-grid">
        {groups.map(([kind, list]) => (
          <div className="items-group" key={kind}>
            <h3 className="items-group-head">
              {itemKindLabel(kind)} <span className="items-group-count">{list.length}</span>
            </h3>
            <div className="items-rows">
              {list.map((it) => {
                const badge = itemBadge(it);
                const holder = it.holders?.[0]?.personId ? byId.get(it.holders[0].personId) : null;
                return (
                  <button
                    key={it.id}
                    className={'item-row' + (it.id === selectedItemId ? ' on' : '')}
                    onClick={() => onOpenItem(it.id)}
                  >
                    <span className={'item-row-name' + (isGlyphScript(it.names?.[0]?.script) ? ' glyph' : '')}>
                      {it.displayName}
                    </span>
                    <span className="item-row-meta">
                      {it.classId && <span className="item-row-class">{humanizeItem(it.classId)}</span>}
                      {holder && <span className="item-row-holder">{window.displayName(holder)}</span>}
                      {badge && <span className={'item-badge ' + badge.cls}>{badge.label}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && <div className="items-empty">No items match "{q}".</div>}
      </div>
    </div>
  );
}

// ── Item detail sub-sections ────────────────────────────────────────────────
function ItemNames({ names }) {
  if (!names || names.length < 2) return null;
  return (
    <div className="section section-item-names">
      <h2>Names <span className="count">{names.length}</span></h2>
      <div className="names-list">
        {names.map((n, i) => (
          <div className="name-rec" key={i}>
            <div className="name-rec-main">
              <span className={'name-rec-value' + (isGlyphScript(n.script) ? ' name-rec-glyph' : '')}>{n.value}</span>
            </div>
            <div className="name-rec-meta">
              {n.tradition && <span className="name-rec-trad">{n.tradition}</span>}
              {n.script && <span className="name-rec-script">{humanizeItem(n.script)}</span>}
              {n.period && <span className="name-rec-period">{humanizeItem(n.period)}</span>}
            </div>
            {n.note && <div className="name-rec-note">{n.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// The custody chain — the object's biography. Each step links a registry figure
// (by personId) when one exists, or names an external holder by externalRef.
function CustodyChain({ custody, byId, onOpenFigure }) {
  if (!custody || !custody.length) return null;
  return (
    <div className="section section-custody">
      <h2>Custody <span className="count">{custody.length}</span></h2>
      <ol className="custody-chain">
        {custody.map((step, i) => {
          const person = step.personId ? byId.get(step.personId) : null;
          const ref = step.sources?.[0]?.reference;
          return (
            <li className="custody-step" key={i}>
              <div className="custody-spine" aria-hidden="true">
                <span className="custody-node" />
                {i < custody.length - 1 && <span className="custody-line" />}
              </div>
              <div className="custody-body">
                <div className="custody-role">{humanizeItem(step.role)}</div>
                <div
                  className={'custody-who' + (person ? ' link' : '')}
                  onClick={person ? () => onOpenFigure(step.personId) : null}
                  role={person ? 'button' : undefined}
                  tabIndex={person ? 0 : -1}
                >
                  {person ? (
                    <>
                      <window.TierIcon type={person.type} size={12} />
                      <span className="custody-who-name">{window.displayName(person)}</span>
                      <span className="custody-who-meta">{person.tradition}</span>
                    </>
                  ) : (
                    <span className="custody-ext">{externalName(step.externalRef)}</span>
                  )}
                  {step.era && <span className="custody-era">{window.formatEra(step.era)}</span>}
                </div>
                {step.note && <div className="custody-note">{step.note}</div>}
                {ref && <div className="custody-cite">{ref}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Registry holders — the figures in THIS registry that carry the object (from
// their materialCulture[]). The concrete cross-link back to figure entries.
function ItemHolders({ holders, byId, onOpenFigure }) {
  const inReg = (holders || []).filter((h) => byId.get(h.personId));
  if (!inReg.length) return null;
  return (
    <div className="section section-item-holders">
      <h2>In this registry <span className="count">{inReg.length}</span></h2>
      <div className="item-holders">
        {inReg.map((h, i) => {
          const p = byId.get(h.personId);
          return (
            <button className="item-holder" key={h.personId + '-' + i} onClick={() => onOpenFigure(h.personId)}>
              <window.TierIcon type={p.type} size={12} />
              <span className="item-holder-name">{window.displayName(p)}</span>
              <span className="item-holder-meta">{p.tradition}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ItemSources({ sources }) {
  if (!sources || !sources.length) return null;
  return (
    <div className="section section-item-sources">
      <h2>Sources <span className="count">{sources.length}</span></h2>
      <div className="item-sources">
        {sources.map((s, i) => (
          <div className="item-source" key={i}>
            {s.kind && <span className="item-source-kind">{s.kind}</span>}
            <span className="item-source-ref">{s.reference || (typeof s === 'string' ? s : '')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Item detail slide-over ───────────────────────────────────────────────────
function ItemDetail({ item, byId, onClose, onPrev, onNext, onOpenFigure }) {
  // Exit animation mirrors the figure Detail: keep the last item mounted for one
  // beat after `item` goes null, then unmount.
  const [local, setLocal] = __iState(item || null);
  const [closing, setClosing] = __iState(false);

  __iEff(() => {
    if (item) { setLocal(item); setClosing(false); return; }
    if (local) {
      setClosing(true);
      const t = setTimeout(() => { setLocal(null); setClosing(false); }, 180);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  __iEff(() => {
    if (!local) return;
    const el = document.querySelector('.item-detail .detail-scroll');
    if (el) el.scrollTop = 0;
  }, [local?.id]);

  if (!local) return null;
  const it = local;
  const primary = it.names?.[0];

  return (
    <>
      <div className={'detail-backdrop' + (closing ? ' closing' : '')} onClick={onClose} />
      <aside
        className={'detail item-detail' + (closing ? ' closing' : '')}
        role="dialog"
        aria-label={it.displayName}
      >
        <div className="detail-bar">
          <div className="nav">
            <button className="btn btn-ghost btn-sm" onClick={onPrev} title="Previous (k)">↑ Prev</button>
            <button className="btn btn-ghost btn-sm" onClick={onNext} title="Next (j)">↓ Next</button>
          </div>
          <div className="spacer" />
          <button className="close" onClick={onClose} title="Close (esc)" aria-label="Close">×</button>
        </div>

        <div className="detail-scroll">
          <div className="detail-header">
            <div className="eyebrow">
              <span className="eyebrow-tier">Item</span>
              {it.kind && <span>{humanizeItem(it.kind)}</span>}
              {it.classId && <span>{humanizeItem(it.classId)}</span>}
            </div>
            <h1 className={isGlyphScript(primary?.script) ? 'item-title-glyph' : ''}>{it.displayName}</h1>
            {it.maker && (
              <div className="item-maker">
                forged by <span className="item-maker-name">{it.maker.name}</span>
                {it.maker.kind && <span className="item-maker-kind"> · {humanizeItem(it.maker.kind)}</span>}
              </div>
            )}
          </div>

          {it.lore && <div className="detail-notes">{it.lore}</div>}

          <ItemNames names={it.names} />
          <CustodyChain custody={it.custody} byId={byId} onOpenFigure={onOpenFigure} />
          <ItemHolders holders={it.holders} byId={byId} onOpenFigure={onOpenFigure} />
          <ItemSources sources={it.sources} />
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { Items, ItemDetail });
