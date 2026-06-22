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
  if (d.holderCount > 1) return { label: `${d.holderCount} figures`, cls: 'domain-badge-multi' };
  return null;
}

// ── Domains index ────────────────────────────────────────────────────────────
function Domains({ domains, total, byId, selectedDomainId, onOpenDomain, onVisibleOrder }) {
  const [q, setQ] = __dmState('');

  const groups = __dmMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = !query ? domains : domains.filter((d) => {
      const hay = [d.displayName, d.id, d.term && d.term.value,
        ...(d.contextTags || [])].join(' ').toLowerCase();
      return hay.includes(query);
    });
    const byLetter = new Map();
    for (const d of filtered) {
      const k = domGroupKey(d.displayName);
      if (!byLetter.has(k)) byLetter.set(k, []);
      byLetter.get(k).push(d);
    }
    return [...byLetter.entries()].sort((a, b) =>
      (a[0] === '#' ? 1 : 0) - (b[0] === '#' ? 1 : 0) || a[0].localeCompare(b[0]));
  }, [domains, q]);

  __dmEff(() => {
    if (!onVisibleOrder) return;
    const ids = [];
    for (const [, list] of groups) for (const d of list) ids.push(d.id);
    onVisibleOrder(ids);
  }, [groups, onVisibleOrder]);

  const shared = __dmMemo(() => domains.filter((d) => d.holderCount > 1).length, [domains]);

  return (
    <div className="items-view domains-view">
      <div className="items-head">
        <div className="items-head-row">
          <h2 className="items-title">Domains <span className="items-count">{domains.length}</span></h2>
          {total > domains.length ? (
            <span className="items-showcased">filtered — {domains.length} of {total}</span>
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
      </div>

      <div className="items-grid domains-grid">
        {groups.map(([letter, list]) => (
          <div className="items-group domains-group" key={letter}>
            <h3 className="items-group-head">
              {letter} <span className="items-group-count">{list.length}</span>
            </h3>
            <div className="items-rows">
              {list.map((d) => {
                const badge = domainBadge(d);
                return (
                  <button
                    key={d.id}
                    className={'item-row domain-index-row' + (d.id === selectedDomainId ? ' on' : '')}
                    onClick={() => onOpenDomain(d.id)}
                  >
                    <span className={'item-row-name' + (domIsGlyph(d.term && d.term.script) ? ' glyph' : '')}>
                      {d.displayName}
                    </span>
                    <span className="item-row-meta">
                      {badge && <span className={'item-badge ' + badge.cls}>{badge.label}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="items-empty">
            {domains.length === 0 ? 'No domains match the active filters.' : `No domains match "${q}".`}
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
  return (
    <div className="section section-domain-govs">
      <h2>Governed by <span className="count">{inReg.length}</span></h2>
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
function DomainDetail({ domain, byId, onClose, onPrev, onNext, onOpenFigure }) {
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
            <button className="btn btn-ghost btn-sm" onClick={onPrev} title="Previous (k)">↑ Prev</button>
            <button className="btn btn-ghost btn-sm" onClick={onNext} title="Next (j)">↓ Next</button>
          </div>
          <div className="spacer" />
          <button className="close" onClick={onClose} title="Close (esc)" aria-label="Close">×</button>
        </div>

        <div className="detail-scroll">
          <div className="detail-header">
            <div className="eyebrow">
              <span className="eyebrow-tier">Domain</span>
              {d.holderCount > 1 && <span>{d.holderCount} figures</span>}
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
