// ═══════════════════════════════════════════════════════════════════════════
//  Lineage.jsx — per-entry parentage tree (ancestors above, descendants
//  below, siblings beside). Lives inside the detail panel.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: __lState, useMemo: __lMemo, useEffect: __lEffect, useRef: __lRef } = React;

const CARD_W = 152;
const CARD_H = 44;
const GAP_X  = 12;
const GAP_Y  = 38;
const MAX_PER_ROW = 7;

// ── Build the local lineage subgraph ────────────────────────────────────

function buildLineageTree(entry, byId, childrenOf, upDepth, downDepth) {
  const focusId = entry.id;

  // Ancestors (top→down, ordered so the deepest row sits first)
  let frontier = [focusId];
  const ancestorRows = [];
  const seen = new Set([focusId]);
  for (let d = 0; d < upDepth; d++) {
    const next = [];
    for (const id of frontier) {
      const p = byId.get(id);
      if (!p) continue;
      for (const pid of (p.parentIds || [])) {
        if (!next.includes(pid) && byId.has(pid) && !seen.has(pid)) {
          next.push(pid);
          seen.add(pid);
        }
      }
    }
    if (!next.length) break;
    ancestorRows.unshift(next);
    frontier = next;
  }

  const hasMoreUp = frontier.some(id => (byId.get(id)?.parentIds || [])
    .some(pid => byId.has(pid) && !seen.has(pid)));

  // Descendants (top→down). Skip anything already placed as an ancestor —
  // with overlapping genealogies one figure can qualify for
  // several roles, and a duplicate placement means duplicate React keys and
  // a last-wins node map that silently drops connectors.
  let downFrontier = [focusId];
  const descRows = [];
  const seenDown = new Set([focusId]);
  for (let d = 0; d < downDepth; d++) {
    const next = [];
    for (const id of downFrontier) {
      for (const cid of (childrenOf.get(id) || [])) {
        if (!next.includes(cid) && byId.has(cid) && !seenDown.has(cid) && !seen.has(cid)) {
          next.push(cid);
          seenDown.add(cid);
        }
      }
    }
    if (!next.length) break;
    descRows.push(next);
    downFrontier = next;
  }

  // Siblings (share at least one parent with focus, not the focus itself).
  const hasMoreDown = downFrontier.some(id => (childrenOf.get(id) || [])
    .some(cid => byId.has(cid) && !seenDown.has(cid) && !seen.has(cid)));

  // A sibling already placed as an ancestor or descendant keeps that placement — the rows
  // above/below are where its parent connectors actually render.
  const focusParents = new Set(entry.parentIds || []);
  const sibSet = new Set();
  for (const pid of focusParents) {
    for (const cid of (childrenOf.get(pid) || [])) {
      if (cid !== focusId && byId.has(cid) && !seen.has(cid) && !seenDown.has(cid)) sibSet.add(cid);
    }
  }
  const siblings = [...sibSet];

  // Focus row — half siblings left, focus center, rest right
  const halfL = siblings.slice(0, Math.ceil(siblings.length / 2));
  const halfR = siblings.slice(Math.ceil(siblings.length / 2));
  const focusRow = [...halfL, focusId, ...halfR];

  return {
    rows: [...ancestorRows, focusRow, ...descRows],
    focusId,
    ancestorRowCount: ancestorRows.length,
    descRowCount: descRows.length,
    siblings,
    hasMoreUp,
    hasMoreDown,
  };
}

// Project explicit alternatives without mutating the default corpus or derived descent.
// Unselected records retain their authored default. Accounts are never unioned.
function projectLineageAccounts(byId, selections) {
  const projected = new Map(byId);
  for (const [id, accountId] of Object.entries(selections)) {
    const p = byId.get(id);
    const account = p?.parentageAccounts?.find(a => a.id === accountId);
    if (!account) continue;
    projected.set(id, { ...p, parentIds: account.parents.map(r => r.personId),
      parentRoles: Object.fromEntries(account.parents.map(r => [r.personId, r.kind])) });
  }
  const childrenOf = new Map();
  for (const p of projected.values()) for (const pid of p.parentIds || []) {
    if (!childrenOf.has(pid)) childrenOf.set(pid, []);
    childrenOf.get(pid).push(p.id);
  }
  return { byId: projected, childrenOf };
}

