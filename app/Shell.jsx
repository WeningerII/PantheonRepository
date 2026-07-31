// ═══════════════════════════════════════════════════════════════════════════
//  Shell.jsx — top bar, left rail, main column. Owns keyboard nav.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: __sState, useEffect: __sEff, useRef: __sRef, useCallback: __sCb, useMemo: __sMemo } = React;

// Tracks the phone breakpoint (mirrors the max-width:760px CSS tier) so the
// bottom nav, the filter sheet, and the "More" sheet mount only where the
// layout actually needs them. jsdom has no matchMedia (the suite never stubs
// it), so this returns false there — the tests always exercise the desktop
// tree, and none of the mobile-only chrome renders under them.
function useIsMobile() {
  const query = '(max-width: 760px)';
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [mobile, setMobile] = __sState(() => (supported ? window.matchMedia(query).matches : false));
  __sEff(() => {
    if (!supported) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMobile(mql.matches);
    onChange();
    // addEventListener is the modern API; addListener the Safari<14 fallback.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else if (mql.removeListener) mql.removeListener(onChange);
    };
  }, [supported]);
  return mobile;
}

// Prefetch a view's registry tier as soon as the pointer or focus lands on
// its button. pr-boot.js no longer warms items/powers/domains on idle — that
// was 3 MB gz of first-load transfer for views nobody had opened — so this is
// what keeps the first Items/Powers/Domains open feeling instant. Hover-to-
// click buys 100-300 ms, focus-to-Enter more, and pointerdown covers touch,
// where there is no hover at all. loadRegistry is idempotent per kind, so
// sweeping the pointer across the whole nav costs one fetch each at most.
// One source of truth for what a route is called: the view tabs, the document
// title, and the live-region route announcement all read it, and a reader who
// hears "Graph view" then finds a tab labelled something else is being told
// two different stories. Insertion order is the tab order.
const VIEW_LABEL = {
  browse: 'Browse', graph: 'Graph', atlas: 'Atlas',
  items: 'Items', powers: 'Powers', domains: 'Domains',
};

const PREFETCH_REGISTRY = { items: 'items', powers: 'powers', domains: 'domains' };
function prefetchView(v) {
  const kind = PREFETCH_REGISTRY[v];
  const load = kind && window.__PR && window.__PR.loadRegistry;
  if (load) load(kind);
}

