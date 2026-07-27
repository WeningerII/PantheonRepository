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
//  not inline noise. Origin column is dropped — non-canon entries are a
//  rare exception, and those surface as an inline "ORIG" badge in the
//  name cell.
//
//  Sort-aware grouping: A→Z gets letter section headers; sort-by-tradition
//  gets tradition headers; etc. Headers sticky beneath the column thead so
//  position is always anchored when scrolling.
// ═══════════════════════════════════════════════════════════════════════════

const { useRef: __bRef, useEffect: __bEff, useMemo: __bMemo, useState: __bState } = React;

// ── Demand-driven row reveal ───────────────────────────────────────────
// Mount a screenful, then grow only as the reader scrolls. This used to be
// an unconditional rAF ramp that walked to the end of the corpus on every
// load; at 5,721 figures that committed 100,167 elements / 151,797
// LayoutObjects and accounted for 92% of all Style & Layout time. Cost is
// linear in MOUNTED rows (~1.15 ms/figure at mobile 4x CPU), so the ramp
// also scaled straight into the corpus: ~15 s of mobile layout at 10,000
// figures. It additionally pushed Lighthouse's axe sweep — one evaluate
// under a hard 60,000 ms protocol timeout — from ~1 s to 55-154 s
// depending on form factor and CPU, erroring `document-title`/`image-alt`
// and nulling the whole Accessibility and SEO categories.
//
// Three things now grow the window, all in the effects below: the scroll
// sentinel (the normal path), a ramp that chases a distant cursor target
// (deep links), and a ratchet that persists whatever either produced.
//
// KNOWN TRADE: the browser's own Ctrl+F only reaches mounted rows. The
// app's search covers the full corpus regardless; native find does not.
// The scrollbar thumb also grows as you scroll. Both were accepted
// deliberately — see docs/load-performance-findings.md §3.1.
//
// REVEAL_BATCH stays at 500: layout is linear rather than rows²/batch (an
// earlier comment here claimed quadratic; measured ratio between batch=250
// and batch=5,721 is 1.24x, not ~11x), and 500 sits at the blocking-time
// minimum — longest single task is 202/253/635/1,795 ms across
// 250/500/2000/5721.
const REVEAL_FIRST = 150;
const REVEAL_BATCH = 500;
// jsdom escape hatch: the test harness asserts thousands of rows are
// present after a single synchronous flush, and its requestAnimationFrame
// is a setTimeout stub that would need one flush per batch. Without a real
// renderer there is no frame budget to protect, so under jsdom — or
// wherever requestAnimationFrame is missing — reveal every row in one
// commit.
const REVEAL_ALL =
  typeof window.requestAnimationFrame !== 'function' ||
  /jsdom/i.test((window.navigator && window.navigator.userAgent) || '');