// ── Layout ───────────────────────────────────────────────────────────────

function layoutTree(tree, expandedRows) {
  // Each row shows up to MAX_PER_ROW cards. Anything past that collapses into a
  // clickable chip — unless the user expanded that row, in which case the whole
  // row is shown. Expanded rows unfurl to the RIGHT (the canvas scrolls); the
  // centering frame below is computed from the *capped* widths so the rest of
  // the tree never jumps sideways when one row is opened.
  const rows = tree.rows.map((row, idx) => {
    const overflow = Math.max(0, row.length - MAX_PER_ROW);
    const expanded = overflow > 0 && expandedRows.has(idx);
    // The focus card must never be the one sliced away. On the focus row the
    // figure sits centered among its siblings, so with 14+ siblings its index
    // lands past MAX_PER_ROW and a plain slice(0, MAX_PER_ROW) would drop the
    // very figure being viewed. When that happens, slide the collapsed window
    // so it stays centered on the focus; the chip still reports every hidden
    // card. Other rows keep the simple leading slice.
    const focusIdx = row.indexOf(tree.focusId);
    let visible;
    if (expanded) {
      visible = row;
    } else if (focusIdx >= MAX_PER_ROW) {
      let start = focusIdx - Math.floor(MAX_PER_ROW / 2);
      start = Math.max(0, Math.min(start, row.length - MAX_PER_ROW));
      visible = row.slice(start, start + MAX_PER_ROW);
    } else {
      visible = row.slice(0, MAX_PER_ROW);
    }
    const cappedCount = Math.min(row.length, MAX_PER_ROW);
    // Frame width: the capped cards plus the chip slot when this row overflows.
    let cappedW = cappedCount * CARD_W + Math.max(0, cappedCount - 1) * GAP_X;
    if (overflow > 0) cappedW += GAP_X + CARD_W * 0.5;
    return { idx, overflow, expanded, visible, hiddenIds: row.filter(id => !visible.includes(id)), cappedW };
  });

  const maxW = Math.max(...rows.map(r => r.cappedW), CARD_W);

  // Place cards centered per row; track the true canvas width so expanded rows
  // (which run past maxW) stay reachable via horizontal scroll.
  const nodes = [];
  let focusY = 0;
  let canvasW = maxW;
  rows.forEach(({ idx, overflow, expanded, visible, hiddenIds, cappedW }) => {
    const startX = (maxW - cappedW) / 2;
    const y = idx * (CARD_H + GAP_Y);
    visible.forEach((id, i) => {
      const isFocus = id === tree.focusId;
      const kind =
        idx <  tree.ancestorRowCount ? 'ancestor' :
        idx >  tree.ancestorRowCount ? 'descendant' :
        isFocus ? 'focus' : 'sibling';
      const x = startX + i * (CARD_W + GAP_X);
      if (isFocus) focusY = y;
      canvasW = Math.max(canvasW, x + CARD_W);
      nodes.push({ id, kind, x, y, row: idx, col: i });
    });
    if (overflow > 0) {
      // Collapsed: chip sits after the 7th card showing "+N". Expanded: chip
      // moves to the row's end as a "−" collapse toggle.
      const x = startX + visible.length * (CARD_W + GAP_X);
      canvasW = Math.max(canvasW, x + CARD_W * 0.5);
      nodes.push({ kind: expanded ? 'collapse' : 'overflow', hiddenIds, count: overflow, row: idx, x, y });
    }
  });

  return {
    nodes,
    width: canvasW,
    height: tree.rows.length * (CARD_H + GAP_Y) - GAP_Y,
    focusY,
  };
}

