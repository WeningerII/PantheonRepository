// ═══════════════════════════════════════════════════════════════════════════
//  Browse.jsx — dense table view
//
//  Each row carries three axes of meaning, each preattentively distinct:
//    1. Type tier  — 3px left-edge stripe + filled type-chip beside name
//    2. Tradition  — pigment dot beside the tradition name
//    3. Era        — name in mono caps, date range in tabular-nums serif
//
//  Name is the visual hero (serif, weight 500, 14.5px). Alt names and
//  transliterations sit underneath in italic serif as a real sub-line,
//  not inline noise. Origin column is dropped — only 3 of 601 entries
//  are non-canon, and those surface as an inline "ORIG" badge in the
//  name cell.
//
//  Sort-aware grouping: A→Z gets letter section headers; sort-by-tradition
//  gets tradition headers; etc. Headers sticky beneath the column thead so
//  position is always anchored when scrolling.
// ═══════════════════════════════════════════════════════════════════════════

const { useRef: __bRef, useEffect: __bEff, useMemo: __bMemo } = React;

function BrowseRow({ entry, idx, cursor, selected, onOpen, onHover }) {
  const ref = __bRef(null);
  __bEff(() => {
    if (cursor && ref.current) {
      const el = ref.current;
      const rect = el.getBoundingClientRect();
      const scroller = el.closest('.browse-scroll');
      if (!scroller) return;
      const sRect = scroller.getBoundingClientRect();
      const topOffset = 64;
      if (rect.top < sRect.top + topOffset + 4) {
        scroller.scrollTop -= (sRect.top + topOffset + 4 - rect.top);
      } else if (rect.bottom > sRect.bottom - 8) {
        scroller.scrollTop += (rect.bottom - sRect.bottom + 8);
      }
    }
  }, [cursor]);

  const tier = window.TYPE_TIER[entry.type];
  const alts = window.altNames(entry);
  const xlits = window.transliterations(entry);
  const dates = window.getEntryDates(entry);
  const eraLabel = window.formatEra(entry.temporal?.era);
  const tradPigment = window.colorForTradition(entry.tradition);

  const dateRange =
    window.formatYearRangeSigned(dates.mythicStart, dates.mythicEnd) ||
    window.formatYearRangeSigned(dates.textualStart, dates.textualEnd) || null;

  const altDisplay = (() => {
    if (!alts.length) return null;
    const shown = alts.slice(0, 2).join(' / ');
    return alts.length > 2 ? `${shown} +${alts.length - 2}` : shown;
  })();
  const xlitDisplay = xlits.length ? xlits[0].value : null;
  const hasSubLine = !!(altDisplay || xlitDisplay);

  return (
    <tr
      ref={ref}
      className={(cursor ? 'cursor ' : '') + (selected ? 'selected ' : '') + 'type-row-' + entry.type}
      onClick={() => onOpen(entry.id)}
      onMouseEnter={() => onHover && onHover(idx)}
    >
      <td className="cell-name">
        <div className="name-line">
          <window.TierIcon type={entry.type} size={18} title={tier?.label} />
          <span className="name-text">{window.displayName(entry)}</span>
          {entry.origin && entry.origin !== 'canon' && (
            <span className="orig-flag">{entry.origin}</span>
          )}
        </div>
        {hasSubLine && (
          <div className="alt-line">
            {altDisplay && <span className="alt-alt">{altDisplay}</span>}
            {altDisplay && xlitDisplay && <span className="alt-sep">·</span>}
            {xlitDisplay && <span className="alt-xlit">{xlitDisplay}</span>}
          </div>
        )}
      </td>
      <td className="cell-tradition">
        <div className="cell-tradition-inner">
          <span className="trad-dot" style={{ background: tradPigment }} aria-hidden="true" />
          <span className="trad-name">{entry.tradition || '—'}</span>
        </div>
      </td>
      <td className="cell-era">
        <div className="era-name">{eraLabel || '—'}</div>
        {dateRange && <div className="era-date">{dateRange}</div>}
      </td>
    </tr>
  );
}

// ── Sort-aware grouping ────────────────────────────────────────────────

function groupKeyForEntry(entry, sortMode) {
  switch (sortMode) {
    case 'alpha': {
      // Normalize: strip diacritics (Æthelred → Aethelred), then drop any
      // leading non-letter (apostrophes, punctuation, dashes) so 'Antara
      // and Ægle don't fragment into a '#' group separate from the As.
      const name = window.displayName(entry) || '';
      const normalized = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^[^A-Za-z]+/, '');
      const ch = (normalized[0] || '#').toUpperCase();
      return /[A-Z]/.test(ch) ? ch : '#';
    }
    case 'tradition': return entry.tradition || 'Unsorted';
    case 'era':       return window.formatEra(entry.temporal?.era) || '—';
    case 'type':      return window.TYPE_TIER[entry.type]?.label || 'Other';
    default:          return null;
  }
}