const BrowseRow = React.memo(function BrowseRow({ entry, idx, cursor, selected, onOpen, onHover }) {
  const ref = __bRef(null);
  __bEff(() => {
    // Only auto-scroll for keyboard-driven cursor moves. Scrolling on a
    // hover-driven move slides new rows under the parked pointer, which
    // fires another mouseenter and cascades.
    if (Date.now() - (window.__kbNavTs || 0) > 400) return;
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

  const dateRange = window.entryDateRange(dates);

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
      onClick={() => onOpen(entry.id, idx)}
      onMouseEnter={() => { if (onHover) onHover(idx); if (window.__PR && window.__PR.loadDetail) window.__PR.loadDetail(entry.id); }}
      onPointerDown={() => { if (window.__PR && window.__PR.loadDetail) window.__PR.loadDetail(entry.id); }}
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
});

// ── Sort-aware grouping ────────────────────────────────────────────────

function groupKeyForEntry(entry, sortMode) {
  switch (sortMode) {
    case 'alpha': {
      // Use the same normalization as the alpha sort comparator so the group
      // key always matches the sort position. nameForAlphaSort folds ligatures
      // (Æ→AE, Þ→Th, Ø→O, etc.) that NFD alone doesn't handle --
      // without it "Ægir" sorts in the A section but groups as 'G'.
      const normalized = window.nameForAlphaSort(entry).replace(/^[^A-Za-z]+/, '');
      const ch = (normalized[0] || '#').toUpperCase();
      return /[A-Z]/.test(ch) ? ch : '#';
    }
    case 'tradition': return entry.tradition || 'Unsorted';
    case 'era':       return window.eraBandForYear(window.entryAnchorYear(entry));
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

  // Stable row callbacks so React.memo(BrowseRow) actually skips re-renders:
  // the inline handlers from Shell/useSelection are fresh objects each render.
  const onOpenRef = __bRef(null);  onOpenRef.current = onOpen;
  const onHoverRef = __bRef(null); onHoverRef.current = setCursorIdx;
  const stableOpen = __bMemo(() => (id, idx) => onOpenRef.current && onOpenRef.current(id, idx), []);
  const stableHover = __bMemo(() => (idx) => {
    // Keyboard navigation owns the cursor for a beat after each keypress —
    // ignore the mouseenters produced by rows sliding under a parked pointer.
    if (Date.now() - (window.__kbNavTs || 0) < 400) return;
    onHoverRef.current && onHoverRef.current(idx);
  }, []);

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

  // Reveal window: how many leading rows of `filtered` are mounted. Keyed to
  // the exact list it was measured against so any filter/sort change resets
  // to the first screenful of the NEW result set — the render-phase setState
  // re-renders before commit, so a stale window never paints.
  //
  // ID-IDENTICAL refreshes keep the window. A data tier installing mid-load
  // (atlas, edges) rebuilds the people array — same ids, same order, only
  // the record objects enriched in place. Collapsing the mounted window back
  // to REVEAL_FIRST on those refreshes unmounted thousands of already-shown
  // rows and regrew them batch by batch, twice, right after first paint —
  // the "list snaps during initial load" bug. Only a genuinely different
  // result set (filter/search/sort — different ids or order) resets.
  const [reveal, setReveal] = __bState({ list: filtered, count: REVEAL_ALL ? Infinity : REVEAL_FIRST });
  if (reveal.list !== filtered) {
    const sameRows = reveal.list.length === filtered.length
      && reveal.list.every((p, i) => p.id === filtered[i].id);
    setReveal({ list: filtered, count: sameRows ? reveal.count : (REVEAL_ALL ? Infinity : REVEAL_FIRST) });
  }

  // Keyboard nav and deep links address rows by index into `filtered` (data,
  // not DOM), but the cursor/selected row must be mounted for its highlight
  // and auto-scroll to exist — grow the window through both indices in the
  // same commit. Coverage is suppressed for the one commit where `filtered`
  // just changed: useSelection resets cursorIdx in an effect AFTER that
  // commit, so until then the cursor still indexes the OLD list and a stale
  // deep cursor would force a full-size reveal — the exact commit cost this
  // window exists to avoid.
  const selIdx = __bMemo(
    () => (selectedId ? filtered.findIndex(p => p.id === selectedId) : -1),
    [filtered, selectedId]
  );
  const coverListRef = __bRef(filtered);
  __bEff(() => { coverListRef.current = filtered; });
  const coverIdx = coverListRef.current === filtered ? Math.max(cursorIdx, selIdx) : -1;
  const base = reveal.list === filtered ? reveal.count : (REVEAL_ALL ? Infinity : REVEAL_FIRST);
  // Synchronous coverage only when the cursor/selected row sits within one
  // batch of the window (j/k stepping at the frontier). A DISTANT target —
  // a deep link or cross-view jump to a row thousands deep — must not force
  // a single commit that large (measured multi-second under throttle); the
  // rAF loop below reaches it within a few frames and the highlight/scroll
  // land when the row mounts.
  const syncCover = coverIdx + 1 <= base + REVEAL_BATCH ? coverIdx + 1 : 0;
  const revealCount = Math.min(filtered.length, Math.max(base, syncCover));

  // Ratchet. `revealCount` is render-derived; `reveal.count` is what persists
  // across commits. While the ramp below was unconditional it did that
  // persisting as a side effect. Now that it only chases distant targets,
  // j/k stepping past the frontier mounts rows through `syncCover` that
  // would unmount the moment the cursor stepped back — mounted rows going
  // DOWN, which is exactly the collapse verify-coldload.cjs exists to catch.
  // Persist every gain, from whichever source.
  __bEff(() => {
    if (REVEAL_ALL) return;
    setReveal(prev => (prev.list === filtered && prev.count < revealCount
      ? { list: filtered, count: revealCount }
      : prev));
  }, [filtered, revealCount]);

  // Distant-target ramp — the surviving piece of the old unconditional
  // reveal. Deep links and cross-view jumps address rows by index into
  // `filtered`, and the highlight/auto-scroll cannot exist until that row is
  // mounted, so a target beyond the window still has to be walked to. Unlike
  // the old loop this stops as soon as the target is covered rather than
  // running on to the end of the corpus.
  __bEff(() => {
    if (REVEAL_ALL) return;
    if (coverIdx < revealCount || revealCount >= filtered.length) return;
    const raf = window.requestAnimationFrame(() => {
      setReveal(prev => (prev.list === filtered && prev.count < filtered.length
        ? { list: filtered, count: Math.min(filtered.length, Math.max(prev.count, revealCount) + REVEAL_BATCH) }
        : prev));
    });
    return () => window.cancelAnimationFrame(raf);
  }, [filtered, revealCount, coverIdx]);

  // Demand-driven growth. A sentinel sits below the last mounted row and is
  // watched against `.browse-scroll` with a screenful of margin, so the next
  // batch commits before the reader can scroll into blank space. This is what
  // replaces the old ramp: scrolling is now the only thing that mounts the
  // body of the corpus, which is why cold load stays at REVEAL_FIRST rows
  // instead of walking to 5,721.
  const sentinelRef = __bRef(null);
  const [nearEnd, setNearEnd] = __bState(false);
  __bEff(() => {
    if (REVEAL_ALL || typeof window.IntersectionObserver !== 'function') return;
    const el = sentinelRef.current;
    if (!el) return;
    // A stale `true` from the previous result set would spend one batch on
    // the new one before the observer corrected itself.
    setNearEnd(false);
    const io = new window.IntersectionObserver(
      entries => setNearEnd(entries[entries.length - 1].isIntersecting),
      { root: el.closest('.browse-scroll'), rootMargin: '800px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered]);

  // IntersectionObserver reports TRANSITIONS, so a single callback can only
  // ever buy one batch. Re-running this on `revealCount` keeps growing while
  // the sentinel remains within margin, and stops when the observer reports
  // it has been pushed back out of view.
  __bEff(() => {
    if (REVEAL_ALL || !nearEnd || revealCount >= filtered.length) return;
    const raf = window.requestAnimationFrame(() => {
      setReveal(prev => (prev.list === filtered && prev.count < filtered.length
        ? { list: filtered, count: Math.min(filtered.length, Math.max(prev.count, revealCount) + REVEAL_BATCH) }
        : prev));
    });
    return () => window.cancelAnimationFrame(raf);
  }, [filtered, revealCount, nearEnd]);

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

      {/* Focusable so the list can be scrolled from the keyboard. On the phone
          tier the column heads (and their sort buttons) are hidden, which
          leaves this scroll container with no focusable content at all —
          a keyboard user could not reach the corpus. */}
      <div className="browse-scroll" tabIndex={0} role="region" aria-label="Figures">
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
            {/* Column heads: scope=col ties them to their data cells, aria-sort
                announces which column is ordering the table, and the label sits
                in a real <button> so the sort is reachable by keyboard — the
                bare onClick on the <th> never was. */}
            <thead>
              <tr>
                {[
                  ['alpha',     'th-name',      'Name',      'Sort by name (alphabetical)'],
                  ['tradition', 'th-tradition', 'Tradition', 'Sort by tradition'],
                  ['era',       'th-era',       'Era',       'Sort by era (oldest first)'],
                ].map(([key, cls, label, hint]) => (
                  <th
                    key={key}
                    scope="col"
                    className={cls + ' th-sortable' + (sort === key ? ' th-on' : '')}
                    aria-sort={sort === key ? 'ascending' : 'none'}
                  >
                    <button type="button" className="th-sort" onClick={() => setSort(key)} title={hint}>
                      {label} {sort === key && <span className="th-on-mark">↓</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const out = [];
                let lastKey = null;
                let groupIdx = -1;
                // Only the revealed prefix mounts. Row indices and group
                // headers match the full-list render exactly because the
                // window is always a prefix of `filtered`.
                for (let idx = 0; idx < revealCount; idx++) {
                  const entry = filtered[idx];
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
                      onOpen={stableOpen}
                      onHover={stableHover}
                    />
                  );
                }
                return out;
              })()}
            </tbody>
          </table>
        )}
        {/* Growth sentinel. Rendered unconditionally so the observer always
            has a node to watch; on an empty result set the growth effect
            short-circuits on `revealCount >= filtered.length` anyway. Sits
            outside the table because a <div> is not valid table content. */}
        <div ref={sentinelRef} className="browse-sentinel" aria-hidden="true" />
      </div>
    </>
  );
}

Object.assign(window, { Browse });
