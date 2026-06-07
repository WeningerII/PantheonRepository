// ═══════════════════════════════════════════════════════════════════════════
//  Shell.jsx — top bar, left rail, main column. Owns keyboard nav.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: __sState, useEffect: __sEff, useRef: __sRef, useCallback: __sCb, useMemo: __sMemo } = React;

function TopBar({ totalCount, view, setView, query, setQuery, searchRef, onCmdK }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div className="mark" aria-hidden="true" />
        <div className="name">Pantheon Registry</div>
        <div className="meta">{totalCount.toLocaleString()} figures</div>
      </div>
      <div className="topbar-search">
        <svg className="search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <line x1="10.3" y1="10.3" x2="14" y2="14" strokeLinecap="round" />
        </svg>
        <input
          ref={searchRef}
          placeholder="Search figures, alt names, traditions…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search registry"
        />
        {query && (
          <button className="topbar-search-clear" onClick={() => setQuery('')} title="Clear (esc)">clear</button>
        )}
        <span className="kbd" title="Press / to focus search">/</span>
      </div>
      <div className="topbar-actions">
        <button className="btn btn-ghost" onClick={onCmdK} title="Find a figure by name (⌘K)">
          Find<span className="kbd-hint">⌘K</span>
        </button>
        <div className="btn-group" role="tablist" aria-label="View">
          <button className={'btn' + (view === 'browse' ? ' btn-on' : '')} onClick={() => setView('browse')} role="tab" aria-selected={view === 'browse'}>Browse</button>
          <button className={'btn' + (view === 'graph'  ? ' btn-on' : '')} onClick={() => setView('graph')}  role="tab" aria-selected={view === 'graph'}>Graph</button>
          <button className={'btn' + (view === 'atlas'  ? ' btn-on' : '')} onClick={() => setView('atlas')}  role="tab" aria-selected={view === 'atlas'}>Atlas</button>
          <button className={'btn' + (view === 'items'  ? ' btn-on' : '')} onClick={() => setView('items')}  role="tab" aria-selected={view === 'items'}>Items</button>
        </div>
      </div>
    </div>
  );
}