function GroupHeader({ label, count }) {
  return (
    <tr className="browse-group-header">
      <td colSpan={3}>
        <div className="group-inner">
          <span className="group-label">{label}</span>
          <span className="group-count">{count}</span>
          <span className="group-rule" />
        </div>
      </td>
    </tr>
  );
}

function Browse({ filters, selection, onOpen }) {
  const { filtered, sort, setSort, query, setQuery, types, setTypes, traditions, setTraditions, origin, setOrigin } = filters;
  const { cursorIdx, setCursorIdx, selectedId } = selection;

  // Pre-compute group boundaries so each row knows whether to emit a
  // group header before it, and the header knows the group's row count.
  const grouping = __bMemo(() => {
    const groups = [];
    let cur = null;
    filtered.forEach((entry) => {
      const key = groupKeyForEntry(entry, sort);
      if (!cur || cur.key !== key) {
        cur = { key, count: 0 };
        groups.push(cur);
      }
      cur.count++;
    });
    return groups;
  }, [filtered, sort]);

  // Build a compact list of active-filter chips so the user always sees
  // what's narrowing the result count and can shake any one off.
  const activeChips = [];
  if (query) {
    activeChips.push({ key: 'q', label: `"${query}"`, clear: () => setQuery('') });
  }
  if (types.size) {
    activeChips.push({
      key: 'types',
      label: types.size === 1 ? window.TYPE_TIER[[...types][0]]?.label || [...types][0] : `${types.size} types`,
      clear: () => setTypes(new Set()),
    });
  }
  if (origin !== 'both') {
    activeChips.push({ key: 'origin', label: origin, clear: () => setOrigin('both') });
  }
  if (traditions.size) {
    activeChips.push({
      key: 'trads',
      label: traditions.size === 1 ? [...traditions][0] : `${traditions.size} traditions`,
      clear: () => setTraditions(new Set()),
    });
  }

  return (
    <>
      <div className="browse-head">
        <div className="filter-summary">
          <span className="figcount">{filtered.length.toLocaleString()}</span>
          <span className="figunit">figures</span>
        </div>
        {activeChips.length > 0 && (
          <div className="filter-chips">
            {activeChips.map(c => (
              <button key={c.key} className="filter-chip" onClick={c.clear} title={`Clear ${c.label}`}>
                <span>{c.label}</span>
              </button>
            ))}
            {activeChips.length >= 2 && (
              <button
                className="filter-chip filter-chip-clear-all"
                onClick={() => filters.reset()}
                title="Clear every active filter"
              >Clear all</button>
            )}
          </div>
        )}
        <div className="spacer" />
        <div className="sort-control">
          <span className="sort-label">Sort</span>
          <div className="btn-group sort-group" role="radiogroup" aria-label="Sort order">
            {Object.entries(window.SORTS).map(([k, v]) => (
              <button
                key={k}
                className={'btn btn-sm' + (sort === k ? ' btn-on' : '')}
                onClick={() => setSort(k)}
                role="radio"
                aria-checked={sort === k}
                title={`Sort ${v.label.toLowerCase()}`}
              >{v.short || v.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="browse-scroll">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-mark" aria-hidden="true" />
            <h2>Nothing matches.</h2>
            <p>Loosen a filter or clear the search.</p>
            <div className="empty-actions">
              {activeChips.length > 0 && (
                <button className="btn btn-sm" onClick={() => filters.reset()}>Reset filters</button>
              )}
            </div>
          </div>
        ) : (
          <table className="browse-table">
            <thead>
              <tr>
                <th
                  className={'th-name th-sortable' + (sort === 'alpha' ? ' th-on' : '')}
                  onClick={() => setSort('alpha')}
                  title="Sort by name (alphabetical)"
                >Name {sort === 'alpha' && <span className="th-on-mark">↓</span>}</th>
                <th
                  className={'th-tradition th-sortable' + (sort === 'tradition' ? ' th-on' : '')}
                  onClick={() => setSort('tradition')}
                  title="Sort by tradition"
                >Tradition {sort === 'tradition' && <span className="th-on-mark">↓</span>}</th>
                <th
                  className={'th-era th-sortable' + (sort === 'era' ? ' th-on' : '')}
                  onClick={() => setSort('era')}
                  title="Sort by era (oldest first)"
                >Era {sort === 'era' && <span className="th-on-mark">↓</span>}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const out = [];
                let lastKey = null;
                let groupIdx = -1;
                filtered.forEach((entry, idx) => {
                  const key = groupKeyForEntry(entry, sort);
                  if (key !== lastKey) {
                    groupIdx++;
                    out.push(
                      <GroupHeader
                        key={'g-' + key + '-' + groupIdx}
                        label={key}
                        count={grouping[groupIdx]?.count}
                      />
                    );
                    lastKey = key;
                  }
                  out.push(
                    <BrowseRow
                      key={entry.id || idx}
                      entry={entry}
                      idx={idx}
                      cursor={idx === cursorIdx}
                      selected={entry.id === selectedId}
                      onOpen={onOpen}
                      onHover={setCursorIdx}
                    />
                  );
                });
                return out;
              })()}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

Object.assign(window, { Browse });
