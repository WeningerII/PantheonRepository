// ═══════════════════════════════════════════════════════════════════════════
//  Domains.jsx — the domain registry: index + domain detail slide-over.
//  A domain is a sphere of governance (sky, war, the sea…). Where a power is a
//  faculty a figure wields, a domain is a realm a figure presides over. The
//  registry is aggregated in state.jsx (window.allDomains / window.domainById)
//  from every figure's domains[]; this view reads it and the detail lists the
//  figures who govern each sphere, with the context and citation for each.
// ═══════════════════════════════════════════════════════════════════════════

const { useMemo: __dmMemo, useEffect: __dmEff, useState: __dmState, useRef: __dmRef } = React;

const humanizeDom = (s) => String(s == null ? '' : s).replace(/[-_]+/g, ' ');
const DOM_GLYPH = /greek|runic|futhark|cuneiform|kanji|kana|japanese|hierogl|devanagari|hebrew|arabic|chinese|hanzi|brahmi/i;
const domIsGlyph = (script) => !!script && DOM_GLYPH.test(script);

function domGroupKey(name) {
  const c = String(name || '').trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

function domainBadge(d) {
  if (d.figureCount > 1) return { label: `${d.figureCount} figures`, cls: 'domain-badge-multi' };
  return null;
}

// Context is authored as free text, dominated by "lifelong" with a long tail
// (post-mortem, posthumous, apotheosed, cosmogonic, genealogical…). A domain may
// carry several across its governors, so a record buckets to a SET of contexts.
const DOMAIN_CTX_LABEL = {
  lifelong: 'Lifelong', 'post-mortem': 'Post-mortem', cosmogonic: 'Cosmogonic',
  genealogical: 'Genealogical', festival: 'Festival', narrative: 'Narrative',
  unspecified: 'Unspecified', other: 'Other',
};
const DOMAIN_CTX_RANK = {
  lifelong: 0, 'post-mortem': 1, cosmogonic: 2, genealogical: 3,
  festival: 4, narrative: 5, unspecified: 6, other: 7,
};
function domainCtxLabel(b) { return DOMAIN_CTX_LABEL[b] || humanizeDom(b); }
function domainCtxBucket(raw) {
  const s = String(raw == null ? '' : raw).toLowerCase().trim();
  if (!s) return 'unspecified';
  if (/post-?mortem|posthumous|apotheos|after.?death|final-phase|\bdeath\b/.test(s)) return 'post-mortem';
  if (/lifelong/.test(s)) return 'lifelong';
  if (/cosmogon|primordial|creation|prehistoric/.test(s)) return 'cosmogonic';
  if (/genealog|lineage|foundation|founder|dynast/.test(s)) return 'genealogical';
  if (/festival|seasonal|cyclic|calendr|harvest/.test(s)) return 'festival';
  if (/narrative|contextual|mytholog|episode|cycle|classical|republic|\bphase\b|\bposition\b/.test(s)) return 'narrative';
  return 'other';
}
function domainCtxBuckets(d) {
  const set = new Set();
  for (const c of (d.contextTags || [])) set.add(domainCtxBucket(c));
  return [...set];
}

// Precompute per-row derived fields once (context buckets + glyph + search +
// badge). Idempotent via `_dec`.
function decorateDomain(d) {
  if (d._dec) return d;
  d._glyph = domIsGlyph(d.term && d.term.script);
  d._ctx = domainCtxBuckets(d);
  d._search = [d.displayName, d.id, d.term && d.term.value,
    ...(d.contextTags || [])].join(' ').toLowerCase();
  d._badge = domainBadge(d);
  d._dec = true;
  return d;
}

// Memoized index row (Browse pattern).
const DomainRow = React.memo(function DomainRow({ d, selected, onOpen }) {
  const badge = d._badge;
  return (
    <button
      className={'item-row domain-index-row' + (selected ? ' on' : '')}
      onClick={() => onOpen(d.id)}
    >
      <span className={'item-row-name' + (d._glyph ? ' glyph' : '')}>{d.displayName}</span>
      <span className="item-row-meta">
        {badge && <span className={'item-badge ' + badge.cls}>{badge.label}</span>}
      </span>
    </button>
  );
});

// ── Domains index ────────────────────────────────────────────────────────────
function Domains({ domains, total, byId, selectedDomainId, onOpenDomain, onVisibleOrder }) {
  const [q, setQ] = __dmState('');
  const [ctx, setCtx] = __dmState(() => new Set());

  // Stable open callback so React.memo(DomainRow) can skip re-renders.
  const onOpenRef = __dmRef(null); onOpenRef.current = onOpenDomain;
  const stableOpen = __dmMemo(() => (id) => onOpenRef.current && onOpenRef.current(id), []);

  // Decorate every record once; returns the same array (fields live on records).
  const decorated = __dmMemo(() => { for (const d of domains) decorateDomain(d); return domains; }, [domains]);

  const ctxOptions = __dmMemo(
    () => window.buildFacetOptions(decorated, (d) => d._ctx, domainCtxLabel, DOMAIN_CTX_RANK),
    [decorated]);
  const faceted = __dmMemo(
    () => (ctx.size ? decorated.filter((d) => d._ctx.some((b) => ctx.has(b))) : decorated),
    [decorated, ctx]);

  // Post-facet, post-query list — drives the header count/summary so they
  // track the search box, not just the context facet.
  const visible = __dmMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return faceted;
    return faceted.filter((d) => d._search.includes(query));
  }, [faceted, q]);

  const groups = __dmMemo(() => {
    const byLetter = new Map();
    for (const d of visible) {
      const k = domGroupKey(d.displayName);
      if (!byLetter.has(k)) byLetter.set(k, []);
      byLetter.get(k).push(d);
    }
    return [...byLetter.entries()].sort((a, b) =>
      (a[0] === '#' ? 1 : 0) - (b[0] === '#' ? 1 : 0) || a[0].localeCompare(b[0]));
  }, [visible]);

  // First screenful now, the rest in rAF batches — Prev/Next order and the
  // count labels stay on the FULL groups; only what mounts is windowed.
  const revealedGroups = window.usePrefixReveal(groups, 150, 600);

  __dmEff(() => {
    if (!onVisibleOrder) return;
    const ids = [];
    for (const [, list] of groups) for (const d of list) ids.push(d.id);
    onVisibleOrder(ids);
  }, [groups, onVisibleOrder]);

  const shared = __dmMemo(() => domains.filter((d) => d.figureCount > 1).length, [domains]);
  const toggleCtx = (v) => setCtx((prev) => {
    const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n;
  });

  return (
    <div className="items-view domains-view">
      <div className="items-head">
        <div className="items-head-row">
          <h2 className="items-title">Domains <span className="items-count">{visible.length}</span></h2>
          {total > visible.length ? (
            <span className="items-showcased">filtered — {visible.length} of {total}</span>
          ) : shared > 0 && (
            <span className="items-showcased">{shared} shared across figures</span>
          )}
        </div>
        <p className="items-sub">
          Spheres of governance — the realms each figure presides over.
        </p>
        <div className="items-search">
          <input
            placeholder="Filter domains…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter domains"
          />
          {q && <button className="items-search-clear" onClick={() => setQ('')} title="Clear">×</button>}
        </div>
        <window.FacetBar
          label="Context"
          options={ctxOptions}
          active={ctx}
          onToggle={toggleCtx}
          onClear={() => setCtx(new Set())}
        />
      </div>

      <div className="items-grid domains-grid">
        {revealedGroups.map(([letter, list]) => (
          // --group-h: measured ~46 px/row + ~26 px header (see styles.css).
          <div className="items-group domains-group" key={letter} style={{ '--group-h': (26 + list.length * 46) + 'px' }}>
            <h3 className="items-group-head">
              {letter} <span className="items-group-count">{list.length}</span>
            </h3>
            <div className="items-rows">
              {list.map((d) => (
                <DomainRow key={d.id} d={d} selected={d.id === selectedDomainId} onOpen={stableOpen} />
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="items-empty">
            {faceted.length === 0 ? 'No domains match the active filters.' : `No domains match "${q}".`}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Domain detail sub-sections ───────────────────────────────────────────────
// Governing figures — the registry entries that preside over this sphere, with
// the context (lifelong, post-mortem…) and citation each carries.
function DomainGovernors({ holders, byId, onOpenFigure }) {
  const inReg = (holders || []).filter((h) => byId.get(h.personId));
  if (!inReg.length) return null;
  const uniqueFigures = new Set(inReg.map(h => h.personId)).size;
  return (
    <div className="section section-domain-govs">
      <h2>Governed by <span className="count">{uniqueFigures}</span></h2>
      <div className="domain-govs">
        {inReg.map((h, i) => {
          const p = byId.get(h.personId);
          const ref = h.sources && h.sources[0] && h.sources[0].reference;
          return (
            <div className="domain-gov" key={h.personId + '-' + i}>
              <button className="domain-gov-who" onClick={() => onOpenFigure(h.personId)}>
                <window.TierIcon type={p.type} size={12} />
                <span className="domain-gov-name">{window.displayName(p)}</span>
                <span className="domain-gov-meta">{p.tradition}</span>
                {h.contextTag && <span className="domain-gov-ctx">{humanizeDom(h.contextTag)}</span>}
              </button>
              {h.notes && <div className="domain-gov-note">{h.notes}</div>}
              {ref && <div className="domain-gov-cite">{ref}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DomainSources({ sources }) {
  if (!sources || !sources.length) return null;
  return (
    <div className="section section-domain-sources">
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

// ── Domain detail slide-over ─────────────────────────────────────────────────
function DomainDetail({ domain, byId, onClose, onPrev, onNext, canPrev, canNext, onOpenFigure }) {
  const [local, setLocal] = __dmState(domain || null);
  const [closing, setClosing] = __dmState(false);
  const panelRef = __dmRef(null);
  const openerRef = __dmRef(null);

  __dmEff(() => {
    if (domain) { setLocal(domain); setClosing(false); return; }
    if (local) {
      setClosing(true);
      const t = setTimeout(() => {
        setLocal(null); setClosing(false);
        const opener = openerRef.current; openerRef.current = null;
        if (opener && opener.focus && document.contains(opener)) {
          try { opener.focus({ preventScroll: true }); } catch (_) {}
        }
      }, 180);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain && domain.id]);

  const hadRef = __dmRef(false);
  __dmEff(() => {
    const has = !!local;
    if (has && !hadRef.current) {
      if (!openerRef.current) openerRef.current = document.activeElement;
      if (panelRef.current) { try { panelRef.current.focus({ preventScroll: true }); } catch (_) {} }
    }
    hadRef.current = has;
  }, [!!local]);

  __dmEff(() => {
    if (!local) return;
    const el = document.querySelector('.domain-detail .detail-scroll');
    if (el) el.scrollTop = 0;
  }, [local && local.id]);

  if (!local) return null;
  const d = local;

  return (
    <>
      <div className={'detail-backdrop' + (closing ? ' closing' : '')} onClick={onClose} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className={'detail item-detail domain-detail' + (closing ? ' closing' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={d.displayName}
      >
        <div className="detail-bar">
          <div className="nav">
            <button className="btn btn-ghost btn-sm" onClick={onPrev} disabled={canPrev === false} title="Previous (k)">↑ Prev</button>
            <button className="btn btn-ghost btn-sm" onClick={onNext} disabled={canNext === false} title="Next (j)">↓ Next</button>
          </div>
          <div className="spacer" />
          <button className="close" onClick={onClose} title="Close (esc)" aria-label="Close">×</button>
        </div>

        <div className="detail-scroll">
          <div className="detail-header">
            <div className="eyebrow">
              <span className="eyebrow-tier">Domain</span>
              {d.figureCount > 1 && <span>{d.figureCount} figures</span>}
            </div>
            <h1>{d.displayName}</h1>
            {d.term && d.term.value && (
              <div className="power-term">
                <span className={'power-term-native' + (domIsGlyph(d.term.script) ? ' glyph' : '')}>{d.term.value}</span>
                {d.term.rom && <span className="power-term-rom">{d.term.rom}</span>}
              </div>
            )}
          </div>

          <DomainGovernors holders={d.holders} byId={byId} onOpenFigure={onOpenFigure} />
          <DomainSources sources={d.sources} />
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { Domains, DomainDetail });