function computeEdges(layoutNodes, byId) {
  const byNodeId = new Map();
  layoutNodes.forEach(n => {
    if (n.id) byNodeId.set(n.id, n);
    for (const id of n.hiddenIds || []) byNodeId.set(id, n);
  });
  const edges = [];
  const emitted = new Set();
  for (const [id, n] of byNodeId) {
    const p = byId.get(id);
    if (!p) continue;
    for (const pid of new Set(p.parentIds || [])) {
      const parent = byNodeId.get(pid);
      if (parent && parent !== n) {
        const key = `${parent.row}:${parent.x}:${n.row}:${n.x}`;
        if (emitted.has(key)) continue;
        emitted.add(key);
        edges.push({
          aggregated: !parent.id || !n.id,
          x1: parent.x + CARD_W / (parent.id ? 2 : 4),
          y1: parent.y + CARD_H,
          x2: n.x + CARD_W / (n.id ? 2 : 4),
          y2: n.y,
        });
      }
    }
  }
  return edges;
}

// ── Components ──────────────────────────────────────────────────────────

function LineageCard({ node, byId, onPick, model }) {
  const target = byId.get(node.id);
  if (!target) return null;
  const info = model?.divinityInfo(target);
  const type = model ? info?.tier : target.type;
  const tier = window.TYPE_TIER[type];
  const isFocus = node.kind === 'focus';
  return (
    <div
      className={'lineage-card ' + node.kind + (isFocus ? ' focus' : '')}
      style={{ left: node.x, top: node.y, width: CARD_W, height: CARD_H }}
      onClick={() => !isFocus && onPick(node.id)}
      role={isFocus ? undefined : 'button'}
      tabIndex={isFocus ? undefined : 0}
      onKeyDown={(e) => {
        if (!isFocus && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault(); onPick(node.id);
        }
      }}
      title={window.displayName(target) + ' · ' + (tier?.label || type || (info?.hasDivineAncestry ? 'Claimed divine ancestry' : 'Ancestry unresolved')) + ' · ' + target.tradition}
    >
      <div className="lineage-card-name">{window.displayName(target)}</div>
      <div className="lineage-card-meta">
        {type && <window.TierIcon type={type} size={11} />}
        <span className="lineage-card-trad">{target.tradition}</span>
      </div>
    </div>
  );
}