function TopBar({ totalCount, view, setView, query, setQuery, searchRef, onCmdK, onOpenFilter, hasFilters, onSkip }) {
  return (
    <header className="topbar">
      {/* First focusable element on the page, and inside the banner landmark
          so it is not itself stray content outside every region.
          href="#main-content" names a real target so it reads as a skip link,
          but the click is handled here — letting the browser navigate to the
          fragment would overwrite the hash route the app is addressed by. */}
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => { e.preventDefault(); onSkip(); }}
      >Skip to content</a>
      <div className="topbar-brand">
        <div className="mark" aria-hidden="true" />
        {/* The site's only h1. It carries the same type as the div it replaced
            (.topbar-brand .name), so this is a semantics-only change: a screen
            reader and a crawler both get a document title, the layout does not
            move. */}
        <h1 className="name">Pantheon Registry</h1>
        <div className="meta">{totalCount.toLocaleString()} figures</div>
      </div>
      <div className="topbar-search">
        {/* .search-field is transparent on desktop (display:contents) and
            becomes a bordered field on mobile — see styles.css. */}
        <div className="search-field">
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
        </div>
        <span className="kbd" title="Press / to focus search">/</span>
        {/* Mobile-only: opens the filter & sort sheet (the rail). Hidden ≥761px. */}
        <button
          className={'mobile-filter-btn' + (hasFilters ? ' has-filters' : '')}
          onClick={onOpenFilter}
          aria-label="Filter and sort"
          title="Filter & sort"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <line x1="2" y1="4.5" x2="9" y2="4.5" /><circle cx="11.5" cy="4.5" r="1.8" /><line x1="13.3" y1="4.5" x2="14" y2="4.5" />
            <line x1="2" y1="11.5" x2="3.5" y2="11.5" /><circle cx="5.5" cy="11.5" r="1.8" /><line x1="7.3" y1="11.5" x2="14" y2="11.5" />
          </svg>
        </button>
      </div>
      <div className="topbar-actions">
        <button className="btn btn-ghost" onClick={onCmdK} title="Find a figure by name (⌘K)">
          Find<span className="kbd-hint">⌘K</span>
        </button>
        {/* These switch routes (#/browse, #/graph, …), so they are navigation,
            not a tablist: the ARIA tab pattern owes a tabpanel, aria-controls
            and roving-tabindex arrow keys that this group never had. nav +
            aria-current="page" describes what actually happens. */}
        <nav className="btn-group" aria-label="Views">
          {Object.entries(VIEW_LABEL).map(([v, label]) => (
            <button
              key={v}
              className={'btn' + (view === v ? ' btn-on' : '')}
              onClick={() => setView(v)}
              onMouseEnter={() => prefetchView(v)}
              onFocus={() => prefetchView(v)}
              onPointerDown={() => prefetchView(v)}
              aria-current={view === v ? 'page' : undefined}
            >{label}</button>
          ))}
        </nav>
      </div>
    </header>
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
        <h2>Type
          {totalActiveTypes > 0 && <button className="clear" onClick={() => filters.setTypes(new Set())}>clear ({totalActiveTypes})</button>}
        </h2>
        {window.TYPE_ORDER.map(typeRow)}
      </div>

      <div className="rail-section">
        <h2>Origin</h2>
        {/* One-of-three filter — a radio group, matching Browse's sort control.
            It was a nameless tablist whose tabs controlled no panel. */}
        <div className="rail-segment" role="radiogroup" aria-label="Origin">
          <button className={origin === 'both'     ? 'active' : ''} onClick={() => setOrigin('both')}     role="radio" aria-checked={origin === 'both'}>Both</button>
          <button className={origin === 'canon'    ? 'active' : ''} onClick={() => setOrigin('canon')}    role="radio" aria-checked={origin === 'canon'}>Canon</button>
          <button className={origin === 'original' ? 'active' : ''} onClick={() => setOrigin('original')} role="radio" aria-checked={origin === 'original'}>Original</button>
        </div>
      </div>

      <div className="rail-section rail-section-tradition">
        <h2>
          Tradition
          {totalTradActive > 0 ? (
            <button className="clear" onClick={() => setTraditions(new Set())}>clear ({totalTradActive})</button>
          ) : (
            <span className="rail-section-count">{traditionList.length}</span>
          )}
        </h2>
        <div className="rail-search">
          <input
            placeholder="Filter traditions…"
            aria-label="Filter traditions"
            value={tradQuery}
            onChange={e => setTradQuery(e.target.value)}
          />
          {tradQuery && <button className="rail-search-clear" onClick={() => setTradQuery('')} title="Clear" aria-label="Clear the tradition filter">×</button>}
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
            <span className="kbd-pair"><span className="kbd">j</span><span className="kbd">k</span></span><span>step</span>
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

// Placeholder for the views that need the full corpus while the async shell
// is still fetching it (Browse works from the skinny index; these don't).
// Sync boots never render it — dataReady is true from the first frame.
function ViewLoading({ label }) {
  return (
    <div className="empty empty-loading" role="status" aria-live="polite">
      <div className="empty-mark" aria-hidden="true" />
      <h2>Loading the corpus…</h2>
      <p>The {label} view needs the full records — it opens as soon as they arrive.</p>
    </div>
  );
}

function Shell() {
  const { people, atlas, byId, childrenOf, ready, dataReady, corpusVersion, registryReady, registryVersion, tierReady } = window.useData();
  const filters = window.useFilters(people);
  const selection = window.useSelection(filters.filtered);
  const filteredRef = __sRef(filters.filtered);
  filteredRef.current = filters.filtered;

  const [view, __setViewRaw] = __sState('browse');
  // Deferred unmount: tearing down the outgoing view's subtree (70k nodes
  // for the Browse table, 12-18k for a registry index) costs 50-150 ms of
  // removeChild work that used to land INSIDE the switch's commit. The
  // outgoing view now stays mounted two frames behind a display:none pane,
  // then unmounts in an idle callback — off the switch's critical path.
  // jsdom (no real frames; the suite asserts the old view is gone right
  // after a switch) unmounts synchronously, exactly as before.
  const [leavingView, setLeavingView] = __sState(null);
  const viewRef = __sRef('browse');
  const leavingCancelRef = __sRef(null);
  const DEFER_UNMOUNT =
    typeof window.requestAnimationFrame === 'function' &&
    !/jsdom/i.test((window.navigator && window.navigator.userAgent) || '');
  const setView = __sCb((next) => {
    const prev = viewRef.current;
    if (prev === next) return;
    viewRef.current = next;
    if (DEFER_UNMOUNT) {
      if (leavingCancelRef.current) leavingCancelRef.current();
      setLeavingView(prev);
      let r1, r2, cancelled = false;
      r1 = window.requestAnimationFrame(() => {
        r2 = window.requestAnimationFrame(() => {
          const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 50));
          ric(() => { if (!cancelled) setLeavingView(null); });
        });
      });
      leavingCancelRef.current = () => {
        cancelled = true;
        window.cancelAnimationFrame(r1);
        if (r2) window.cancelAnimationFrame(r2);
      };
    }
    __setViewRaw(next);
  }, []);
  const [cmdkOpen, setCmdkOpen] = __sState(false);
  const [graphFocusId, setGraphFocusId] = __sState(null);
  const [atlasFocus, setAtlasFocus] = __sState(null);   // tradition name
  const [selectedItemId, setSelectedItemId] = __sState(null);
  const [selectedPowerId, setSelectedPowerId] = __sState(null);
  const [selectedDomainId, setSelectedDomainId] = __sState(null);
  // Version counters incremented by onVisibleOrder so selIdxIn*Order memos
  // recompute after the child reports a new ordered list (ref mutation alone
  // never triggers a re-render).
  const [itemOrderVer, setItemOrderVer] = __sState(0);
  const [powerOrderVer, setPowerOrderVer] = __sState(0);
  const [domainOrderVer, setDomainOrderVer] = __sState(0);
  const searchRef = __sRef(null);
  // Target of the skip link — <main> is tabIndex={-1} so it can take focus
  // programmatically without entering the tab order itself.
  const mainRef = __sRef(null);

  // ── Mobile chrome ────────────────────────────────────────────────────────
  // Below 760px the rail becomes a slide-up filter sheet and the view tabs
  // become a bottom nav (Browse/Graph/Atlas + a "More" sheet for the
  // registries). railOpen / moreOpen drive those two sheets; isMobile gates
  // whether any of the mobile-only chrome mounts at all.
  const isMobile = useIsMobile();
  const [railOpen, setRailOpen] = __sState(false);
  const [moreOpen, setMoreOpen] = __sState(false);
  // Capitalized so JSX reads it as a variable, not the literal tag "railTag".
  // See the element it renders, below.
  const RailTag = isMobile ? 'div' : 'aside';
  // Any narrowing active → the filter button wears an accent dot. Mirrors the
  // rail's own "clear" affordances (type / origin / tradition / search).
  const hasFilters =
    filters.types.size > 0 ||
    filters.origin !== 'both' ||
    filters.traditions.size > 0 ||
    filters.query.trim().length > 0;

  // Reflect the open sheet onto <body> so the CSS can scroll-lock the page
  // behind it (body.rail-open / body.more-open). Cleanup clears both on every
  // change, so a fast open→open transition never leaves a stale class.
  __sEff(() => {
    const b = typeof document !== 'undefined' ? document.body : null;
    if (!b) return;
    b.classList.toggle('rail-open', railOpen);
    b.classList.toggle('more-open', moreOpen);
    return () => { b.classList.remove('rail-open'); b.classList.remove('more-open'); };
  }, [railOpen, moreOpen]);

  // Leaving the phone tier (rotate / resize to desktop) must not strand an
  // open sheet — the desktop rail is always visible and has no dismiss.
  __sEff(() => {
    if (!isMobile) { setRailOpen(false); setMoreOpen(false); }
  }, [isMobile]);

  // Item / power / domain registry lists. Built eagerly these cost ~56 ms
  // inside the FIRST commit for views most sessions never open — so each is
  // built on the first render that needs it (its view active, or a detail id
  // set by a click or deep link) and held from then on. The latch is a ref
  // flipped during render: any flip rides a state change (view or a selected
  // id) that already triggered this render, and the memo dep picks it up in
  // the same pass — first use stays synchronous, in browsers and jsdom
  // alike. [people, corpusVersion] key the rebuild across the async corpus
  // swap: a list computed from the skinny index must not outlive it.
  const regWantRef = __sRef({ items: false, powers: false, domains: false });
  const regWant = regWantRef.current;
  if (view === 'items'   || selectedItemId   != null) regWant.items = true;
  if (view === 'powers'  || selectedPowerId  != null) regWant.powers = true;
  if (view === 'domains' || selectedDomainId != null) regWant.domains = true;
  // registryVersion keys the rebuild across the lazy tier install: a list built
  // before its tier landed (empty, or skinny-derived) must not outlive it.
  const itemList = __sMemo(() => (regWant.items && window.allItems ? window.allItems() : []), [regWant.items, people, corpusVersion, registryVersion]);
  const selectedItem = selectedItemId && window.itemById ? window.itemById(selectedItemId) : null;
  const powerList = __sMemo(() => (regWant.powers && window.allPowers ? window.allPowers() : []), [regWant.powers, people, corpusVersion, registryVersion]);
  const selectedPower = selectedPowerId && window.powerById ? window.powerById(selectedPowerId) : null;
  const domainList = __sMemo(() => (regWant.domains && window.allDomains ? window.allDomains() : []), [regWant.domains, people, corpusVersion, registryVersion]);
  const selectedDomain = selectedDomainId && window.domainById ? window.domainById(selectedDomainId) : null;

  // Fetch a registry view's own tier the moment it's wanted (its view is active
  // or a detail id is set) — this is what unblocks Items/Powers/Domains without
  // waiting on the 20 MB corpus. loadRegistry is idempotent (per-kind promise
  // cache) and absent on sync boots, where the registries are already present.
  __sEff(() => {
    const load = window.__PR && window.__PR.loadRegistry;
    if (!load) return;
    if (regWant.items) load('items');
    if (regWant.powers) load('powers');
    if (regWant.domains) load('domains');
  }, [regWant.items, regWant.powers, regWant.domains, registryVersion]);

  // Same pattern for the projection tiers: the Atlas view unblocks on the
  // atlas tier (seedAtlas + derived layers), Graph/Lineage on the edges tier
  // rehydrated over the skinny records. loadTier is idempotent and absent on
  // sync boots (where tierReady is already all-true).
  __sEff(() => {
    const load = window.__PR && window.__PR.loadTier;
    if (!load) return;
    if (view === 'atlas') load('atlas');
    if (view === 'graph') load('edges');
  }, [view, corpusVersion]);

  // Warm the deferred power/domain registries (module-cached in state.jsx)
  // off the critical path so the first Powers/Domains navigation pays
  // nothing. Browsers only — without requestIdleCallback (jsdom) the first
  // use above stays synchronous, which is what the tests exercise.
  __sEff(() => {
    if (!dataReady || typeof window.requestIdleCallback !== 'function') return;
    const idle = window.requestIdleCallback(() => {
      if (window.allPowers) window.allPowers();
      if (window.allDomains) window.allDomains();
    });
    return () => { if (window.cancelIdleCallback) window.cancelIdleCallback(idle); };
  }, [dataReady, corpusVersion]);

  // Scope the registries by the rail. The rail filters (type / origin /
  // tradition) and the figure search narrow `filters.filtered`; each registry
  // is keyed to figures through its holders, so an item/power/domain stays
  // visible whenever a connected figure survives the filter. This makes
  // selecting a pantheon narrow these views the way it already narrows
  // Browse / Graph / Atlas. No narrowing → pass the full list untouched.
  const activeFigureIds = __sMemo(() => new Set(filters.filtered.map((p) => p.id)), [filters.filtered]);
  const narrowed = filters.filtered.length < people.length;
  const visibleItems = __sMemo(() => (!narrowed ? itemList : itemList.filter((it) =>
    (it.holders || []).some((h) => activeFigureIds.has(h.personId)) ||
    (it.custody || []).some((c) => activeFigureIds.has(c.personId))
  )), [itemList, activeFigureIds, narrowed]);
  const visiblePowers = __sMemo(() => (!narrowed ? powerList : powerList.filter((p) =>
    (p.holders || []).some((h) => activeFigureIds.has(h.personId)) ||
    (p.inheritors || []).some((i) => activeFigureIds.has(i.personId))
  )), [powerList, activeFigureIds, narrowed]);
  const visibleDomains = __sMemo(() => (!narrowed ? domainList : domainList.filter((d) =>
    (d.holders || []).some((h) => activeFigureIds.has(h.personId))
  )), [domainList, activeFigureIds, narrowed]);

  // ── URL sync ─────────────────────────────────────────────────────────
  // Hash schema: #/<view>[/<id>]
  //   #/browse              — table only
  //   #/browse/<id>         — table + slide-over detail
  //   #/graph               — graph, no focus
  //   #/graph/<id>          — graph focused on id
  //   #/atlas               — atlas, no focus
  //   #/atlas/<tradition>   — atlas focused (and glided) to a territory
  //
  // Push vs replace: opening or closing a detail is a navigation (push);
  // j/k between two detail entries is a continuation (replace) so the
  // history doesn't fill with every keypress.
  const urlPrevRef = __sRef({ view: 'browse', selId: null, gFocus: null, aFocus: null, itemId: null, powerId: null, domainId: null, initialized: false });

  const applyHash = __sCb(() => {
    const raw = (window.location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    const v = parts[0];
    const known = ['browse', 'graph', 'atlas', 'items', 'powers', 'domains'].includes(v);
    // Clear every detail axis first — keeps the slide-overs mutually exclusive
    // however the hash arrives, and (crucially) collapses any open slide-over
    // when the hash is emptied or points at an unknown view. Doing this BEFORE
    // the unknown-view bail is what lets the URL-sync effect canonicalize the
    // hash instead of leaving a panel stuck open over a URL that no longer
    // describes it.
    selection.setSelectedId(null);
    selection.setCursorIdx(0);
    setGraphFocusId(null);
    setAtlasFocus(null);
    setSelectedItemId(null);
    setSelectedPowerId(null);
    setSelectedDomainId(null);
    if (!known) return;   // empty/unknown hash: keep the current view, details cleared
    // Malformed escapes (#/browse/%zz) must not crash applyHash — it runs in
    // a mount effect, so a throw here would loop the ErrorBoundary forever.
    let id = null;
    if (parts[1]) {
      try { id = decodeURIComponent(parts[1]); } catch (_) { id = parts[1]; }
    }
    setView(v);
    // Async boot, PRE-INDEX only: an id in the hash names a record that does
    // not exist yet (no seedPeople at all). Show the view now and re-apply
    // the whole hash once ready fires — which pr-boot resolves after the
    // index install (projections shell) or the corpus persist tail (legacy
    // shell), so the deferred pass sees settled records either way. The gate
    // MUST be seedPeople's absence, not dataReady: in the projections shell
    // dataReady stays false forever while ready is already resolved, and
    // gating on it re-armed this deferral in an infinite microtask loop.
    // Once records exist, ids resolve against them directly — a figure id
    // hydrates through the loadDetail effect below. Multiple hash edits
    // during the wait each queue a re-apply; every one re-reads the live
    // hash, so the last edit wins. A rejected ready is already painted into
    // the boot overlay by pr-boot — swallow it here.
    if (id && window.__PR && !window.__PR.seedPeople && window.__PR.ready) {
      window.__PR.ready.then(() => applyHashRef.current(), () => {});
      return;
    }
    if (v === 'browse') {
      selection.setSelectedId(id);
      if (id) {
        const idx = filteredRef.current.findIndex(p => p.id === id);
        if (idx >= 0) selection.setCursorIdx(idx);
      }
    } else if (v === 'graph') setGraphFocusId(id);
    else if (v === 'atlas') setAtlasFocus(id);
    else if (v === 'items') setSelectedItemId(id);
    else if (v === 'powers') setSelectedPowerId(id);
    else if (v === 'domains') setSelectedDomainId(id);
  }, [selection]);
  // The deferred re-apply must see the LATEST applyHash, not the one the
  // ready.then closure captured — a render between defer and resolve would
  // otherwise pin a stale closure. (Its setters and refs are stable, but the
  // ref costs nothing and removes the question.)
  const applyHashRef = __sRef(null);
  applyHashRef.current = applyHash;

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
    } else if (view === 'atlas' && atlasFocus) {
      target += '/' + encodeURIComponent(atlasFocus);
    } else if (view === 'items' && selectedItemId) {
      target += '/' + encodeURIComponent(selectedItemId);
    } else if (view === 'powers' && selectedPowerId) {
      target += '/' + encodeURIComponent(selectedPowerId);
    } else if (view === 'domains' && selectedDomainId) {
      target += '/' + encodeURIComponent(selectedDomainId);
    }
    if (target === window.location.hash) {
      urlPrevRef.current = { view, selId: selection.selectedId, gFocus: graphFocusId, aFocus: atlasFocus, itemId: selectedItemId, powerId: selectedPowerId, domainId: selectedDomainId, initialized: true };
      return;
    }
    const prev = urlPrevRef.current;
    if (!prev.initialized) {
      // First commit: applyHash's setState hasn't flushed yet, so state still
      // holds the defaults — writing `target` here would clobber a deep link
      // with #/browse and corrupt the history entry. The hash is the source
      // of truth at boot: only canonicalize when there is no usable hash.
      const first = (window.location.hash || '').replace(/^#\/?/, '').split('/')[0];
      if (!['browse', 'graph', 'atlas', 'items', 'powers', 'domains'].includes(first)) {
        window.history.replaceState({}, '', target);
      }
      urlPrevRef.current = { view, selId: selection.selectedId, gFocus: graphFocusId, aFocus: atlasFocus, itemId: selectedItemId, powerId: selectedPowerId, domainId: selectedDomainId, initialized: true };
      return;
    }
    // Replace if: same view, moving between two non-null detail entries
    // (continuation) so the history doesn't fill with every j/k press.
    const continuation =
      prev.view === view &&
      (
        (view === 'browse' && prev.selId != null && selection.selectedId != null) ||
        (view === 'graph' && prev.gFocus != null && graphFocusId != null) ||
        (view === 'atlas' && prev.aFocus != null && atlasFocus != null) ||
        (view === 'items' && prev.itemId != null && selectedItemId != null) ||
        (view === 'powers' && prev.powerId != null && selectedPowerId != null) ||
        (view === 'domains' && prev.domainId != null && selectedDomainId != null)
      );
    if (continuation) {
      window.history.replaceState({}, '', target);
    } else {
      window.history.pushState({}, '', target);
    }
    urlPrevRef.current = { view, selId: selection.selectedId, gFocus: graphFocusId, aFocus: atlasFocus, itemId: selectedItemId, powerId: selectedPowerId, domainId: selectedDomainId, initialized: true };
  }, [view, selection.selectedId, graphFocusId, atlasFocus, selectedItemId, selectedPowerId, selectedDomainId]);
  // ─────────────────────────────────────────────────────────────────────

  // Detail gates per FIGURE, not on the whole corpus: a record is renderable
  // when the corpus landed (dataReady) or its detail shard hydrated it
  // (_full). A row clicked during the skinny window triggers the shard fetch
  // below and the slide-over opens on the render after 'pr:tier'.
  const selectedRec = selection.selectedId ? byId.get(selection.selectedId) : null;
  const selectedEntry = (selectedRec && (dataReady || selectedRec._full)) ? selectedRec : null;

  // Fetch the selected figure's detail shard the moment it's wanted.
  // loadDetail is idempotent (per-bucket promise cache) and a resolved no-op
  // on sync boots. The edges + atlas tiers ride along so Parentage/Descent/
  // divinity render complete, not skeleton-shaped.
  // A figure whose detail shard could not be fetched, even after pr-boot
  // re-pinned the manifest. Holds the id so a stale error can never shadow a
  // different figure that opened fine; detailRetry re-runs the effect.
  const [detailError, setDetailError] = __sState(null);
  const [detailRetry, setDetailRetry] = __sState(0);

  __sEff(() => {
    const P = window.__PR;
    if (!P || !selection.selectedId || dataReady) return;
    const id = selection.selectedId;
    setDetailError(null);
    if (P.loadDetail) {
      P.loadDetail(id).catch(() => {
        // The shard is genuinely unreachable (offline, blocked, or a deploy
        // skew pr-boot's manifest refresh could not repair). Surface it INSIDE
        // the app with a retry.
        //
        // This used to navigate to registry/<id>.html. That page is the JS-free
        // crawler mirror — its own stylesheet, its own layout, honouring the
        // OS dark theme the app never uses — so one dropped request threw the
        // reader out of the app onto what looked like a different website
        // entirely, with no way back but the browser's Back button. A transient
        // fetch failure must never cost the user the UI.
        const rec = P.seedPeople && P.seedPeople[id];
        if (!(rec && rec._full)) setDetailError(id);
      });
    }
    if (P.loadTier) { P.loadTier('edges'); P.loadTier('atlas'); }
  }, [selection.selectedId, dataReady, corpusVersion, detailRetry]);

  // Only while this exact figure is still the selected one and still unrendered.
  const showDetailError = !!detailError && detailError === selection.selectedId && !selectedEntry;

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

  // Step between open items (j/k and the detail Prev/Next buttons). The
  // Items view reports its visible (grouped + filtered) row order so Prev/
  // Next walks the same sequence the user sees on screen; fall back to the
  // registry order before the index has reported.
  const itemOrderRef = __sRef(null);
  const moveItem = __sCb((delta) => {
    if (!selectedItemId) return;
    const order = itemOrderRef.current !== null
      ? itemOrderRef.current
      : itemList.map((it) => it.id);
    const idx = order.indexOf(selectedItemId);
    if (idx < 0) return;
    const nextId = order[idx + delta];
    if (nextId) setSelectedItemId(nextId);
  }, [selectedItemId, itemList]);

  // Step between open powers / domains (mirrors moveItem — uses the index's
  // reported visible order, falling back to registry order).
  const powerOrderRef = __sRef(null);
  const movePower = __sCb((delta) => {
    if (!selectedPowerId) return;
    const order = powerOrderRef.current !== null
      ? powerOrderRef.current : powerList.map((p) => p.id);
    const idx = order.indexOf(selectedPowerId);
    if (idx < 0) return;
    const nextId = order[idx + delta];
    if (nextId) setSelectedPowerId(nextId);
  }, [selectedPowerId, powerList]);
  const domainOrderRef = __sRef(null);
  const moveDomain = __sCb((delta) => {
    if (!selectedDomainId) return;
    const order = domainOrderRef.current !== null
      ? domainOrderRef.current : domainList.map((d) => d.id);
    const idx = order.indexOf(selectedDomainId);
    if (idx < 0) return;
    const nextId = order[idx + delta];
    if (nextId) setSelectedDomainId(nextId);
  }, [selectedDomainId, domainList]);

  const selIdxInItemOrder = __sMemo(() => {
    if (!selectedItemId) return -1;
    const order = itemOrderRef.current !== null ? itemOrderRef.current : itemList.map(it => it.id);
    return order.indexOf(selectedItemId);
  }, [selectedItemId, itemList, itemOrderVer]);

  const selIdxInPowerOrder = __sMemo(() => {
    if (!selectedPowerId) return -1;
    const order = powerOrderRef.current !== null ? powerOrderRef.current : powerList.map(p => p.id);
    return order.indexOf(selectedPowerId);
  }, [selectedPowerId, powerList, powerOrderVer]);

  const selIdxInDomainOrder = __sMemo(() => {
    if (!selectedDomainId) return -1;
    const order = domainOrderRef.current !== null ? domainOrderRef.current : domainList.map(d => d.id);
    return order.indexOf(selectedDomainId);
  }, [selectedDomainId, domainList, domainOrderVer]);

  // Stable onVisibleOrder callbacks — inline arrow functions in JSX are new
  // references every render, which would make Items/Powers/Domains useEffect
  // re-fire → call setOrderVer → re-render → new reference → infinite loop.
  // useCallback with [] produces the same stable function across all renders;
  // setOrderVer (stable setter) and the refs (stable objects) are safe to close
  // over with empty deps.
  const onItemVisibleOrder = __sCb((ids) => {
    itemOrderRef.current = ids;
    setItemOrderVer(v => v + 1);
  }, []);
  const onPowerVisibleOrder = __sCb((ids) => {
    powerOrderRef.current = ids;
    setPowerOrderVer(v => v + 1);
  }, []);
  const onDomainVisibleOrder = __sCb((ids) => {
    domainOrderRef.current = ids;
    setDomainOrderVer(v => v + 1);
  }, []);

  // Switch top-level view from the view tabs. Clear every detail axis first so
  // an open slide-over never stays stacked over the new view, and the hash
  // (written by the URL-sync effect from these same state values) collapses to
  // a bare #/<view> — mirroring applyHash's mutual-exclusion contract.
  const changeView = __sCb((v) => {
    setRailOpen(false);       // any view switch dismisses an open mobile sheet
    setMoreOpen(false);
    selection.setSelectedId(null);
    selection.setCursorIdx(0);
    setGraphFocusId(null);
    setAtlasFocus(null);
    setSelectedItemId(null);
    setSelectedPowerId(null);
    setSelectedDomainId(null);
    setView(v);
  }, [selection]);

  // Open an item from anywhere (the index, or a figure's material culture).
  // Opening an item is an Items-view navigation: switch views and clear the
  // figure selection so the two slide-overs never stack.
  const openItem = __sCb((id) => {
    setView('items');
    selection.setSelectedId(null);
    selection.setCursorIdx(0);
    setGraphFocusId(null);
    setAtlasFocus(null);
    setSelectedPowerId(null);
    setSelectedDomainId(null);
    setSelectedItemId(id);
  }, [selection]);

  const openPower = __sCb((id) => {
    setView('powers');
    selection.setSelectedId(null);
    selection.setCursorIdx(0);
    setGraphFocusId(null);
    setAtlasFocus(null);
    setSelectedItemId(null);
    setSelectedDomainId(null);
    setSelectedPowerId(id);
  }, [selection]);

  const openDomain = __sCb((id) => {
    setView('domains');
    selection.setSelectedId(null);
    selection.setCursorIdx(0);
    setGraphFocusId(null);
    setAtlasFocus(null);
    setSelectedItemId(null);
    setSelectedPowerId(null);
    setSelectedDomainId(id);
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
      if (railOpen || moreOpen) { setRailOpen(false); setMoreOpen(false); return; }
      if (cmdkOpen) { setCmdkOpen(false); return; }
      if (inField) { e.target.blur(); return; }
      if (selectedItemId) { setSelectedItemId(null); return; }
      if (selectedPowerId) { setSelectedPowerId(null); return; }
      if (selectedDomainId) { setSelectedDomainId(null); return; }
      if (selection.selectedId) { const i = selIdxInFiltered; selection.setSelectedId(null); selection.setCursorIdx(i >= 0 ? i : 0); return; }
      if (filters.query) { filters.setQuery(''); return; }
      return;
    }

    // Search-focus binding. Inert while the Command Palette owns the screen —
    // otherwise '/' typed from the body (after blurring the palette input)
    // steals focus to the background search box behind the open palette.
    if (e.key === '/' && !inField && !cmdkOpen) {
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }

    if (inField || cmdkOpen) return;

    // Mark keyboard-driven navigation so Browse can distinguish cursor moves
    // made with j/k (auto-scroll the row into view) from hover-driven ones
    // (never scroll — scrolling under the pointer cascades mouseenters).
    const markKbNav = () => { window.__kbNavTs = Date.now(); };

    // Item-detail navigation
    if (selectedItemId) {
      if (e.key === 'Escape') { setSelectedItemId(null); return; }
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); markKbNav(); moveItem(1); return; }
      if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); markKbNav(); moveItem(-1); return; }
      return;
    }

    // Power-detail navigation
    if (selectedPowerId) {
      if (e.key === 'Escape') { setSelectedPowerId(null); return; }
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); markKbNav(); movePower(1); return; }
      if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); markKbNav(); movePower(-1); return; }
      return;
    }

    // Domain-detail navigation
    if (selectedDomainId) {
      if (e.key === 'Escape') { setSelectedDomainId(null); return; }
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); markKbNav(); moveDomain(1); return; }
      if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); markKbNav(); moveDomain(-1); return; }
      return;
    }

    // Detail-open navigation
    if (selection.selectedId) {
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); markKbNav(); moveSelection(1); return; }
      if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); markKbNav(); moveSelection(-1); return; }
      return;
    }

    // Table navigation — Browse only, and never while an interactive control
    // has focus: a focused button/tab/checkbox owns its own Enter/Space, and
    // preventDefault here would silently swallow keyboard activation.
    if (view !== 'browse') return;
    if (e.target?.closest?.('button, a, select, [role="checkbox"], [role="button"], [role="tab"]')) return;
    if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); markKbNav(); selection.moveCursor(1); return; }
    if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); markKbNav(); selection.moveCursor(-1); return; }
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

  // ── Modal focus (window.useModalFocus, Detail.jsx) ───────────────────────
  // The three aria-modal surfaces Shell owns directly. The two mobile sheets
  // stay mounted whether or not they are open — CSS parks them off-screen with
  // visibility:hidden — so the trap is keyed on their open flags, not on
  // whether they rendered. The More sheet in particular had never received
  // focus at all: it declared itself a modal and then left the reader standing
  // in the page behind it.
  const railSheetRef = __sRef(null);
  const moreSheetRef = __sRef(null);
  const detailErrorRef = __sRef(null);
  window.useModalFocus(railSheetRef, isMobile && railOpen);
  window.useModalFocus(moreSheetRef, isMobile && moreOpen);
  window.useModalFocus(detailErrorRef, showDetailError);

  // ── Live region + document title ─────────────────────────────────────────
  // Before this there was no [aria-live] anywhere in the app: switching views
  // or narrowing the corpus silently replaced the page under a screen-reader
  // user, who had no way to know the result count had moved. One polite
  // status region, written from both events, is the whole fix.
  const [liveMsg, setLiveMsg] = __sState('');
  const liveViewRef = __sRef(view);
  __sEff(() => {
    // Skip the mount pass: announcing "Browse view" at boot talks over the
    // page the reader has only just arrived on.
    if (liveViewRef.current === view) return;
    liveViewRef.current = view;
    setLiveMsg((VIEW_LABEL[view] || view) + ' view');
  }, [view]);

  // Filter/search settle, debounced: `filters.filtered` recomputes on every
  // keystroke, and a polite region written that fast is a queue of stale
  // counts read out long after the user stopped typing.
  const liveCountRef = __sRef(-1);
  __sEff(() => {
    // Gated on `ready` and primed on its first pass: the corpus arriving takes
    // the count from 0 to 5,721, which is a boot, not a filter, and announcing
    // it would be the first thing a reader hears.
    if (!ready) return;
    const n = filters.filtered.length;
    if (liveCountRef.current === -1) { liveCountRef.current = n; return; }
    if (liveCountRef.current === n) return;
    const t = setTimeout(() => {
      liveCountRef.current = n;
      setLiveMsg(n === people.length
        ? `${n.toLocaleString()} figures`
        : `${n.toLocaleString()} of ${people.length.toLocaleString()} figures match`);
    }, 400);
    return () => clearTimeout(t);
  }, [ready, filters.filtered, people.length]);

  // Title per route. NOT in the hashchange handler: in-app navigation writes
  // the hash with history.pushState, which does not fire hashchange, so a
  // title set there would only ever update on a manual URL edit or a Back
  // press. These are the same deps the URL-sync effect above runs on, which is
  // what makes the title track the hash in both directions.
  __sEff(() => {
    const focused =
      (view === 'browse'  && selectedEntry  && window.displayName(selectedEntry)) ||
      (view === 'items'   && selectedItem   && selectedItem.displayName) ||
      (view === 'powers'  && selectedPower  && selectedPower.displayName) ||
      (view === 'domains' && selectedDomain && selectedDomain.displayName) ||
      (view === 'graph'   && graphFocusId   && byId.get(graphFocusId) && window.displayName(byId.get(graphFocusId))) ||
      (view === 'atlas'   && atlasFocus) || null;
    const parts = [];
    if (focused) parts.push(focused);
    parts.push(VIEW_LABEL[view] || view);
    parts.push('Pantheon Registry');
    document.title = parts.join(' · ');
  }, [view, selectedEntry, selectedItem, selectedPower, selectedDomain, graphFocusId, atlasFocus, byId]);

  if (!ready) {
    // Async boot, pre-index: no data has had the chance to arrive yet, so
    // the storage dead-end below would be a lie. Skeleton rows instead —
    // inline-styled because they exist only for the sub-second window before
    // 'pr:index' lands and replaces this whole branch.
    // Both pre-ready branches are the whole page for their moment, so each
    // carries the main landmark — otherwise a boot slow enough to be measured
    // is a page with no landmarks and no h1 at all.
    if (!dataReady) {
      return (
        <main className="empty empty-loading" id="main-content" aria-busy="true">
          <div className="empty-mark" aria-hidden="true" />
          <h1>Loading the registry…</h1>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ width: 420 - (i % 3) * 60, maxWidth: '70vw', height: 12, borderRadius: 3, background: 'var(--rule, #e3ded4)', opacity: 0.7 }} />
            ))}
          </div>
        </main>
      );
    }
    return (
      <main className="empty empty-loading" id="main-content">
        <div className="empty-mark" aria-hidden="true" />
        <h1>Nothing in storage.</h1>
        <p>The seed didn't write. Reload the page to try again; if the failure persists, check the boot log.</p>
      </main>
    );
  }

  return (
    <div className="shell">
      <TopBar
        onSkip={() => mainRef.current && mainRef.current.focus()}
        totalCount={people.length}
        view={view}
        setView={changeView}
        query={filters.query}
        setQuery={filters.setQuery}
        searchRef={searchRef}
        onCmdK={() => setCmdkOpen(true)}
        onOpenFilter={() => setRailOpen(true)}
        hasFilters={hasFilters}
      />
      <div className="shell-body">
        {/* The rail is a complementary landmark on desktop and a modal sheet on
            the phone tier — and it must change ELEMENT to say so, because
            role=dialog is not an allowed override of <aside>'s implicit
            complementary role (the same rule the slide-overs below obey). A div
            has no implicit role to contradict, so it carries whichever of the
            two the breakpoint calls for. Crossing 760px remounts the subtree
            and clears Rail's tradition-search box; that costs a rotate, and the
            alternative is an aside lying about what it is. jsdom has no
            matchMedia, so the test tree only ever sees the <aside>. */}
        <RailTag
          ref={railSheetRef}
          className="shell-rail"
          aria-label="Filter and sort"
          role={isMobile ? 'dialog' : undefined}
          aria-modal={isMobile && railOpen ? 'true' : undefined}
          tabIndex={isMobile ? -1 : undefined}
        >
          {/* Sheet chrome (mobile only): grip + title + reset/close above the
              filters, an "apply" button pinned below. Gated on isMobile so the
              desktop rail is untouched and the test tree never sees it. */}
          {isMobile && (
            <div className="rail-sheet-head">
              <div className="rail-sheet-grip" aria-hidden="true" />
              <div className="rail-sheet-title">Filter &amp; sort</div>
              <button className="rail-sheet-reset" onClick={() => filters.reset()}>Reset</button>
              <button className="rail-sheet-close" onClick={() => setRailOpen(false)} aria-label="Close filters">×</button>
            </div>
          )}
          <Rail filters={filters} view={view} hasDetail={!!(selectedEntry || selectedItemId || selectedPowerId || selectedDomainId)} />
          {isMobile && (
            <button className="rail-sheet-apply" onClick={() => setRailOpen(false)}>
              <span>Show {filters.filtered.length.toLocaleString()} figures</span>
            </button>
          )}
        </RailTag>
        <main className="shell-main" id="main-content" ref={mainRef} tabIndex={-1}>
          {(view === 'browse' || leavingView === 'browse') && (
            <div className={'view-pane' + (view === 'browse' ? '' : ' pane-leaving')}>
              <window.Browse
                filters={filters}
                selection={selection}
                onOpen={(id, idx) => { selection.setSelectedId(id); if (idx != null) selection.setCursorIdx(idx); }}
              />
            </div>
          )}
          {/* Everything below Browse consumes full records (relations for
              Graph, seedAtlas for Atlas, the registries for Items/Powers/
              Domains) — behind the placeholder until the async corpus lands.
              dataReady is true from the first frame on every sync boot. */}
          {view === 'graph' && !(dataReady || tierReady.edges) && <ViewLoading label="graph" />}
          {(view === 'graph' || leavingView === 'graph') && (dataReady || tierReady.edges) && (
            <div className={'view-pane' + (view === 'graph' ? '' : ' pane-leaving')}>
              <window.Graph
                people={filters.filtered}
                byId={byId}
                focusId={graphFocusId}
                setFocusId={setGraphFocusId}
                onOpenDetail={(id) => { setGraphFocusId(null); setView('browse'); selection.setSelectedId(id); const idx = filters.filtered.findIndex(p => p.id === id); if (idx >= 0) selection.setCursorIdx(idx); }}
              />
            </div>
          )}
          {view === 'atlas' && !(dataReady || tierReady.atlas) && <ViewLoading label="atlas" />}
          {(view === 'atlas' || leavingView === 'atlas') && (dataReady || tierReady.atlas) && (
            <div className={'view-pane' + (view === 'atlas' ? '' : ' pane-leaving')}>
              <window.Atlas
                atlas={atlas}
                byId={byId}
                focused={atlasFocus}
                setFocused={setAtlasFocus}
                traditionFilter={filters.traditions}
                onOpenDetail={(tradition) => {
                  // "N figures →" click: drop into Browse with the tradition selected
                  filters.setTraditions(new Set([tradition]));
                  changeView('browse');
                }}
              />
            </div>
          )}
          {view === 'items' && !registryReady.items && <ViewLoading label="items" />}
          {(view === 'items' || leavingView === 'items') && registryReady.items && (
            <div className={'view-pane' + (view === 'items' ? '' : ' pane-leaving')}>
              <window.Items
                items={visibleItems}
                total={itemList.length}
                byId={byId}
                selectedItemId={selectedItemId}
                onOpenItem={openItem}
                onVisibleOrder={onItemVisibleOrder}
              />
            </div>
          )}
          {view === 'powers' && !registryReady.powers && <ViewLoading label="powers" />}
          {(view === 'powers' || leavingView === 'powers') && registryReady.powers && (
            <div className={'view-pane' + (view === 'powers' ? '' : ' pane-leaving')}>
              <window.PowersView
                powers={visiblePowers}
                total={powerList.length}
                byId={byId}
                selectedPowerId={selectedPowerId}
                onOpenPower={openPower}
                onVisibleOrder={onPowerVisibleOrder}
              />
            </div>
          )}
          {view === 'domains' && !registryReady.domains && <ViewLoading label="domains" />}
          {(view === 'domains' || leavingView === 'domains') && registryReady.domains && (
            <div className={'view-pane' + (view === 'domains' ? '' : ' pane-leaving')}>
              <window.Domains
                domains={visibleDomains}
                total={domainList.length}
                byId={byId}
                selectedDomainId={selectedDomainId}
                onOpenDomain={openDomain}
                onVisibleOrder={onDomainVisibleOrder}
              />
            </div>
          )}
        </main>
      </div>

      {/* Both slide-overs render unconditionally: they own an exit-animation
          state machine that needs to see the entry/item prop go null — a
          conditional mount here unmounts them instantly and the slide-out
          never plays. They render nothing while their prop is null. */}
      <window.Detail
        entry={selectedEntry}
        byId={byId}
        childrenOf={childrenOf}
        onClose={() => { const i = selIdxInFiltered; selection.setSelectedId(null); selection.setCursorIdx(i >= 0 ? i : 0); }}
        onPrev={() => moveSelection(-1)}
        onNext={() => moveSelection(1)}
        canPrev={selIdxInFiltered > 0}
        canNext={selIdxInFiltered >= 0 && selIdxInFiltered < filters.filtered.length - 1}
        onOpen={(id, idx) => { selection.setSelectedId(id); if (idx != null) selection.setCursorIdx(idx); }}
        onOpenItem={openItem}
        onShowInGraph={(entry) => {
          setGraphFocusId(entry.id);
          setView('graph');
          setAtlasFocus(null);
          setSelectedItemId(null);
          setSelectedPowerId(null);
          setSelectedDomainId(null);
          selection.setSelectedId(null);
          selection.setCursorIdx(0);
          // Re-home focus onto the main column — which the graph now fills —
          // EXPLICITLY, rather than leaving it to the panel's restore. The
          // opener is a Browse row, and the swap parks that row inside a
          // display:none pane (leavingView holds it two frames) before the
          // 180 ms exit timer fires: restoring onto it would put the caret in
          // a pane nobody can see, and once it unmounts focus falls to <body>
          // and the reader is at the top of the document. useModalFocus stands
          // down once focus has been claimed elsewhere, so landing here first
          // is what sticks. One frame's delay, because <main> is only the
          // graph's container after the swap commits.
          const raf = window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
          raf(() => {
            if (mainRef.current) { try { mainRef.current.focus({ preventScroll: true }); } catch (_) {} }
          });
        }}
      />

      {/* Detail could not be fetched. Stays inside the app chrome — same
          slide-over, same surface — so a dropped request reads as one figure
          failing to load, not as the site changing out from under the reader. */}
      {showDetailError && (
        <>
          <div className="detail-backdrop" onClick={() => selection.setSelectedId(null)} />
          {/* A div, not an <aside>: role=dialog is not an allowed override of
              <aside>'s implicit complementary role. */}
          <div ref={detailErrorRef} tabIndex={-1} className="detail" role="alertdialog" aria-modal="true" aria-label="Figure could not be loaded">
            <div className="detail-bar">
              <div className="spacer" />
              <button className="close" onClick={() => selection.setSelectedId(null)} aria-label="Close">✕</button>
            </div>
            <div className="detail-scroll">
              <div className="detail-error">
                <h2>Couldn’t load this figure</h2>
                <p>
                  {(selectedRec && selectedRec.name && selectedRec.name.primary) || detailError}
                  {' '}didn’t finish loading — usually a dropped connection.
                </p>
                <div className="detail-error-actions">
                  <button className="detail-error-retry" onClick={() => setDetailRetry((n) => n + 1)}>Retry</button>
                  <a href={'registry/' + detailError + '.html'}>Open the plain-text page instead</a>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <window.ItemDetail
        item={selectedItem}
        byId={byId}
        onClose={() => setSelectedItemId(null)}
        onPrev={() => moveItem(-1)}
        onNext={() => moveItem(1)}
        canPrev={selIdxInItemOrder > 0}
        canNext={selIdxInItemOrder >= 0 && selIdxInItemOrder < (itemOrderRef.current !== null ? itemOrderRef.current.length : itemList.length) - 1}
        onOpenFigure={(id) => {
          setView('browse');
          setGraphFocusId(null);
          setAtlasFocus(null);
          setSelectedItemId(null);
          selection.setSelectedId(id);
          const idx = filters.filtered.findIndex(p => p.id === id);
          selection.setCursorIdx(idx >= 0 ? idx : 0);
        }}
      />

      <window.PowerDetail
        power={selectedPower}
        byId={byId}
        onClose={() => setSelectedPowerId(null)}
        onPrev={() => movePower(-1)}
        onNext={() => movePower(1)}
        canPrev={selIdxInPowerOrder > 0}
        canNext={selIdxInPowerOrder >= 0 && selIdxInPowerOrder < (powerOrderRef.current !== null ? powerOrderRef.current.length : powerList.length) - 1}
        onOpenFigure={(id) => {
          setView('browse');
          setGraphFocusId(null);
          setAtlasFocus(null);
          setSelectedPowerId(null);
          selection.setSelectedId(id);
          const idx = filters.filtered.findIndex(p => p.id === id);
          selection.setCursorIdx(idx >= 0 ? idx : 0);
        }}
      />

      <window.DomainDetail
        domain={selectedDomain}
        byId={byId}
        onClose={() => setSelectedDomainId(null)}
        onPrev={() => moveDomain(-1)}
        onNext={() => moveDomain(1)}
        canPrev={selIdxInDomainOrder > 0}
        canNext={selIdxInDomainOrder >= 0 && selIdxInDomainOrder < (domainOrderRef.current !== null ? domainOrderRef.current.length : domainList.length) - 1}
        onOpenFigure={(id) => {
          setView('browse');
          setGraphFocusId(null);
          setAtlasFocus(null);
          setSelectedDomainId(null);
          selection.setSelectedId(id);
          const idx = filters.filtered.findIndex(p => p.id === id);
          selection.setCursorIdx(idx >= 0 ? idx : 0);
        }}
      />

      {cmdkOpen && (
        <window.CommandPalette
          people={people}
          onClose={() => setCmdkOpen(false)}
          onPick={(id) => {
            // View-aware: in Graph, pick focuses the node in-place; in
            // Browse (or anywhere else), pick opens the detail panel.
            // Always drop any open item panel first so the two slide-overs
            // never stack (mirror of openItem clearing the figure selection).
            setSelectedItemId(null);
            setSelectedPowerId(null);
            setSelectedDomainId(null);
            setAtlasFocus(null);
            if (view === 'graph') {
              selection.setSelectedId(null);
              setGraphFocusId(id);
            } else {
              setGraphFocusId(null);
              if (view !== 'browse') setView('browse');
              selection.setSelectedId(id);
            }
            setCmdkOpen(false);
          }}
        />
      )}

      {/* ── Mobile chrome ─────────────────────────────────────────────────
          Rendered only on the phone tier. The scrim dims + dismisses whichever
          sheet is open (z55: above the nav, below the sheets at z60). The
          bottom nav replaces the desktop view tabs; its "More" button opens a
          sheet for the three registry views. */}
      {isMobile && (railOpen || moreOpen) && (
        <div
          className="mobile-scrim"
          onClick={() => { setRailOpen(false); setMoreOpen(false); }}
          aria-hidden="true"
        />
      )}

      {isMobile && (
        <nav className="mobile-nav" aria-label="Primary views">
          <button className={view === 'browse' ? 'on' : ''} onClick={() => changeView('browse')} aria-current={view === 'browse' ? 'page' : undefined}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <line x1="2.5" y1="4" x2="13.5" y2="4" /><line x1="2.5" y1="8" x2="13.5" y2="8" /><line x1="2.5" y1="12" x2="9.5" y2="12" />
            </svg>
            <span>Browse</span>
          </button>
          <button className={view === 'graph' ? 'on' : ''} onClick={() => changeView('graph')} aria-current={view === 'graph' ? 'page' : undefined}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="8" cy="3.5" r="1.8" /><circle cx="3.5" cy="12" r="1.8" /><circle cx="12.5" cy="11.5" r="1.8" />
              <line x1="7" y1="5.1" x2="4.4" y2="10.4" /><line x1="9" y1="5.1" x2="11.6" y2="9.9" /><line x1="5.3" y1="12" x2="10.7" y2="11.6" />
            </svg>
            <span>Graph</span>
          </button>
          <button className={view === 'atlas' ? 'on' : ''} onClick={() => changeView('atlas')} aria-current={view === 'atlas' ? 'page' : undefined}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="8" cy="8" r="6" /><ellipse cx="8" cy="8" rx="2.6" ry="6" /><line x1="2" y1="8" x2="14" y2="8" />
            </svg>
            <span>Atlas</span>
          </button>
          <button
            className={(moreOpen || view === 'items' || view === 'powers' || view === 'domains') ? 'on' : ''}
            onClick={() => { setRailOpen(false); setMoreOpen(true); }}
            aria-haspopup="true" aria-expanded={moreOpen}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="3" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="13" cy="8" r="1.4" />
            </svg>
            <span>More</span>
          </button>
        </nav>
      )}

      {isMobile && (
        <div ref={moreSheetRef} tabIndex={-1} className="mobile-more" role="dialog" aria-modal="true" aria-label="More views">
          <div className="mobile-more-grip" aria-hidden="true" />
          {[
            { v: 'items',   label: 'Items',   sub: 'material culture & custody chains' },
            { v: 'powers',  label: 'Powers',  sub: 'faculties & inheritance' },
            { v: 'domains', label: 'Domains', sub: 'governed spheres' },
          ].map(m => (
            <button
              key={m.v}
              className={'mobile-more-row' + (view === m.v ? ' on' : '')}
              onClick={() => changeView(m.v)}
              onMouseEnter={() => prefetchView(m.v)}
              onPointerDown={() => prefetchView(m.v)}
              aria-current={view === m.v ? 'page' : undefined}
            >
              <span className="mobile-more-text">
                <span className="mobile-more-label">{m.label}</span>
                <span className="mobile-more-sub">{m.sub}</span>
              </span>
              <span className="mobile-more-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}

      {/* The app's only live region. Clip-rect hidden, in the same shape the
          static registry's crawl nav uses (scripts/build-static.cjs): NOT
          display:none or visibility:hidden, which take a region out of the
          accessibility tree and silence it. It must also never grow visible
          text — the boot overlay's .lead is deliberately the largest thing on
          screen because it is what LCP times, and a clipped 1px box has no
          contentful area to compete with it. */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute', width: 1, height: 1, margin: -1, padding: 0,
          overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
        }}
      >{liveMsg}</div>
    </div>
  );
}

Object.assign(window, { Shell });