function Rail({ filters, view, hasDetail }) {
  const {
    types, toggleType, typeCounts,
    origin, setOrigin,
    traditions, toggleTradition, setTraditions,
    traditionList,
    reset,
  } = filters;

  const [tradQuery, setTradQuery] = __sState('');
  const tradFiltered = __sMemo(() => {
    const q = tradQuery.trim().toLowerCase();
    const list = !q
      ? traditionList
      : traditionList.filter(t => t.name.toLowerCase().includes(q));
    // Pin currently-active traditions to the top so the user always sees
    // what they've selected, even when the list runs to 50+ entries. A
    // stable secondary order preserves the alphabetical input order
    // within each partition. The {separator: true} marker injects a
    // visual break between the active block and the rest.
    if (!traditions.size) return list;
    const on = [], off = [];
    for (const t of list) {
      (traditions.has(t.name) ? on : off).push(t);
    }
    if (on.length && off.length) return [...on, { separator: true }, ...off];
    return [...on, ...off];
  }, [tradQuery, traditionList, traditions]);

  // Total figure count and active filter counts inform the rail header
  // labels — gives the user constant feedback on how aggressively each
  // axis is narrowing the result set.
  const totalActiveTypes = types.size;
  const totalTradActive = traditions.size;

  const typeRow = (t) => {
    const tier = window.TYPE_TIER[t];
    const on = types.has(t);
    return (
      <div className={'rail-row ' + (on ? 'on' : '')} key={t} onClick={() => toggleType(t)} role="checkbox" aria-checked={on} tabIndex={0}
        title={tier.desc}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleType(t); } }}>
        <span className="tick" aria-hidden="true" />
        <window.TierIcon type={t} size={14} />
        <span className="rail-tier-label">{tier.label}</span>
        <span className="count">{typeCounts[t] || 0}</span>
      </div>
    );
  };

  return (
    <>
      <div className="rail-section">
        <h3>Type
          {totalActiveTypes > 0 && <button className="clear" onClick={() => filters.setTypes(new Set())}>clear ({totalActiveTypes})</button>}
        </h3>
        {window.TYPE_ORDER.map(typeRow)}
      </div>

      <div className="rail-section">
        <h3>Origin</h3>
        <div className="rail-segment" role="tablist">
          <button className={origin === 'both'     ? 'active' : ''} onClick={() => setOrigin('both')}     role="tab" aria-selected={origin === 'both'}>Both</button>
          <button className={origin === 'canon'    ? 'active' : ''} onClick={() => setOrigin('canon')}    role="tab" aria-selected={origin === 'canon'}>Canon</button>
          <button className={origin === 'original' ? 'active' : ''} onClick={() => setOrigin('original')} role="tab" aria-selected={origin === 'original'}>Original</button>
        </div>
      </div>

      <div className="rail-section rail-section-tradition">
        <h3>
          Tradition
          {totalTradActive > 0 ? (
            <button className="clear" onClick={() => setTraditions(new Set())}>clear ({totalTradActive})</button>
          ) : (
            <span className="rail-section-count">{traditionList.length}</span>
          )}
        </h3>
        <div className="rail-search">
          <input
            placeholder="Filter traditions…"
            value={tradQuery}
            onChange={e => setTradQuery(e.target.value)}
          />
          {tradQuery && <button className="rail-search-clear" onClick={() => setTradQuery('')} title="Clear">×</button>}
        </div>
        <div className="rail-traditions">
          {tradFiltered.map(t => {
            if (t.separator) {
              return <div key="__sep" className="rail-trad-sep" aria-hidden="true" />;
            }
            const on = traditions.has(t.name);
            return (
              <div
                key={t.name}
                className={'rail-row rail-row-trad ' + (on ? 'on' : '')}
                onClick={() => toggleTradition(t.name)}
                role="checkbox" aria-checked={on} tabIndex={0}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleTradition(t.name); } }}
              >
                <span className="tick" aria-hidden="true" />
                <span
                  className="trad-dot rail-trad-dot"
                  style={{ background: window.colorForTradition(t.name) }}
                  aria-hidden="true"
                />
                <span className="rail-trad-name">{t.name}</span>
                <span className="count">{t.count}</span>
              </div>
            );
          })}
          {tradFiltered.length === 0 && (
            <div className="rail-traditions-empty">No traditions match "{tradQuery}".</div>
          )}
        </div>
      </div>

      <div className="rail-shortcuts">
        <span className="kbd">/</span><span>focus search</span>
        <span className="kbd">⌘K</span><span>find</span>
        {view === 'browse' && (
          <>
            <span className="kbd-pair"><span className="kbd">j</span><span className="kbd">k</span></span><span>move</span>
            <span className="kbd">↵</span><span>open</span>
          </>
        )}
        {view === 'graph' && (
          <>
            <span className="kbd">⇧+drag</span><span>pan</span>
            <span className="kbd">scroll</span><span>zoom</span>
          </>
        )}
        {view === 'atlas' && (
          <>
            <span className="kbd">drag</span><span>pan</span>
            <span className="kbd">scroll</span><span>zoom</span>
          </>
        )}
        {hasDetail && (
          <>
            <span className="kbd">e</span><span>emend</span>
            <span className="kbd">esc</span><span>close</span>
          </>
        )}
        {!hasDetail && view !== 'browse' && (
          <span className="rail-shortcuts-fill" />
        )}
      </div>
    </>
  );
}