function Lineage({ entry, byId: defaultById, childrenOf: defaultChildrenOf, onPick, choices: controlledChoices, onSelectAccount, accountModel }) {
  const [accountState, setAccountState] = __lState({ focusId: entry.id, choices: {} });
  const choices = controlledChoices || (accountState.focusId === entry.id ? accountState.choices : {});
  const projection = __lMemo(() => accountModel || (Object.values(choices).some(Boolean)
    ? window.projectAccountModel ? window.projectAccountModel(defaultById, choices) : projectLineageAccounts(defaultById, choices)
    : { byId: defaultById, childrenOf: defaultChildrenOf }), [defaultById, defaultChildrenOf, accountState, controlledChoices, accountModel, entry.id, window.__PR?.detailVersion]);
  const resolvedChoices = projection.selections || choices;
  const calculationModel = projection.divinityInfo ? projection : null;
  const selectAccount = (id, value) => {
    if (onSelectAccount) onSelectAccount(id, value);
    else setAccountState({ focusId: entry.id, choices: { ...choices, [id]: value } });
    setExpandState({ rows: new Set() });
  };
  const { byId, childrenOf } = projection;
  const projectedEntry = byId.get(entry.id) || entry;
  const [depthState, setDepthState] = __lState({ focusId: entry.id, up: 2, down: 2 });
  const upDepth = depthState.focusId === entry.id ? depthState.up : 2;
  const downDepth = depthState.focusId === entry.id ? depthState.down : 2;
  const setUpDepth = up => setDepthState({ focusId: entry.id, up, down: downDepth });
  const setDownDepth = down => setDepthState({ focusId: entry.id, up: upDepth, down });
  __lEffect(() => {
    setAccountState(previous => previous.focusId === entry.id ? previous : { focusId: entry.id, choices: {} });
    setDepthState(previous => previous.focusId === entry.id ? previous : { focusId: entry.id, up: 2, down: 2 });
  }, [entry.id]);
  // Which rows the user has expanded (by row index). Row indices shift when the
  // entry or the generation depth changes. Storing the context alongside the set
  // lets layoutTree (a useMemo) see an empty set immediately on context change —
  // an effect-based reset would arrive one frame late, showing a stale expansion.
  const [expandState, setExpandState] = __lState(() => ({
    forId: entry?.id, forUp: upDepth, forDown: downDepth, rows: new Set(),
  }));
  const expandedRows = __lMemo(() =>
    (expandState.forId === entry?.id && expandState.forUp === upDepth && expandState.forDown === downDepth)
      ? expandState.rows : new Set(),
    [expandState, entry, upDepth, downDepth]);
  const toggleRow = (row) => setExpandState(prev => {
    const sameCtx = prev.forId === entry?.id && prev.forUp === upDepth && prev.forDown === downDepth;
    const base = sameCtx ? prev.rows : new Set();
    const rows = new Set(base);
    rows.has(row) ? rows.delete(row) : rows.add(row);
    return { forId: entry?.id, forUp: upDepth, forDown: downDepth, rows };
  });

  const wrapRef = __lRef(null);
  const prevExpandedSizeRef = __lRef(0);
  const prevTreeFocusIdRef = __lRef(null);

  const tree = __lMemo(
    () => buildLineageTree(projectedEntry, byId, childrenOf, upDepth, downDepth),
    [entry, byId, childrenOf, upDepth, downDepth],
  );
  const layout = __lMemo(() => layoutTree(tree, expandedRows), [tree, expandedRows]);
  const edges = __lMemo(() => computeEdges(layout.nodes, byId), [layout, byId]);

  // After expanding a wide sibling row the focus card can be thousands of px
  // from the left edge. Scroll the wrap so the focus card stays centered.
  // On full collapse, reset to the natural (leftmost) scroll position.
  __lEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const treeChanged = prevTreeFocusIdRef.current !== tree.focusId;
    prevTreeFocusIdRef.current = tree.focusId;
    const prevSize = prevExpandedSizeRef.current;
    prevExpandedSizeRef.current = expandedRows.size;
    if (expandedRows.size === 0) {
      if (prevSize > 0 || treeChanged) wrap.scrollLeft = 0;
      return;
    }
    const focusNode = layout.nodes.find(n => n.id === tree.focusId);
    if (!focusNode) return;
    wrap.scrollLeft = Math.max(0, focusNode.x - wrap.clientWidth / 2 + CARD_W / 2);
  }, [expandedRows, layout, tree.focusId]);

  const hasAny =
    tree.ancestorRowCount > 0 ||
    tree.descRowCount > 0 ||
    tree.siblings.length > 0;

  return (
    <div className="section">
      <h2>
        Lineage tree
        <span className="count">
          {tree.ancestorRowCount > 0 && `${tree.ancestorRowCount}↑ `}
          {tree.siblings.length > 0 && `${tree.siblings.length}↔ `}
          {tree.descRowCount > 0 && `${tree.descRowCount}↓`}
        </span>
      </h2>

      {(projection.conflicts || []).map(conflict => <p className="lineage-status" role="status" key={'conflict-' + conflict.id}>
        Conflicting pedigree accounts for {window.displayName(defaultById.get(conflict.id))}. Choose that figure’s parentage account to resolve the displayed ancestry.
      </p>)}
      {[...new Set([entry.id, ...layout.nodes.filter(n => n.id).map(n => n.id), ...Object.keys(choices), ...(projection.conflicts || []).map(c => c.id)])].filter(id => defaultById.get(id)?.parentageAccounts?.length).map(id => {
        const subject = defaultById.get(id);
        const chosen = subject.parentageAccounts.find(a => a.id === resolvedChoices[id]);
        return <div className="lineage-account" key={id}>
          <label>{window.displayName(subject)} — parentage account{' '}
            <select aria-label={'Parentage account for ' + window.displayName(subject)} value={resolvedChoices[id] || ''}
              onChange={e => selectAccount(id, e.target.value)}>
              <option value="">Recorded default</option>
              {subject.parentageAccounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
          {chosen && <p className="lineage-status">{chosen.description || chosen.label}{' '}
            {(chosen.sources || []).map((c, i) => c.url
              ? <a key={i} href={c.url} target="_blank" rel="noreferrer">{c.reference}{' '}</a>
              : <span key={i}>{c.reference}{' '}</span>)}
          </p>}
        </div>;
      })}
      {Object.values(choices).some(Boolean) && <p className="lineage-status">{calculationModel
        ? 'Selected accounts determine this tree, descent, and potential inherited powers. Claimed pedigrees are not established historical parentage.'
        : 'Selected accounts change this tree. Descent calculations below use the recorded default.'}</p>}

      {!hasAny && <p className="lineage-status">{upDepth === 0 && downDepth === 0
        ? 'Generations are hidden. Increase the depth to explore recorded parentage.'
        : 'No connected parentage records available.'}</p>}

      <div className="lineage-wrap" ref={wrapRef}>
        <div
          className="lineage-canvas"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg
            className="lineage-edges"
            width={layout.width}
            height={layout.height}
          >
            {edges.map((e, i) => {
              // Smooth S-curve between parent bottom and child top.
              const midY = (e.y1 + e.y2) / 2;
              return (
                <path
                  key={i}
                  d={`M${e.x1},${e.y1} C${e.x1},${midY} ${e.x2},${midY} ${e.x2},${e.y2}`}
                  fill="none"
                  stroke="rgba(11,11,11,0.30)"
                  strokeWidth={1}
                  strokeDasharray={e.aggregated ? '4 3' : undefined}
                />
              );
            })}
          </svg>
          {layout.nodes.map((n, i) => {
            if (n.kind === 'overflow' || n.kind === 'collapse') {
              const expanded = n.kind === 'collapse';
              return (
                <div
                  key={`of-${n.row}`}
                  className={'lineage-overflow' + (expanded ? ' is-expanded' : '')}
                  style={{ left: n.x, top: n.y, width: CARD_W * 0.5, height: CARD_H }}
                  onClick={() => toggleRow(n.row)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(n.row); } }}
                  title={expanded ? 'Show fewer' : `Show ${n.count} more`}
                >{expanded ? '−' : '+' + n.count}</div>
              );
            }
            return (
              <LineageCard
                key={n.id}
                node={n}
                byId={byId}
                onPick={onPick}
                model={calculationModel}
              />
            );
          })}
        </div>
      </div>

      <div className="lineage-controls">
        <span>Generations</span>
        <div className="lineage-step">
          <button aria-label="Fewer ancestor generations" onClick={() => setUpDepth(Math.max(0, upDepth - 1))} disabled={upDepth === 0}>−</button>
          <span>{upDepth}↑</span>
          <button aria-label="More ancestor generations" onClick={() => setUpDepth(upDepth + 1)} disabled={!tree.hasMoreUp}>+</button>
        </div>
        <button className="btn btn-ghost btn-sm" disabled={!tree.hasMoreUp}
          onClick={() => setUpDepth(buildLineageTree(projectedEntry, byId, childrenOf, byId.size, 0).ancestorRowCount)}>Show all ancestors</button>
        <div className="lineage-step">
          <button aria-label="Fewer descendant generations" onClick={() => setDownDepth(Math.max(0, downDepth - 1))} disabled={downDepth === 0}>−</button>
          <span>{downDepth}↓</span>
          <button aria-label="More descendant generations" onClick={() => setDownDepth(downDepth + 1)} disabled={!tree.hasMoreDown}>+</button>
        </div>
        <span className="lineage-controls-hint">
          {edges.some(e => e.aggregated) ? 'Dashed lines connect collapsed groups. ' : ''}Click any card to jump
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { Lineage });
