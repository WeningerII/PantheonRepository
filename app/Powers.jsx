// ═══════════════════════════════════════════════════════════════════════════
//  Powers.jsx — the power registry: index + power detail slide-over.
//  Where items are traced by CUSTODY (who held the object), powers are traced
//  by DESCENT — a faculty is DECLARED by the figures who wield it (attested)
//  and may be INHERITED down a bloodline. The registry is aggregated in
//  state.jsx (window.allPowers / window.powerById) from every figure's
//  faculties[] merged with the genealogical inheritance edges in
//  window.__PR.inheritedPowers; this view reads it and the detail traces the
//  declarers and the descent.
// ═══════════════════════════════════════════════════════════════════════════

const { useMemo: __pMemo, useEffect: __pEff, useState: __pState, useRef: __pRef } = React;

const humanizePow = (s) => String(s == null ? '' : s).replace(/[-_]+/g, ' ');
const POW_GLYPH = /greek|runic|futhark|cuneiform|kanji|kana|japanese|hierogl|devanagari|hebrew|arabic|chinese|hanzi|brahmi/i;
const powIsGlyph = (script) => !!script && POW_GLYPH.test(script);

// Index buckets: powers have no small categorical key (domainTag is attested on
// only a handful), so a 2,500-strong catalog is grouped by initial letter.
function powGroupKey(name) {
  const c = String(name || '').trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

// Index-row badge — a traced descent beats a plain multi-bearer count.
function powerBadge(p) {
  if (p.inheritorCount > 0) return { label: `${p.inheritorCount} inherit`, cls: 'power-badge-descent' };
  if (p.holderCount > 1) return { label: `${p.holderCount} bearers`, cls: 'power-badge-multi' };
  return null;
}

// Heritability is authored as free text — dozens of variants ("none",
// "non-inheritable", "unique-to-bearer", "patrilineal", "lineage-conferred",
// "function of the supreme god"…). Canonicalize into a small, meaningful set so
// it can be faceted and badged consistently.
const POWER_HERIT_LABEL = {
  full: 'Full', partial: 'Partial', trace: 'Trace', lineage: 'By lineage',
  shared: 'Shared', learned: 'Learned', innate: 'Innate', unique: 'Unique to bearer',
  none: 'Not heritable', unspecified: 'Unspecified', other: 'Other',
};
const POWER_HERIT_RANK = {
  full: 0, partial: 1, trace: 2, lineage: 3, shared: 4, learned: 5,
  innate: 6, unique: 7, none: 8, unspecified: 9, other: 10,
};
function powerHeritLabel(b) { return POWER_HERIT_LABEL[b] || humanizePow(b); }
function powerHeritBucket(raw) {
  const s = String(raw == null ? '' : raw).toLowerCase().trim();
  if (!s) return 'unspecified';
  if (/\bfull\b|fully|^heritable$/.test(s)) return 'full';
  if (/\bpartial\b/.test(s)) return 'partial';
  if (/\btrace\b/.test(s)) return 'trace';
  if (/linea(l|ge)|patrilineal|matrilineal|hereditary|\bdescent\b|dynast|\boffice\b|priestly|earth-priest|smith-caste|\broyal\b/.test(s)) return 'lineage';
  if (/shared|collective|class-wide|among.?kind|\bkin\b|family/.test(s)) return 'shared';
  if (/learn|cultivat|acquir|transmiss|transmit|taught|served by/.test(s)) return 'learned';
  if (/innate/.test(s)) return 'innate';
  if (/unique|personal|one.?time|prototype|to bearer|to kutkh|to big-raven|demonstrative/.test(s)) return 'unique';
  if (/none|non-?inherit|not-?inherit|not inherit|non-?herit|non-?transfer|not transfer|\bno\b|n\/a|function of|manifest|possession|cursed|aetiolog/.test(s)) return 'none';
  return 'other';
}

// ── Powers index ─────────────────────────────────────────────────────────────
function PowersView({ powers, total, byId, selectedPowerId, onOpenPower, onVisibleOrder }) {
  const [q, setQ] = __pState('');
  const [herit, setHerit] = __pState(() => new Set());

  const heritOptions = __pMemo(
    () => window.buildFacetOptions(powers, (p) => powerHeritBucket(p.inheritability), powerHeritLabel, POWER_HERIT_RANK),
    [powers]);
  const faceted = __pMemo(
    () => (herit.size ? powers.filter((p) => herit.has(powerHeritBucket(p.inheritability))) : powers),
    [powers, herit]);

  const groups = __pMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = !query ? faceted : faceted.filter((p) => {
      const hay = [p.displayName, p.id, p.domainTag, p.term && p.term.value,
        ...(p.scopeTags || [])].join(' ').toLowerCase();
      return hay.includes(query);
    });
    const byLetter = new Map();
    for (const p of filtered) {
      const k = powGroupKey(p.displayName);
      if (!byLetter.has(k)) byLetter.set(k, []);
      byLetter.get(k).push(p);
    }
    return [...byLetter.entries()].sort((a, b) =>
      (a[0] === '#' ? 1 : 0) - (b[0] === '#' ? 1 : 0) || a[0].localeCompare(b[0]));
  }, [faceted, q]);

  __pEff(() => {
    if (!onVisibleOrder) return;
    const ids = [];
    for (const [, list] of groups) for (const p of list) ids.push(p.id);
    onVisibleOrder(ids);
  }, [groups, onVisibleOrder]);

  const heritable = __pMemo(() => powers.filter((p) => p.inheritorCount > 0).length, [powers]);
  const toggleHerit = (v) => setHerit((prev) => {
    const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n;
  });

  return (
    <div className="items-view powers-view">
      <div className="items-head">
        <div className="items-head-row">
          <h2 className="items-title">Powers <span className="items-count">{faceted.length}</span></h2>
          {total > faceted.length ? (
            <span className="items-showcased">filtered — {faceted.length} of {total}</span>
          ) : heritable > 0 && (
            <span className="items-showcased">{heritable} traced down a bloodline</span>
          )}
        </div>
        <p className="items-sub">
          Faculties across the pantheon — who wields each, and how it descends by blood.
        </p>
        <div className="items-search">
          <input
            placeholder="Filter powers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter powers"
          />
          {q && <button className="items-search-clear" onClick={() => setQ('')} title="Clear">×</button>}
        </div>
        <window.FacetBar
          label="Heritability"
          options={heritOptions}
          active={herit}
          onToggle={toggleHerit}
          onClear={() => setHerit(new Set())}
        />
      </div>

      <div className="items-grid powers-grid">
        {groups.map(([letter, list]) => (
          <div className="items-group powers-group" key={letter}>
            <h3 className="items-group-head">
              {letter} <span className="items-group-count">{list.length}</span>
            </h3>
            <div className="items-rows">
              {list.map((p) => {
                const badge = powerBadge(p);
                const hb = powerHeritBucket(p.inheritability);
                return (
                  <button
                    key={p.id}
                    className={'item-row power-index-row' + (p.id === selectedPowerId ? ' on' : '')}
                    onClick={() => onOpenPower(p.id)}
                  >
                    <span className={'item-row-name' + (powIsGlyph(p.term && p.term.script) ? ' glyph' : '')}>
                      {p.displayName}
                    </span>
                    <span className="item-row-meta">
                      {p.domainTag && <span className="item-row-class">{humanizePow(p.domainTag)}</span>}
                      {hb !== 'none' && hb !== 'unspecified' && (
                        <span className={'power-herit herit-' + hb}>{powerHeritLabel(hb)}</span>
                      )}
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
            {faceted.length === 0 ? 'No powers match the active filters.' : `No powers match "${q}".`}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Power detail sub-sections ────────────────────────────────────────────────
// Declarers — the figures who actually wield the faculty (attested, the roots
// of any descent). The concrete cross-link back to figure entries.
function PowerBearers({ holders, byId, onOpenFigure }) {
  const inReg = (holders || []).filter((h) => byId.get(h.personId));
  if (!inReg.length) return null;
  return (
    <div className="section section-power-bearers">
      <h2>Wielded by <span className="count">{inReg.length}</span></h2>
      <div className="power-bearers">
        {inReg.map((h, i) => {
          const p = byId.get(h.personId);
          return (
            <button className="power-bearer" key={h.personId + '-' + i} onClick={() => onOpenFigure(h.personId)}>
              <window.TierIcon type={p.type} size={12} />
              <span className="power-bearer-name">{window.displayName(p)}</span>
              <span className="power-bearer-meta">{p.tradition}</span>
              {h.inheritability && h.inheritability !== 'none' && (
                <span className={'power-herit herit-' + h.inheritability}>{h.inheritability}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The descent — the faculty's biography down a bloodline. Each edge links the
// heir to the ancestor it descends from (a candidate inheritance, not attested).
function PowerDescent({ inheritors, byId, onOpenFigure }) {
  if (!inheritors || !inheritors.length) return null;
  const genLabel = (g) => (g === 1 ? 'parent' : g === 2 ? 'grandparent' : `${g} generations up`);
  const sorted = [...inheritors].sort((a, b) => (a.generation - b.generation));
  return (
    <div className="section section-power-descent">
      <h2>Descent <span className="count">{inheritors.length}</span>
        <span className="power-descent-note">candidate — by bloodline, not attested</span>
      </h2>
      <ol className="power-descent">
        {sorted.map((c, i) => {
          const heir = byId.get(c.personId);
          const anc = c.fromAncestorId ? byId.get(c.fromAncestorId) : null;
          return (
            <li className="power-descent-step" key={(c.personId || '') + '-' + i}>
              <span className={'power-cand-level level-' + c.level}>{c.level}</span>
              <span className="power-descent-who">
                {heir ? (
                  <span className="link" {...window.pressable(() => onOpenFigure(c.personId), 'link')}>
                    {window.displayName(heir)}
                  </span>
                ) : (c.personId || '—')}
              </span>
              <span className="power-descent-from">
                via {anc ? (
                  <span className="link" {...window.pressable(() => onOpenFigure(c.fromAncestorId), 'link')}>
                    {window.displayName(anc)}
                  </span>
                ) : (c.fromAncestorId || '—')}{' · '}{genLabel(c.generation)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PowerScopes({ scopeTags }) {
  if (!scopeTags || !scopeTags.length) return null;
  return (
    <div className="section section-power-scopes">
      <h2>Scope <span className="count">{scopeTags.length}</span></h2>
      <div className="power-scopes">
        {scopeTags.map((t, i) => <span className="power-scope" key={i}>{humanizePow(t)}</span>)}
      </div>
    </div>
  );
}

function PowerSources({ sources }) {
  if (!sources || !sources.length) return null;
  return (
    <div className="section section-power-sources">
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

// ── Power detail slide-over ──────────────────────────────────────────────────
function PowerDetail({ power, byId, onClose, onPrev, onNext, onOpenFigure }) {
  const [local, setLocal] = __pState(power || null);
  const [closing, setClosing] = __pState(false);
  const panelRef = __pRef(null);
  const openerRef = __pRef(null);

  __pEff(() => {
    if (power) { setLocal(power); setClosing(false); return; }
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
  }, [power && power.id]);

  const hadRef = __pRef(false);
  __pEff(() => {
    const has = !!local;
    if (has && !hadRef.current) {
      if (!openerRef.current) openerRef.current = document.activeElement;
      if (panelRef.current) { try { panelRef.current.focus({ preventScroll: true }); } catch (_) {} }
    }
    hadRef.current = has;
  }, [!!local]);

  __pEff(() => {
    if (!local) return;
    const el = document.querySelector('.power-detail .detail-scroll');
    if (el) el.scrollTop = 0;
  }, [local && local.id]);

  if (!local) return null;
  const p = local;

  return (
    <>
      <div className={'detail-backdrop' + (closing ? ' closing' : '')} onClick={onClose} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className={'detail item-detail power-detail' + (closing ? ' closing' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={p.displayName}
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
              <span className="eyebrow-tier">Power</span>
              {p.domainTag && <span>{humanizePow(p.domainTag)}</span>}
              {p.inheritability && (
                <span className={'power-herit herit-' + p.inheritability}>
                  {p.inheritability === 'none' ? 'not heritable' : p.inheritability + ' heritable'}
                </span>
              )}
            </div>
            <h1>{p.displayName}</h1>
            {p.term && p.term.value && (
              <div className="power-term">
                <span className={'power-term-native' + (powIsGlyph(p.term.script) ? ' glyph' : '')}>{p.term.value}</span>
                {p.term.rom && <span className="power-term-rom">{p.term.rom}</span>}
              </div>
            )}
          </div>

          <PowerBearers holders={p.holders} byId={byId} onOpenFigure={onOpenFigure} />
          <PowerDescent inheritors={p.inheritors} byId={byId} onOpenFigure={onOpenFigure} />
          <PowerScopes scopeTags={p.scopeTags} />
          <PowerSources sources={p.sources} />
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { PowersView, PowerDetail });
