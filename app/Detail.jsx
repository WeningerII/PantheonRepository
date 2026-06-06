// ═══════════════════════════════════════════════════════════════════════════
//  Detail.jsx — slide-over entry detail panel
// ═══════════════════════════════════════════════════════════════════════════

const { useEffect: __dEff, useMemo: __dMemo, useCallback: __dCb, useState: __dState } = React;

// RELATION_FAMILIES + relationFamily live on window (exposed from state.jsx)
// so they can be shared with the Graph view.

// Render any common-shape tag object (domains use { sphereId }, faculties
// use { id }, material culture uses { id, classId }, epithets vary).
function safeLabel(item) {
  if (item == null) return '—';
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (typeof item !== 'object') return String(item);
  const keys = ['id', 'sphereId', 'epithetId', 'classId', 'name', 'label', 'key', 'value', 'kind'];
  for (const k of keys) {
    if (typeof item[k] === 'string' && item[k]) return item[k];
  }
  // Last-ditch: short JSON
  try { return JSON.stringify(item).slice(0, 60); } catch (_) { return '[object]'; }
}

function RelationItem({ rel, byId, onOpen }) {
  const target = rel.personId ? byId.get(rel.personId) : null;
  // externalRef may be a string OR an object like { name, tradition } —
  // string-coerce to avoid blowing up React on unexpected shapes.
  const renderExternal = () => {
    const ext = rel.externalRef;
    if (!ext) return rel.personId || '—';
    if (typeof ext === 'string') return ext;
    if (typeof ext === 'object') {
      const name = (typeof ext.name === 'string' ? ext.name : null) || ext.id || '—';
      const trad = ext.tradition;
      return trad ? `${name} · ${trad}` : name;
    }
    return String(ext);
  };
  return (
    <div className="relation">
      <div className="kind">{String(rel.kind || '').replace(/[_-]+/g, ' ')}</div>
      <div className={'target ' + (target ? 'link' : '')} onClick={target ? () => onOpen(target.id) : null}>
        {target
          ? window.displayName(target)
          : <span className="ext">{renderExternal()}</span>}
        {rel.notes && <span className="relation-notes">{rel.notes}</span>}
      </div>
    </div>
  );
}

