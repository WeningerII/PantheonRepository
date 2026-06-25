// ═══════════════════════════════════════════════════════════════════════════
//  Lineage.jsx — per-entry parentage tree (ancestors above, descendants
//  below, siblings beside). Lives inside the detail panel.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: __lState, useMemo: __lMemo, useEffect: __lEffect } = React;

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

  // Descendants (top→down). Skip anything already placed as an ancestor —
  // with incestuous genealogies (Gaia–Uranus) one figure can qualify for
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
  // A sibling already placed as an ancestor (Uranus beside Cronus: brother
  // via Gaia AND father) or as a descendant keeps that placement — the rows
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
  const halfL = siblings.slice(0, Math.floor(siblings.length / 2));
  const halfR = siblings.slice(Math.floor(siblings.length / 2));
  const focusRow = [...halfL, focusId, ...halfR];

  return {
    rows: [...ancestorRows, focusRow, ...descRows],
    focusId,
    ancestorRowCount: ancestorRows.length,
    descRowCount: descRows.length,
    siblings,
  };
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
    const visible = expanded ? row : row.slice(0, MAX_PER_ROW);
    const cappedCount = Math.min(row.length, MAX_PER_ROW);
    // Frame width: the capped cards plus the chip slot when this row overflows.
    let cappedW = cappedCount * CARD_W + Math.max(0, cappedCount - 1) * GAP_X;
    if (overflow > 0) cappedW += GAP_X + CARD_W * 0.5;
    return { idx, overflow, expanded, visible, cappedW };
  });

  const maxW = Math.max(...rows.map(r => r.cappedW), CARD_W);

  // Place cards centered per row; track the true canvas width so expanded rows
  // (which run past maxW) stay reachable via horizontal scroll.
  const nodes = [];
  let focusY = 0;
  let canvasW = maxW;
  rows.forEach(({ idx, overflow, expanded, visible, cappedW }) => {
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
      nodes.push({ kind: expanded ? 'collapse' : 'overflow', count: overflow, row: idx, x, y });
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
  layoutNodes.forEach(n => { if (n.id) byNodeId.set(n.id, n); });
  const edges = [];
  for (const n of layoutNodes) {
    if (!n.id) continue;
    const p = byId.get(n.id);
    if (!p) continue;
    for (const pid of (p.parentIds || [])) {
      const parent = byNodeId.get(pid);
      if (parent && parent.row === n.row - 1) {
        edges.push({
          x1: parent.x + CARD_W / 2,
          y1: parent.y + CARD_H,
          x2: n.x + CARD_W / 2,
          y2: n.y,
        });
      }
    }
  }
  return edges;
}

// ── Components ──────────────────────────────────────────────────────────

function LineageCard({ node, byId, onPick }) {
  const target = byId.get(node.id);
  if (!target) return null;
  const tier = window.TYPE_TIER[target.type];
  const isFocus = node.kind === 'focus';
  return (
    <div
      className={'lineage-card ' + node.kind + (isFocus ? ' focus' : '')}
      style={{ left: node.x, top: node.y, width: CARD_W, height: CARD_H }}
      onClick={() => !isFocus && onPick(node.id)}
      title={window.displayName(target) + ' · ' + (tier?.label || target.type) + ' · ' + target.tradition}
    >
      <div className="lineage-card-name">{window.displayName(target)}</div>
      <div className="lineage-card-meta">
        <window.TierIcon type={target.type} size={11} />
        <span className="lineage-card-trad">{target.tradition}</span>
      </div>
    </div>
  );
}

function Lineage({ entry, byId, childrenOf, onPick }) {
  const [upDepth, setUpDepth] = __lState(2);
  const [downDepth, setDownDepth] = __lState(2);
  // Which rows the user has expanded (by row index). Row indices shift when the
  // entry or the generation depth changes, so clear the set whenever they do.
  const [expandedRows, setExpandedRows] = __lState(() => new Set());
  __lEffect(() => { setExpandedRows(new Set()); }, [entry, upDepth, downDepth]);
  const toggleRow = (row) => setExpandedRows((prev) => {
    const next = new Set(prev);
    if (next.has(row)) next.delete(row); else next.add(row);
    return next;
  });

  const tree = __lMemo(
    () => buildLineageTree(entry, byId, childrenOf, upDepth, downDepth),
    [entry, byId, childrenOf, upDepth, downDepth],
  );
  const layout = __lMemo(() => layoutTree(tree, expandedRows), [tree, expandedRows]);
  const edges = __lMemo(() => computeEdges(layout.nodes, byId), [layout, byId]);

  const hasAny =
    tree.ancestorRowCount > 0 ||
    tree.descRowCount > 0 ||
    tree.siblings.length > 0;

  if (!hasAny) return null;

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

      <div className="lineage-wrap">
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
              />
            );
          })}
        </div>
      </div>

      <div className="lineage-controls">
        <span>Generations</span>
        <div className="lineage-step">
          <button onClick={() => setUpDepth(Math.max(0, upDepth - 1))} disabled={upDepth === 0}>−</button>
          <span>{upDepth}↑</span>
          <button onClick={() => setUpDepth(Math.min(4, upDepth + 1))} disabled={upDepth === 4}>+</button>
        </div>
        <div className="lineage-step">
          <button onClick={() => setDownDepth(Math.max(0, downDepth - 1))} disabled={downDepth === 0}>−</button>
          <span>{downDepth}↓</span>
          <button onClick={() => setDownDepth(Math.min(4, downDepth + 1))} disabled={downDepth === 4}>+</button>
        </div>
        <span className="lineage-controls-hint">
          Click any card to jump
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { Lineage });