function Shell() {
  const { people, atlas, byId, childrenOf, ready } = window.useData();
  const filters = window.useFilters(people);
  const selection = window.useSelection(filters.filtered);

  const [view, setView] = __sState('browse');
  const [cmdkOpen, setCmdkOpen] = __sState(false);
  const [graphFocusId, setGraphFocusId] = __sState(null);
  const [selectedItemId, setSelectedItemId] = __sState(null);
  const searchRef = __sRef(null);

  // Item registry (built in data.js, read once). The sorted list drives the
  // Items index and the j/k navigation between open items.
  const itemList = __sMemo(() => (window.allItems ? window.allItems() : []), []);
  const selectedItem = selectedItemId && window.itemById ? window.itemById(selectedItemId) : null;

  // ── URL sync ─────────────────────────────────────────────────────────
  // Hash schema: #/<view>[/<id>]
  //   #/browse              — table only
  //   #/browse/<id>         — table + slide-over detail
  //   #/graph               — graph, no focus
  //   #/graph/<id>          — graph focused on id
  //   #/atlas               — atlas (atlas-local state stays local for now)
  //
  // Push vs replace: opening or closing a detail is a navigation (push);
  // j/k between two detail entries is a continuation (replace) so the
  // history doesn't fill with every keypress.
  const urlPrevRef = __sRef({ view: 'browse', selId: null, gFocus: null, itemId: null, initialized: false });

  const applyHash = __sCb(() => {
    const raw = (window.location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    const v = parts[0];
    if (!['browse', 'graph', 'atlas', 'items'].includes(v)) return;
    const id = parts[1] ? decodeURIComponent(parts[1]) : null;
    setView(v);
    if (v === 'browse') {
      selection.setSelectedId(id);
      setGraphFocusId(null);
      setSelectedItemId(null);
    } else if (v === 'graph') {
      setGraphFocusId(id);
      selection.setSelectedId(null);
      setSelectedItemId(null);
    } else if (v === 'items') {
      setSelectedItemId(id);
      selection.setSelectedId(null);
      setGraphFocusId(null);
    } else {
      selection.setSelectedId(null);
      setGraphFocusId(null);
      setSelectedItemId(null);
    }
  }, [selection]);

  __sEff(() => {
    applyHash();
    // popstate fires on browser back/forward; hashchange catches manual edits.
    const onPop = () => applyHash();
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  __sEff(() => {
    // Build target URL from current state
    let target = '#/' + view;
    if (view === 'browse' && selection.selectedId) {
      target += '/' + encodeURIComponent(selection.selectedId);
    } else if (view === 'graph' && graphFocusId) {
      target += '/' + encodeURIComponent(graphFocusId);
    } else if (view === 'items' && selectedItemId) {
      target += '/' + encodeURIComponent(selectedItemId);
    }
    if (target === window.location.hash) {
      urlPrevRef.current = { view, selId: selection.selectedId, gFocus: graphFocusId, itemId: selectedItemId, initialized: true };
      return;
    }
    const prev = urlPrevRef.current;
    // Replace if: same view, moving between two non-null detail entries
    // (continuation), OR if we haven't initialized yet (first paint).
    const continuation =
      prev.initialized &&
      prev.view === view &&
      (
        (view === 'browse' && prev.selId != null && selection.selectedId != null) ||
        (view === 'graph' && prev.gFocus != null && graphFocusId != null) ||
        (view === 'items' && prev.itemId != null && selectedItemId != null)
      );
    if (!prev.initialized || continuation) {
      window.history.replaceState({}, '', target);
    } else {
      window.history.pushState({}, '', target);
    }
    urlPrevRef.current = { view, selId: selection.selectedId, gFocus: graphFocusId, itemId: selectedItemId, initialized: true };
  }, [view, selection.selectedId, graphFocusId, selectedItemId]);
  // ─────────────────────────────────────────────────────────────────────

  const selectedEntry = selection.selectedId ? byId.get(selection.selectedId) : null;

  // Find current index of the selected entry within current filtered list
  const selIdxInFiltered = __sMemo(() => {
    if (!selection.selectedId) return -1;
    return filters.filtered.findIndex(p => p.id === selection.selectedId);
  }, [filters.filtered, selection.selectedId]);

  const moveSelection = __sCb((delta) => {
    if (!selectedEntry) return;
    if (selIdxInFiltered < 0) return;
    const next = filters.filtered[selIdxInFiltered + delta];
    if (next) {
      selection.setSelectedId(next.id);
      selection.setCursorIdx(selIdxInFiltered + delta);
    }
  }, [selectedEntry, selIdxInFiltered, filters.filtered]);

  // Step between open items (j/k and the detail Prev/Next buttons).
  const moveItem = __sCb((delta) => {
    if (!selectedItemId) return;
    const idx = itemList.findIndex((it) => it.id === selectedItemId);
    if (idx < 0) return;
    const next = itemList[idx + delta];
    if (next) setSelectedItemId(next.id);
  }, [selectedItemId, itemList]);

  // Open an item from anywhere (the index, or a figure's material culture).
  // Opening an item is an Items-view navigation: switch views and clear the
  // figure selection so the two slide-overs never stack.
  const openItem = __sCb((id) => {
    setView('items');
    selection.setSelectedId(null);
    setGraphFocusId(null);
    setSelectedItemId(id);
  }, [selection]);

  // Keyboard bindings. The handler is kept in a ref refreshed every render so
  // the window listener attaches exactly once yet always reads current state —
  // `filters`/`selection` are fresh objects each render, so a dependency-keyed
  // effect would add/remove the listener on every keystroke.
  const onKeyRef = __sRef(null);
  onKeyRef.current = (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    const inField = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;

    // Always-on shortcuts
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setCmdkOpen(o => !o);
      return;
    }
    if (e.key === 'Escape') {
      if (cmdkOpen) { setCmdkOpen(false); return; }
      if (selectedItemId) { setSelectedItemId(null); return; }
      if (selection.selectedId) { selection.setSelectedId(null); return; }
      if (inField) { e.target.blur(); return; }
      if (filters.query) { filters.setQuery(''); return; }
      return;
    }

    // Search-focus binding
    if (e.key === '/' && !inField) {
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }

    if (inField || cmdkOpen) return;

    // Item-detail navigation
    if (selectedItemId) {
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); moveItem(1); return; }
      if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); moveItem(-1); return; }
      return;
    }

    // Detail-open navigation
    if (selection.selectedId) {
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); return; }
      if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); moveSelection(-1); return; }
      return;
    }

    // Table navigation
    if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); selection.moveCursor(1); return; }
    if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); selection.moveCursor(-1); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = filters.filtered[selection.cursorIdx];
      if (target) selection.setSelectedId(target.id);
      return;
    }
  };
  __sEff(() => {
    const handler = (e) => onKeyRef.current && onKeyRef.current(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!ready) {
    return (
      <div className="empty empty-loading">
        <div className="empty-mark" aria-hidden="true" />
        <h2>Nothing in storage.</h2>
        <p>The seed didn't write. Reload the page to try again; if the failure persists, check the boot log.</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <TopBar
        totalCount={filters.filtered.length}
        view={view}
        setView={setView}
        query={filters.query}
        setQuery={filters.setQuery}
        searchRef={searchRef}
        onCmdK={() => setCmdkOpen(true)}
      />
      <div className="shell-body">
        <div className="shell-rail">
          <Rail filters={filters} view={view} hasDetail={!!selectedEntry} />
        </div>
        <div className="shell-main">
          {view === 'browse' && (
            <window.Browse
              filters={filters}
              selection={selection}
              onOpen={(id) => selection.setSelectedId(id)}
            />
          )}
          {view === 'graph' && (
            <window.Graph
              people={filters.filtered}
              byId={byId}
              focusId={graphFocusId}
              setFocusId={setGraphFocusId}
              onOpenDetail={(id) => selection.setSelectedId(id)}
            />
          )}
          {view === 'atlas' && (
            <window.Atlas
              atlas={atlas}
              byId={byId}
              traditionFilter={filters.traditions}
              onOpenDetail={(tradition) => {
                // "N figures →" click: drop into Browse with the tradition selected
                filters.setTraditions(new Set([tradition]));
                setView('browse');
              }}
            />
          )}
          {view === 'items' && (
            <window.Items
              items={itemList}
              byId={byId}
              selectedItemId={selectedItemId}
              onOpenItem={(id) => setSelectedItemId(id)}
            />
          )}
        </div>
      </div>

      {selectedEntry && (
        <window.Detail
          entry={selectedEntry}
          byId={byId}
          childrenOf={childrenOf}
          onClose={() => selection.setSelectedId(null)}
          onPrev={() => moveSelection(-1)}
          onNext={() => moveSelection(1)}
          onOpen={(id) => selection.setSelectedId(id)}
          onOpenItem={openItem}
          onShowInGraph={(entry) => {
            setGraphFocusId(entry.id);
            setView('graph');
            selection.setSelectedId(null);
          }}
        />
      )}

      {selectedItem && (
        <window.ItemDetail
          item={selectedItem}
          byId={byId}
          onClose={() => setSelectedItemId(null)}
          onPrev={() => moveItem(-1)}
          onNext={() => moveItem(1)}
          onOpenFigure={(id) => {
            setView('browse');
            setSelectedItemId(null);
            selection.setSelectedId(id);
          }}
        />
      )}

      {cmdkOpen && (
        <window.CommandPalette
          people={people}
          onClose={() => setCmdkOpen(false)}
          onPick={(id) => {
            // View-aware: in Graph, pick focuses the node in-place; in
            // Browse (or anywhere else), pick opens the detail panel.
            if (view === 'graph') {
              setGraphFocusId(id);
            } else {
              if (view !== 'browse') setView('browse');
              selection.setSelectedId(id);
            }
            setCmdkOpen(false);
          }}
        />
      )}
    </div>
  );
}

Object.assign(window, { Shell });