function Parentage({ entry, byId, onOpen }) {
  const ids = entry.parentIds || [];
  if (!ids.length) return null;
  return (
    <div className="section">
      <h2>Parentage <span className="count">{ids.length}</span></h2>
      <div className="parentage">
        {ids.map((pid) => {
          const role = entry.parentRoles?.[pid];
          const target = byId.get(pid);
          const resolved = !!target;
          return (
            <div
              key={pid}
              className={'parentage-row' + (resolved ? '' : ' unresolved')}
            >
              <div className="role">{String(role || 'parent').replace(/[_-]+/g, ' ')}</div>
              <div
                className="who"
                onClick={resolved ? () => onOpen(target.id) : null}
                role={resolved ? 'button' : undefined}
                tabIndex={resolved ? 0 : -1}
              >
                {resolved ? (
                  <>
                    <window.TierIcon type={target.type} size={12} />
                    <span className="who-name">{window.displayName(target)}</span>
                    <span className="who-meta">{target.tradition} · {window.TYPE_TIER[target.type]?.label || target.type}</span>
                  </>
                ) : (
                  <span className="who-name">{pid}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Relations({ entry, byId, onOpen }) {
  const rels = entry.relations || [];
  const grouped = __dMemo(() => {
    const g = {};
    rels.forEach(r => {
      const fam = window.relationFamily(r.kind);
      (g[fam] = g[fam] || []).push(r);
    });
    return g;
  }, [rels]);
  if (!rels.length) return null;
  const order = [...window.RELATION_FAMILIES.map(f => f.name), 'Other'];
  return (
    <div className="section">
      <h2>Relations <span className="count">{rels.length}</span></h2>
      {order.filter(n => grouped[n]?.length).map(name => (
        <div className="relations-group" key={name}>
          <h3>{name}</h3>
          <div className="relations-list">
            {grouped[name].map((r, i) => (
              <RelationItem key={i} rel={r} byId={byId} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// RichSection — replaces an earlier TagSection that was removed in the
// dead-code sweep. Renders one row per item: name (left), meta chips
// (right), notes (full-width below). `flavor` adds a section-<kind> class
// so each chapter of the detail panel can carry a distinct accent stripe.
function RichSection({ title, items, name, metas, notes, nameStyle, flavor, subSection }) {
  if (!items || !items.length) return null;
  const cls = subSection
    ? 'subsection' + (flavor ? ' section-' + flavor : '')
    : 'section' + (flavor ? ' section-' + flavor : '');
  return (
    <div className={cls}>
      <h2>{title} <span className="count">{items.length}</span></h2>
      <div className="rich-rows">
        {items.map((it, i) => {
          const n = (name ? name(it) : safeLabel(it)) || '—';
          let m = metas ? metas(it) : [];
          if (!Array.isArray(m)) m = m ? [m] : [];
          m = m.filter(x => x != null && x !== '' && (typeof x !== 'object' || Object.keys(x).length));
          const note = notes ? notes(it) : null;
          return (
            <div className="rich-row" key={i}>
              <span className={'rich-row-name' + (nameStyle ? ' ' + nameStyle : '')}>{n}</span>
              {m.length > 0 && (
                <span className="rich-row-metas">
                  {m.map((x, j) => (
                    <span key={j} className="rich-row-meta">
                      {typeof x === 'string' ? x : safeLabel(x)}
                    </span>
                  ))}
                </span>
              )}
              {note && <div className="rich-row-notes">{note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sources ──────────────────────────────────────────────────────────────
//
// Each entry's sources are an array of { claim, citations, weight }.
//   - claim     : the proposition the citations attest to ("parentage", "domain")
//   - citations : an array of { kind, reference } — kind is per-citation
//                 strength, reference is a printable shorthand
//   - weight    : the AGGREGATE strength of the claim itself
//
// The previous renderer joined citation objects with `Array.join(';')`,
// producing literal `[object Object]; [object Object]` strings on most
// entries. Below: group claims by weight; render each citation as its own
// line; flag per-citation kind only when it diverges from the claim's
// aggregate weight (otherwise it's noise).

const WEIGHT_ORDER = ['primary', 'secondary', 'tertiary', 'other'];
const WEIGHT_LABEL = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
  other: 'Other',
};

function renderCitationRef(c) {
  if (c == null) return '—';
  if (typeof c === 'string') return c;
  if (typeof c === 'object') {
    if (c.reference) return c.reference;
    if (c.id)        return c.id;
    if (c.name)      return c.name;
    try { return JSON.stringify(c); } catch (_) { return String(c); }
  }
  return String(c);
}

function Sources({ entry }) {
  const src = entry.sources || [];
  if (!src.length) return null;

  // Group claims by aggregate weight.
  const groups = { primary: [], secondary: [], tertiary: [], other: [] };
  for (const s of src) {
    const w = String(s.weight || 'other').toLowerCase();
    (groups[w] || groups.other).push(s);
  }

  // Tally citations (handles strings + objects + bare scalars).
  const totalCites = src.reduce((n, s) => {
    const arr = Array.isArray(s.citations) ? s.citations : (s.citations ? [s.citations] : []);
    return n + arr.length;
  }, 0);

  return (
    <div className="section">
      <h2>
        Sources
        <span className="count">{src.length} claim{src.length === 1 ? '' : 's'} · {totalCites} citation{totalCites === 1 ? '' : 's'}</span>
      </h2>
      <div className="sources-groups">
        {WEIGHT_ORDER.map(w => {
          const arr = groups[w];
          if (!arr.length) return null;
          return (
            <div className="sources-group" key={w}>
              <div className={'sources-group-header weight-' + w}>
                <span className="sources-group-label">{WEIGHT_LABEL[w]}</span>
                <span className="sources-group-rule" />
                <span className="sources-group-count">{arr.length} claim{arr.length === 1 ? '' : 's'}</span>
              </div>
              <div className="sources-claims">
                {arr.map((s, i) => {
                  const citations = Array.isArray(s.citations)
                    ? s.citations
                    : (s.citations ? [s.citations] : []);
                  return (
                    <div className="source-claim" key={i}>
                      <div className="source-claim-name">{s.claim || 'unattributed'}</div>
                      <div className="source-cites">
                        {citations.length === 0 && (
                          <div className="source-cite source-cite-missing">— no citation —</div>
                        )}
                        {citations.map((c, j) => {
                          const ref = renderCitationRef(c);
                          const kind = c && typeof c === 'object' ? c.kind : null;
                          // Only flag the per-citation kind when it differs
                          // from the claim's aggregate weight.
                          const flag = kind && kind.toLowerCase() !== w ? kind : null;
                          return (
                            <div className="source-cite" key={j}>
                              {flag && <span className="source-cite-kind">{flag}</span>}
                              <span className="source-cite-ref">{ref}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chapter({ label }) {
  // Quiet eyebrow that introduces a thematic block of sections — gives the
  // 8-12 detail h2 headings some rhythm. Single-word, italic serif, no
  // border or fill of its own; just a positional mark.
  return (
    <div className="chapter-mark">
      <span className="chapter-mark-rule" />
      <span className="chapter-mark-label">{label}</span>
      <span className="chapter-mark-rule" />
    </div>
  );
}

function CultBlock({ entry }) {
  const c = entry.cult;
  if (!c) return null;
  const centers   = Array.isArray(c.cultCenters) ? c.cultCenters : [];
  const festivals = Array.isArray(c.festivals)   ? c.festivals   : [];
  if (!centers.length && !festivals.length) return null;
  return (
    <div className="section section-cult-wrap">
      <h2>
        Cult
        <span className="count">
          {[
            centers.length > 0 ? `${centers.length} center${centers.length === 1 ? '' : 's'}` : null,
            festivals.length > 0 ? `${festivals.length} festival${festivals.length === 1 ? '' : 's'}` : null,
          ].filter(Boolean).join(' · ')}
        </span>
      </h2>
      {centers.length > 0 && (
        <RichSection
          flavor="cult"
          title="Centers"
          subSection
          items={centers}
          name={cc => cc.placeName || (typeof cc.name === 'string' ? cc.name : null) || cc.id || safeLabel(cc)}
          metas={cc => [cc.type, cc.period]}
          notes={cc => cc.notes}
        />
      )}
      {festivals.length > 0 && (
        <RichSection
          flavor="festivals"
          title="Festivals"
          subSection
          items={festivals}
          name={f => (typeof f.name === 'string' ? f.name : null) || f.id || safeLabel(f)}
          metas={f => [f.type, f.date]}
          notes={f => f.notes}
        />
      )}
    </div>
  );
}

function Detail({ entry: entryProp, byId, childrenOf, onClose, onPrev, onNext, onOpen, onShowInGraph }) {
  // Exit-animation state machine. When `entryProp` becomes null, we keep the
  // currently-rendered entry around for one animation frame (cubic-bezier
  // matching the slide-in), then truly unmount. When a new entry arrives
  // mid-exit, we cancel the exit and re-mount with the new entry.
  const [localEntry, setLocalEntry] = __dState(entryProp || null);
  const [closing,    setClosing]    = __dState(false);

  __dEff(() => {
    if (entryProp) {
      setLocalEntry(entryProp);
      setClosing(false);
      return;
    }
    if (localEntry) {
      setClosing(true);
      const t = setTimeout(() => {
        setLocalEntry(null);
        setClosing(false);
      }, 180);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryProp?.id]);

  __dEff(() => {
    if (!localEntry) return;
    // Reset scroll when entry changes
    const el = document.querySelector('.detail-scroll');
    if (el) el.scrollTop = 0;
  }, [localEntry?.id]);

  if (!localEntry) return null;
  // Alias so the rest of the render reads the same; the conceptual entry
  // is whichever is currently being displayed (live or mid-exit).
  const entry = localEntry;
  const tier = window.TYPE_TIER[localEntry.type];
  // Tier-color stripe on the detail panel matches the browse-row stripe,
  // giving spatial continuity when the panel opens.
  const tierStripe = tier?.color || 'transparent';
  const alts = window.altNames(entry);
  const xlit = window.transliterations(entry);
  const dates = window.getEntryDates(entry);
  const dateLine = window.formatYearRangeSigned(
    dates.textualStart ?? dates.mythicStart,
    dates.textualEnd   ?? dates.mythicEnd,
  );

  return (
    <>
      <div
        className={'detail-backdrop' + (closing ? ' closing' : '')}
        onClick={onClose}
      />
      <aside
        className={'detail' + (closing ? ' closing' : '')}
        role="dialog"
        aria-label={window.displayName(entry)}
        style={{ '--detail-tier-color': tierStripe }}
      >
        <div className="detail-bar">
          <div className="nav">
            <button className="btn btn-ghost btn-sm" onClick={onPrev} title="Previous (k)">↑ Prev</button>
            <button className="btn btn-ghost btn-sm" onClick={onNext} title="Next (j)">↓ Next</button>
          </div>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => onShowInGraph && onShowInGraph(entry)} title="View this figure's relations in the graph">
            Show in graph
          </button>
          <button className="close" onClick={onClose} title="Close (esc)" aria-label="Close">×</button>
        </div>

        <div className="detail-scroll">
          <div className="detail-header">
            <div className="eyebrow">
              <span className="eyebrow-leader">
                <window.TierIcon type={entry.type} size={14} />
                <span className={'eyebrow-tier tier-' + entry.type}>{tier?.label || entry.type || '—'}</span>
              </span>
              <span className="eyebrow-trad">
                <span
                  className="eyebrow-trad-dot"
                  style={{ background: window.colorForTradition(entry.tradition) }}
                  aria-hidden="true"
                />
                {entry.tradition || '—'}
              </span>
              {entry.primaryTradition && entry.primaryTradition !== entry.tradition && (
                <span className="orig-eyebrow eyebrow-primary">primarily {entry.primaryTradition}</span>
              )}
              {entry.sex && entry.sex !== 'indeterminate' && (
                <span>{entry.sex}</span>
              )}
              {entry.vitalStatus && (
                <span>{entry.vitalStatus}</span>
              )}
              {entry.origin && entry.origin !== 'canon' && (
                <span className="orig-eyebrow">{entry.origin.toUpperCase()}</span>
              )}
            </div>
            <h1>{window.displayName(entry)}</h1>
            {alts.length > 0 && (
              <div className="alts">{alts.join(' · ')}</div>
            )}
            {xlit.length > 0 && (
              <div className="xlits">
                {xlit.map((t, i) => (
                  <span key={i} className="xlit">
                    <span className="xlit-script">{t.script}</span>
                    <span>{t.value}</span>
                  </span>
                ))}
              </div>
            )}
            {(entry.temporal?.era || dateLine) && (
              <div className="era-bar">
                <span>{window.formatEra(entry.temporal?.era) || '—'}</span>
                {dateLine && <span className="era-bar-date">{dateLine}</span>}
              </div>
            )}
          </div>

          {entry.notes && <div className="detail-notes">{entry.notes}</div>}

          <Parentage entry={entry} byId={byId} onOpen={onOpen} />
          {window.Lineage && childrenOf && (
            <window.Lineage
              entry={entry}
              byId={byId}
              childrenOf={childrenOf}
              onPick={onOpen}
            />
          )}
          {window.Lifecycle && <window.Lifecycle entry={entry} />}
          {entry.relations?.length > 0 && <Chapter label="Network" />}
          <Relations entry={entry} byId={byId} onOpen={onOpen} />

          {(entry.domains?.length || entry.epithets?.length || entry.faculties?.length || entry.materialCulture?.length) ? (
            <Chapter label="Attributes" />
          ) : null}
          <RichSection
            flavor="domains"
            title="Domains"
            items={entry.domains}
            name={d => d.sphereId || safeLabel(d)}
            metas={d => [d.contextTag]}
            notes={d => d.notes}
          />
          <RichSection
            flavor="epithets"
            title="Epithets"
            items={entry.epithets}
            name={e => e.epithetId || (typeof e.name === 'string' ? e.name : null) || safeLabel(e)}
            metas={e => [e.language, e.transliteration, e.contextTag]}
            notes={e => e.notes}
            nameStyle="rich-row-name-epithet"
          />
          <RichSection
            flavor="faculties"
            title="Faculties"
            items={entry.faculties}
            name={f => f.id || safeLabel(f)}
            metas={f => {
              const arr = [];
              if (f.inheritability) arr.push(f.inheritability);
              if (f.domainTag)      arr.push(f.domainTag);
              if (Array.isArray(f.scopeTags)) arr.push(...f.scopeTags.slice(0, 3));
              return arr;
            }}
            notes={f => f.notes}
          />
          <RichSection
            flavor="material"
            title="Material culture"
            items={entry.materialCulture}
            name={m => m.id || safeLabel(m)}
            metas={m => [m.classId]}
            notes={m => m.notes}
          />
          {(entry.cult?.cultCenters?.length || entry.cult?.festivals?.length || entry.linguistic?.etymology) ? (
            <Chapter label="Practice & Language" />
          ) : null}
          <CultBlock entry={entry} />

          {entry.linguistic?.etymology && (
            <div className="section section-etymology">
              <h2>Etymology
                {entry.linguistic.languageFamily && (
                  <span className="etym-family">{entry.linguistic.languageFamily}</span>
                )}
              </h2>
              <div className="etym-body">
                {entry.linguistic.etymology}
              </div>
            </div>
          )}

          <Sources entry={entry} />
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { Detail });
