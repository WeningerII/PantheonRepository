// ═══════════════════════════════════════════════════════════════════════════
//  Graph.jsx — relation graph.
//
//  Design intent (every choice should serve one of these):
//    1. Bring the cross-tradition layer forward. The interpretatio /
//       syncretism / equated-with web across pantheons is the data's most
//       distinctive structure and the part hardest to see anywhere else.
//    2. Make the channels readable without flipping back to a key. Edge
//       color encodes relation family; persistent legend stays on-canvas.
//       Hover an edge to read its exact relation kind.
//    3. Make focus operate at three depths. Focus + 1-hop + 2-hop, each at
//       a distinct opacity; everything beyond is deeply ghosted but still
//       in place for spatial continuity when zooming in.
//    4. Every node carries two channels — type by fill, tradition by stroke.
//       The legend covers both with no extra UI cost.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: __gState, useEffect: __gEff, useRef: __gRef, useMemo: __gMemo, useCallback: __gCb } = React;

const NODE_CAP = 400;

// Edge family palette. Saturation low enough to layer at scale; the
// cross-tradition family gets the only chromatic stroke so it pops.
const EDGE_STYLE = {
  Lineage:           { stroke: '#0B0B0B', width: 1.1, dash: null,  alpha: 0.55 },
  Bonds:             { stroke: '#0B0B0B', width: 1.0, dash: null,  alpha: 0.30 },
  Teaching:          { stroke: '#3F6B4A', width: 1.0, dash: '2 3', alpha: 0.65 },
  Conflict:          { stroke: '#8B3A1F', width: 1.0, dash: '4 3', alpha: 0.65 },
  Alliance:          { stroke: '#1F4E79', width: 1.0, dash: null,  alpha: 0.55 },
  'Cross-tradition': { stroke: '#B5371F', width: 1.4, dash: '5 3', alpha: 0.85 },
  Other:             { stroke: '#0B0B0B', width: 0.8, dash: null,  alpha: 0.22 },
};

const MODES = [
  ['cross-tradition', 'Cross-tradition'],
  ['lineage',         'Lineage'],
  ['bonds',           'Bonds'],
  ['conflict',        'Conflict'],
  ['all',             'All'],
];

// ── Graph construction ─────────────────────────────────────────────────

function buildGraph(people, byId, mode, focusId) {
  const inUniverse = new Set(people.map(p => p.id));
  const includeFamilies = (() => {
    if (mode === 'all')             return null;
    if (mode === 'cross-tradition') return new Set(['Cross-tradition']);
    if (mode === 'lineage')         return new Set(['Lineage']);
    if (mode === 'bonds')           return new Set(['Bonds']);
    if (mode === 'conflict')        return new Set(['Conflict']);
    return null;
  })();

  const links = [];
  const seen = new Set();
  const addLink = (sId, tId, kind, family) => {
    if (sId === tId) return;
    if (!inUniverse.has(sId) || !inUniverse.has(tId)) return;
    if (includeFamilies && !includeFamilies.has(family)) return;
    const lo = sId < tId ? sId : tId;
    const hi = sId < tId ? tId : sId;
    const key = `${lo}|${hi}|${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source: sId, target: tId, kind, family });
  };

  for (const p of people) {
    if (!includeFamilies || includeFamilies.has('Lineage')) {
      for (const pid of (p.parentIds || [])) addLink(pid, p.id, 'parent', 'Lineage');
    }
    for (const r of (p.relations || [])) {
      if (!r.personId) continue;
      addLink(p.id, r.personId, r.kind, window.relationFamily(r.kind));
    }
  }

  // Nodes participate if they have at least one edge.
  const used = new Set();
  links.forEach(l => { used.add(l.source); used.add(l.target); });
  if (focusId) used.add(focusId);

  let nodes = people.filter(p => used.has(p.id)).map(p => ({
    id: p.id,
    label: window.displayName(p),
    type: p.type,
    tradition: p.tradition,
    degree: 0,
  }));

  // Focus mode: keep just the 2-hop subgraph, drop the rest. Keeps the
  // viewport readable.
  if (focusId) {
    const adj = new Map();
    links.forEach(l => {
      (adj.get(l.source) || adj.set(l.source, new Set()).get(l.source)).add(l.target);
      (adj.get(l.target) || adj.set(l.target, new Set()).get(l.target)).add(l.source);
    });
    const depth = new Map([[focusId, 0]]);
    const queue = [[focusId, 0]];
    while (queue.length) {
      const [id, d] = queue.shift();
      if (d >= 2) continue;
      for (const nbr of (adj.get(id) || [])) {
        if (!depth.has(nbr)) { depth.set(nbr, d + 1); queue.push([nbr, d + 1]); }
      }
    }
    nodes = nodes.filter(n => depth.has(n.id));
    nodes.forEach(n => { n.depth = depth.get(n.id); });
    const idsKept = new Set(nodes.map(n => n.id));
    for (let i = links.length - 1; i >= 0; i--) {
      const l = links[i];
      if (!idsKept.has(l.source) || !idsKept.has(l.target)) links.splice(i, 1);
    }
  } else {
    nodes.forEach(n => { n.depth = null; });
  }

  // Degree (post-filter)
  const deg = new Map();
  for (const l of links) {
    deg.set(l.source, (deg.get(l.source) || 0) + 1);
    deg.set(l.target, (deg.get(l.target) || 0) + 1);
  }
  nodes.forEach(n => { n.degree = deg.get(n.id) || 0; });

  // Cap by degree so a "show all" doesn't wedge the layout.
  const totalNodes = nodes.length;
  let truncated = false;
  if (nodes.length > NODE_CAP) {
    nodes.sort((a, b) => b.degree - a.degree);
    nodes = nodes.slice(0, NODE_CAP);
    const keep = new Set(nodes.map(n => n.id));
    for (let i = links.length - 1; i >= 0; i--) {
      const l = links[i];
      if (!keep.has(l.source) || !keep.has(l.target)) links.splice(i, 1);
    }
    truncated = true;
  }

  return { nodes, links, totalNodes, truncated };
}

// ── Force simulation ───────────────────────────────────────────────────
//
// The simulation lives ACROSS graph rebuilds. When the user drags the
// time scrubber, the rendered set of figures changes incrementally — most
// nodes are in both the old and new set, and their positions should be
// preserved so the layout doesn't "explode" from a center-circle seed
// every frame.
//
// Two pieces of memory:
//   1. positionsRef  — Map<id, {x, y, vx, vy}> — last-known coords per node,
//      survives graph rebuilds. Retained nodes inherit; new nodes get
//      seeded near a connected neighbor (or center as fallback).
//   2. simRef        — the d3 simulation instance, created once and
//      updated in place on each rebuild (.nodes(new).links(new) + alpha
//      0.3 .restart() ⇒ gentle re-equilibration instead of a hard reset).
//
// Cleanup is split: simulation creation/update fires per-rebuild; sim.stop()
// only fires on component unmount.

// Force-simulation tuning. Cross-tradition links are the only chromatic
// edges and want more breathing room; lineage/bonds tug tighter. These
// functions are shared between the creation and update branches of
// useForceSim — keep them at module scope so the two paths can never
// drift in their tuning.
const linkDistance = l => l.family === 'Cross-tradition' ? 110 : 60;
const linkStrength = l => l.family === 'Cross-tradition' ? 0.35 : 0.55;

// d3's force sim ticks at 60 Hz during convergence. The tick handler must
// not call setState — that would force React to re-walk 250+ JSX elements
// every frame just to discover that only `transform` / `x1y1x2y2` need
// DOM updates. Instead, d3 owns positions imperatively: mutate the node
// and link DOM nodes directly via refs the render layer populates.
// React-driven re-renders still happen for state changes (hover, focus,
// path mode) — those read the mutated `n.x` / `n.y` at render time, so
// the imperative path and the React path see the same numbers.
function useForceSim(graph, width, height, positionsRef, nodeElRefs, linkElRefs) {
  const simRef = __gRef(null);

  // Seed positions BEFORE the simulation sees nodes. Mutates graph.nodes
  // in place — fine, the nodes array is created fresh per buildGraph call.
  __gEff(() => {
    if (!graph.nodes.length || !width || !height) return;
    const cx = width / 2, cy = height / 2;
    const cache = positionsRef.current;

    // Phase 1: restore cached positions for retained nodes
    for (const n of graph.nodes) {
      const prev = cache.get(n.id);
      if (prev && Number.isFinite(prev.x) && Number.isFinite(prev.y)) {
        n.x = prev.x; n.y = prev.y;
        n.vx = prev.vx || 0; n.vy = prev.vy || 0;
      }
    }

    // Phase 2: place newcomers near a connected neighbor that already has
    // a cached position. Fall back to a small ring near center.
    const idIdx = new Map(graph.nodes.map((n, i) => [n.id, i]));
    for (const n of graph.nodes) {
      if (n.x != null) continue;
      let seeded = false;
      for (const l of graph.links) {
        const sId = typeof l.source === 'string' ? l.source : l.source.id;
        const tId = typeof l.target === 'string' ? l.target : l.target.id;
        const otherId = sId === n.id ? tId : (tId === n.id ? sId : null);
        if (!otherId) continue;
        const otherPos = cache.get(otherId)
          || (() => {
            const idx = idIdx.get(otherId);
            const o = idx != null ? graph.nodes[idx] : null;
            return (o && Number.isFinite(o.x)) ? { x: o.x, y: o.y } : null;
          })();
        if (otherPos) {
          n.x = otherPos.x + (Math.random() - 0.5) * 24;
          n.y = otherPos.y + (Math.random() - 0.5) * 24;
          seeded = true;
          break;
        }
      }
      if (!seeded) {
        const i = idIdx.get(n.id) || 0;
        const a = (i / Math.max(1, graph.nodes.length)) * Math.PI * 2;
        const r = Math.min(width, height) * 0.18;
        n.x = cx + r * Math.cos(a) + (Math.random() - 0.5) * 8;
        n.y = cy + r * Math.sin(a) + (Math.random() - 0.5) * 8;
      }
    }
  }, [graph, width, height, positionsRef]);

  // Create-or-update the simulation. Uses the same instance across rebuilds
  // so positions/velocities survive incremental data changes.
  __gEff(() => {
    if (!graph.nodes.length || !window.d3 || !width || !height) return;
    const d3 = window.d3;
    const cx = width / 2, cy = height / 2;

    // The tick handler is the hot path. Mutate DOM imperatively; do NOT
    // call setState. graph.links is captured by the closure but that's
    // fine — when graph rebuilds, this effect re-runs and replaces the
    // handler with a new closure over the new array.
    const onTick = () => {
      const sim = simRef.current;
      if (!sim) return;
      const links = graph.links;
      for (const n of sim.nodes()) {
        // Position cache (so the next rebuild can restore positions).
        positionsRef.current.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy });
        const el = nodeElRefs.current.get(n.id);
        if (el) el.setAttribute('transform', `translate(${n.x},${n.y})`);
      }
      // Link endpoints. Iterate the shared array in render order; refs
      // are keyed by the same index used as the React `key`.
      for (let i = 0; i < links.length; i++) {
        const el = linkElRefs.current.get(i);
        if (!el) continue;
        const l = links[i];
        const sx = typeof l.source === 'object' ? l.source.x : 0;
        const sy = typeof l.source === 'object' ? l.source.y : 0;
        const tx = typeof l.target === 'object' ? l.target.x : 0;
        const ty = typeof l.target === 'object' ? l.target.y : 0;
        el.setAttribute('x1', sx);
        el.setAttribute('y1', sy);
        el.setAttribute('x2', tx);
        el.setAttribute('y2', ty);
      }
    };

    if (!simRef.current) {
      // First-time creation
      simRef.current = d3.forceSimulation(graph.nodes)
        .force('link', d3.forceLink(graph.links)
          .id(d => d.id)
          .distance(linkDistance)
          .strength(linkStrength))
        .force('charge', d3.forceManyBody().strength(-220).distanceMax(420))
        .force('center', d3.forceCenter(cx, cy).strength(0.04))
        .force('collide', d3.forceCollide(d => 9 + Math.sqrt(d.degree || 1)))
        .alphaDecay(0.045)
        .on('tick', onTick);
    } else {
      // Update existing instance with the new node/link set. Reusing the
      // simulation keeps cached momentum + tick subscriptions intact.
      const sim = simRef.current;
      sim.nodes(graph.nodes);
      sim.force('link', d3.forceLink(graph.links)
        .id(d => d.id)
        .distance(linkDistance)
        .strength(linkStrength));
      sim.force('center', d3.forceCenter(cx, cy).strength(0.04));
      // Replace the tick handler so it closes over the current links array.
      sim.on('tick', onTick);
      // Light re-equilibration — enough to settle newcomers without
      // shoving retained nodes back to the center.
      sim.alpha(0.3).restart();
    }
  }, [graph, width, height, positionsRef, nodeElRefs, linkElRefs]);

  // Stop the simulation on UNMOUNT only (not on every dep change). The
  // empty-deps effect runs cleanup exactly once when the component leaves.
  __gEff(() => () => {
    if (simRef.current) { simRef.current.stop(); simRef.current = null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return simRef;
}

// ── Zoom / pan ─────────────────────────────────────────────────────────

function useZoomPan(svgRef, gRef, setZoomK, deps) {
  const zoomRef = __gRef(null);
  __gEff(() => {
    if (!svgRef.current || !window.d3) return;
    const d3 = window.d3;
    const zoom = d3.zoom()
      .scaleExtent([0.25, 6])
      .on('zoom', (e) => {
        if (gRef.current) gRef.current.setAttribute('transform', e.transform.toString());
        setZoomK(e.transform.k);
      });
    zoomRef.current = zoom;
    d3.select(svgRef.current).call(zoom);
    return () => { try { d3.select(svgRef.current).on('.zoom', null); } catch (_) {} };
  }, deps || []);
  return zoomRef;
}

// ── Focused-node info card ─────────────────────────────────────────────

function FocusCard({ entry, links, byId, onClear, onOpenDetail, onFocusNeighbor }) {
  if (!entry) return null;
  const tier = window.TYPE_TIER[entry.type];

  // Walk all edges incident to the focused entry; group them by family
  // (Lineage / Bonds / Teaching / Conflict / Alliance / Cross-tradition /
  // Other). Each neighbor row carries direction so the UI can show whether
  // the relation kind flows out of the focus or in.
  const neighborsByFamily = __gMemo(() => {
    const m = new Map();
    for (const l of links) {
      const sId = typeof l.source === 'string' ? l.source : l.source.id;
      const tId = typeof l.target === 'string' ? l.target : l.target.id;
      let otherId = null;
      let direction = null;
      if (sId === entry.id)      { otherId = tId; direction = 'out'; }
      else if (tId === entry.id) { otherId = sId; direction = 'in';  }
      else continue;
      const fam = l.family;
      if (!m.has(fam)) m.set(fam, []);
      m.get(fam).push({ id: otherId, kind: l.kind, direction });
    }
    // Stable sort each family's neighbors by name
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const an = window.displayName(byId.get(a.id)) || a.id;
        const bn = window.displayName(byId.get(b.id)) || b.id;
        return an.localeCompare(bn);
      });
    }
    return m;
  }, [entry.id, links, byId]);

  const totalNeighbors = __gMemo(
    () => [...neighborsByFamily.values()].reduce((n, arr) => n + arr.length, 0),
    [neighborsByFamily],
  );

  const familyOrder = [...window.RELATION_FAMILIES.map(f => f.name), 'Other']
    .filter(name => neighborsByFamily.has(name));

  return (
    <div className="graph-focus-card">
      <div className="graph-focus-eyebrow">
        <window.TierIcon type={entry.type} size={13} />
        <span className={'tier-tag tier-' + entry.type}>{tier?.label || entry.type}</span>
        <span className="graph-focus-dot" />
        <span>{entry.tradition}</span>
      </div>
      <div className="graph-focus-name">{window.displayName(entry)}</div>
      {(() => {
        const alt = window.altNames(entry)[0];
        return alt ? <div className="graph-focus-alt">{alt}</div> : null;
      })()}

      <div className="graph-focus-neighbors">
        <div className="graph-focus-neighbors-head">
          <span>Neighbors</span>
          <span className="graph-focus-neighbors-count">{totalNeighbors}</span>
        </div>
        <div className="graph-focus-neighbors-list">
          {familyOrder.length === 0 && (
            <div className="graph-focus-neighbors-empty">no edges to other figures in this view</div>
          )}
          {familyOrder.map(famName => {
            const arr = neighborsByFamily.get(famName);
            const style = EDGE_STYLE[famName] || EDGE_STYLE.Other;
            return (
              <div className="graph-focus-family" key={famName}>
                <div className="graph-focus-family-head">
                  <span
                    className="graph-focus-family-swatch"
                    style={{
                      '--swatch-color': style.stroke,
                      '--swatch-alpha': style.alpha,
                    }}
                    aria-hidden="true"
                  />
                  <span className="graph-focus-family-name">{famName}</span>
                  <span className="graph-focus-family-count">{arr.length}</span>
                </div>
                {arr.map((n, i) => {
                  const target = byId.get(n.id);
                  if (!target) return null;
                  return (
                    <div
                      key={i}
                      className="graph-focus-neighbor"
                      onClick={() => onFocusNeighbor && onFocusNeighbor(n.id)}
                    >
                      <window.TierIcon type={target.type} size={11} />
                      <span className="graph-focus-neighbor-name">{window.displayName(target)}</span>
                      <span className="graph-focus-neighbor-kind">
                        <span className="graph-focus-neighbor-arrow">{n.direction === 'out' ? '→' : '←'}</span>
                        {n.kind}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="graph-focus-actions">
        <button className="btn btn-sm btn-accent" onClick={() => onOpenDetail(entry.id)}>Open detail →</button>
        <button className="btn btn-sm" onClick={onClear}>Clear focus</button>
      </div>
    </div>
  );
}

// ── Persistent edge-color legend ───────────────────────────────────────

// ── Path summary card ─────────────────────────────────────────────────
// Shown in place of the FocusCard when a path is computed. Renders the
// chain of figures + relation kinds along the shortest path.

function PathCard({ result, byId, onOpenDetail, onClear }) {
  if (!result || !result.edges.length) return null;
  return (
    <div className="graph-path-card">
      <div className="graph-path-card-head">
        <div className="graph-path-card-title">
          Path · <strong>{result.edges.length}</strong> hop{result.edges.length === 1 ? '' : 's'}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClear}>clear</button>
      </div>
      <div className="graph-path-card-chain">
        {result.nodes.map((id, i) => {
          const node = byId.get(id);
          if (!node) return null;
          const tier = window.TYPE_TIER[node.type];
          return (
            <React.Fragment key={id}>
              <div className="graph-path-step-node" onClick={() => onOpenDetail(id)}>
                <window.TierIcon type={node.type} size={12} />
                <div className="graph-path-step-text">
                  <div className="graph-path-step-name">{window.displayName(node)}</div>
                  <div className="graph-path-step-meta">{tier?.label || node.type} · {node.tradition}</div>
                </div>
              </div>
              {i < result.edges.length && (
                <div
                  className="graph-path-step-edge"
                  style={{ '--edge-color': EDGE_STYLE[result.edges[i].family]?.stroke }}
                >
                  <span className="graph-path-step-edge-dash">↓</span>
                  <span className="graph-path-step-edge-kind">{result.edges[i].kind}</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function GraphLegend({ activeFamilies, hiddenFamilies, hiddenTiers, onToggleFamily, onToggleTier, onReset }) {
  const anyHidden = hiddenFamilies.size > 0 || hiddenTiers.size > 0;
  return (
    <div className="graph-legend">
      <div className="graph-legend-section">
        <div className="graph-legend-head">
          <span className="graph-legend-title">Edges</span>
          {anyHidden && <button className="graph-legend-reset" onClick={onReset}>reset</button>}
        </div>
        {[...window.RELATION_FAMILIES.map(f => f.name), 'Other']
          .filter(name => activeFamilies.has(name))
          .map(name => {
            const s = EDGE_STYLE[name];
            const hidden = hiddenFamilies.has(name);
            return (
              <button
                className={'graph-legend-row clickable' + (hidden ? ' hidden' : '')}
                key={name}
                onClick={() => onToggleFamily(name)}
                title={hidden ? 'Show ' + name : 'Hide ' + name}
              >
                <svg width={28} height={6} aria-hidden="true">
                  <line
                    x1={1} y1={3} x2={27} y2={3}
                    stroke={s.stroke}
                    strokeOpacity={hidden ? 0.25 : s.alpha}
                    strokeWidth={s.width}
                    strokeDasharray={s.dash || undefined}
                  />
                </svg>
                <span>{name}</span>
              </button>
            );
          })}
      </div>
      <div className="graph-legend-section">
        <div className="graph-legend-head">
          <span className="graph-legend-title">Nodes</span>
        </div>
        {Object.keys(window.TYPE_TIER).map(t => {
          const tier = window.TYPE_TIER[t];
          const hidden = hiddenTiers.has(t);
          return (
            <button
              className={'graph-legend-row clickable' + (hidden ? ' hidden' : '')}
              key={t}
              onClick={() => onToggleTier(t)}
              title={hidden ? 'Show ' + tier.label : 'Hide ' + tier.label}
            >
              <window.TierIcon type={t} size={14} />
              <span>{tier?.label || t}</span>
            </button>
          );
        })}
        <div className="graph-legend-note">stroke = tradition pigment</div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────

// Returns true iff the figure has a parseable date range that contains
// `year`. Used by the graph time scrubber. Figures with no parseable
// range are excluded when scoping is active (consistent with the atlas
// scrubber's policy of fading unparseable polygons rather than
// pretending they fit any specific year).
function figureActiveAt(entry, year) {
  if (!entry) return false;
  const d = window.getEntryDates(entry);
  const start = d.mythicStart ?? d.textualStart;
  const end   = d.mythicEnd   ?? d.textualEnd ?? start;
  if (start == null || end == null) return false;
  return year >= start && year <= end;
}

function Graph({ people, byId, focusId, setFocusId, onOpenDetail }) {
  const [mode, setMode] = __gState('cross-tradition');
  const [hoverNode, setHoverNode] = __gState(null);  // id
  const [hoverPos, setHoverPos] = __gState(null);    // {x, y} for info chip
  const [hoverEdge, setHoverEdge] = __gState(null);  // { kind, family, x, y, a, b }
  const [pathMode, setPathMode] = __gState(false);
  const [pathStart, setPathStart] = __gState(null);
  const [pathEnd, setPathEnd] = __gState(null);
  const [hiddenFamilies, setHiddenFamilies] = __gState(() => new Set());
  const [hiddenTiers, setHiddenTiers] = __gState(() => new Set());
  const [yearScope, setYearScope] = __gState(false);
  const [year, setYear] = __gState(0);
  const containerRef = __gRef(null);
  const svgRef = __gRef(null);
  const gRef = __gRef(null);
  const [size, setSize] = __gState({ w: 0, h: 0 });
  const [zoomK, setZoomK] = __gState(1);

  // Path mode forces the full graph view so endpoints + intermediate nodes
  // always exist in the rendered set, no matter what relation family the
  // user was browsing when they toggled path on.
  __gEff(() => {
    if (pathMode && mode !== 'all') setMode('all');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathMode]);

  __gEff(() => {
    if (!containerRef.current) return;
    const update = () => {
      const r = containerRef.current.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Year-scope: pre-filter the people set before handing to buildGraph.
  // Keep this OUTSIDE buildGraph so the year dependency doesn't tear up
  // the rest of the layout pipeline; only the visible set changes.
  const scopedPeople = __gMemo(() => {
    if (!yearScope) return people;
    return people.filter(p => figureActiveAt(p, year));
  }, [people, yearScope, year]);

  const graph = __gMemo(
    () => buildGraph(scopedPeople, byId, mode, focusId),
    [scopedPeople, byId, mode, focusId],
  );
  // Position memory survives graph rebuilds so dragging the year slider
  // doesn't re-explode the layout every frame. See useForceSim above.
  const positionsRef = __gRef(new Map());
  // Per-node and per-link SVG element refs. Populated by ref callbacks on
  // the rendered <g> / <line> elements; consumed by useForceSim's tick
  // handler to mutate transforms directly without going through React.
  const nodeElRefs = __gRef(new Map());
  const linkElRefs = __gRef(new Map());
  useForceSim(graph, size.w, size.h, positionsRef, nodeElRefs, linkElRefs);
  const zoomRef = useZoomPan(svgRef, gRef, setZoomK, [graph, size.w, size.h]);

  // ── Path-find adjacency (independent of mode) ──────────────────────────
  // The path search always considers the full relation set, not just the
  // currently-rendered slice. Built lazily — only when pathMode is on.
  const pathAdj = __gMemo(() => {
    if (!pathMode) return null;
    const adj = new Map();
    const add = (a, b, kind, family) => {
      if (!adj.has(a)) adj.set(a, []);
      adj.get(a).push({ to: b, kind, family });
    };
    for (const p of people) {
      for (const pid of (p.parentIds || [])) {
        if (byId.has(pid)) { add(p.id, pid, 'parent', 'Lineage'); add(pid, p.id, 'parent', 'Lineage'); }
      }
      for (const r of (p.relations || [])) {
        if (!r.personId || !byId.has(r.personId)) continue;
        const fam = window.relationFamily(r.kind);
        add(p.id, r.personId, r.kind, fam);
        add(r.personId, p.id, r.kind, fam);
      }
    }
    return adj;
  }, [people, byId, pathMode]);

  // BFS shortest path. Cap depth at 8 hops — the diameter of any reasonable
  // mythological graph is well below this; beyond it the network is so
  // tenuous the answer isn't useful anyway.
  const pathResult = __gMemo(() => {
    if (!pathStart || !pathEnd || !pathAdj) return null;
    if (pathStart === pathEnd) return { nodes: [pathStart], edges: [] };
    const MAX_DEPTH = 8;
    const prev = new Map();      // id -> { from, kind, family }
    const visited = new Set([pathStart]);
    let frontier = [pathStart];
    let found = false;
    for (let depth = 0; depth < MAX_DEPTH && !found; depth++) {
      const next = [];
      for (const node of frontier) {
        for (const e of (pathAdj.get(node) || [])) {
          if (visited.has(e.to)) continue;
          visited.add(e.to);
          prev.set(e.to, { from: node, kind: e.kind, family: e.family });
          if (e.to === pathEnd) { found = true; break; }
          next.push(e.to);
        }
        if (found) break;
      }
      frontier = next;
    }
    if (!prev.has(pathEnd)) return { nodes: [], edges: [], unreachable: true };
    const nodes = [pathEnd];
    const edges = [];
    let cur = pathEnd;
    while (cur !== pathStart) {
      const p = prev.get(cur);
      if (!p) break;
      edges.unshift({ from: p.from, to: cur, kind: p.kind, family: p.family });
      nodes.unshift(p.from);
      cur = p.from;
    }
    return { nodes, edges };
  }, [pathStart, pathEnd, pathAdj]);

  const pathNodeSet = __gMemo(() => {
    if (!pathResult?.nodes?.length) return null;
    return new Set(pathResult.nodes);
  }, [pathResult]);

  const pathEdgeSet = __gMemo(() => {
    if (!pathResult?.edges?.length) return null;
    const s = new Set();
    pathResult.edges.forEach(e => {
      const lo = e.from < e.to ? e.from : e.to;
      const hi = e.from < e.to ? e.to : e.from;
      s.add(lo + '|' + hi);
    });
    return s;
  }, [pathResult]);

  // Active edge families (for the legend — only show what's actually here).
  const activeFamilies = __gMemo(() => {
    const s = new Set();
    graph.links.forEach(l => s.add(l.family));
    return s;
  }, [graph.links]);

  const focused = focusId ? byId.get(focusId) : null;

  // Hovering a node temporarily highlights its 1-hop (without changing
  // focus). Useful for scrubbing through a dense region.
  const nodeNeighbors = __gMemo(() => {
    if (!hoverNode) return null;
    const s = new Set([hoverNode]);
    graph.links.forEach(l => {
      const sId = typeof l.source === 'string' ? l.source : l.source.id;
      const tId = typeof l.target === 'string' ? l.target : l.target.id;
      if (sId === hoverNode) s.add(tId);
      if (tId === hoverNode) s.add(sId);
    });
    return s;
  }, [hoverNode, graph.links]);

  // Compute display opacity for a node at the active depth.
  const nodeOpacity = (n) => {
    // Hidden by legend tier toggle
    if (hiddenTiers.has(n.type)) return 0;
    // Path mode — a path is rendered or being assembled.
    if (pathMode) {
      if (pathNodeSet) return pathNodeSet.has(n.id) ? 1 : 0.10;
      // No path computed yet — just dim everything except endpoints
      if (n.id === pathStart || n.id === pathEnd) return 1;
      if (hoverNode === n.id) return 1;
      return 0.35;
    }
    if (hoverNode) return (nodeNeighbors && nodeNeighbors.has(n.id)) ? 1 : 0.20;
    if (!focusId)  return 1;
    if (n.depth === 0) return 1;
    if (n.depth === 1) return 0.95;
    if (n.depth === 2) return 0.42;
    return 0.10;
  };
  const edgeOpacity = (sId, tId, family) => {
    // Hidden by legend family toggle or either endpoint's tier toggle
    if (hiddenFamilies.has(family)) return 0;
    const sNode = byId.get(sId);
    const tNode = byId.get(tId);
    if (sNode && hiddenTiers.has(sNode.type)) return 0;
    if (tNode && hiddenTiers.has(tNode.type)) return 0;
    if (pathMode) {
      if (pathEdgeSet) {
        const lo = sId < tId ? sId : tId;
        const hi = sId < tId ? tId : sId;
        return pathEdgeSet.has(lo + '|' + hi) ? 1 : 0.05;
      }
      return 0.07;
    }
    if (hoverNode) return (sId === hoverNode || tId === hoverNode) ? 1 : 0.10;
    if (!focusId)  return 1;
    const sd = graph.nodes.find(n => n.id === sId)?.depth ?? 99;
    const td = graph.nodes.find(n => n.id === tId)?.depth ?? 99;
    const min = Math.min(sd, td);
    if (min === 0) return 1;
    if (min === 1) return 0.55;
    return 0.10;
  };

  // Label policy
  const labelMode = (() => {
    if (focusId) return 'focus-and-1hop';
    if (graph.nodes.length <= 60) return 'all';
    if (zoomK >= 1.6) return 'all';
    return 'top-degree';                       // top quartile by degree
  })();
  const labelDegreeThreshold = __gMemo(() => {
    if (labelMode !== 'top-degree') return -1;
    const degs = graph.nodes.map(n => n.degree).sort((a, b) => b - a);
    return degs[Math.min(degs.length - 1, Math.floor(degs.length * 0.25))] || 0;
  }, [labelMode, graph.nodes]);
  const shouldShowLabel = (n) => {
    if (n.id === hoverNode) return true;
    if (n.id === focusId) return true;
    if (labelMode === 'all') return true;
    if (labelMode === 'focus-and-1hop') return n.depth != null && n.depth <= 1;
    if (labelMode === 'top-degree') return n.degree >= labelDegreeThreshold;
    return false;
  };

  // Zoom controls
  const zoomBy = __gCb((factor) => {
    if (!window.d3 || !svgRef.current || !zoomRef.current) return;
    window.d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, factor);
  }, []);
  const resetZoom = __gCb(() => {
    if (!window.d3 || !svgRef.current || !zoomRef.current) return;
    window.d3.select(svgRef.current).transition().duration(300)
      .call(zoomRef.current.transform, window.d3.zoomIdentity);
  }, []);

  return (
    <div className="graph-wrap">
      <div className="graph-bar">
        <div className="graph-bar-section">
          <span className="graph-bar-label">Edges</span>
          <div className="graph-modes">
            {MODES.map(([k, label]) => (
              <button
                key={k}
                className={mode === k ? 'active' : ''}
                onClick={() => setMode(k)}
                disabled={pathMode}
                title={pathMode ? 'Path mode uses all relations' : undefined}
              >{label}</button>
            ))}
          </div>
        </div>
        <div className="graph-bar-section graph-stats">
          <span>{graph.nodes.length.toLocaleString()} nodes</span>
          <span>{graph.links.length.toLocaleString()} edges</span>
          {graph.truncated && (
            <span className="graph-stats-capped">
              capped from {graph.totalNodes.toLocaleString()}
            </span>
          )}
        </div>
        <div className="graph-bar-right">
          <button
            className={'btn btn-sm' + (yearScope ? ' btn-on' : '')}
            onClick={() => setYearScope(s => !s)}
            title="Show only figures alive at a specific year"
          >
            {yearScope ? '✕ All time' : 'Scope by year'}
          </button>
          <button
            className={'btn btn-sm' + (pathMode ? ' btn-accent btn-on' : '')}
            onClick={() => {
              setPathMode(pm => !pm);
              setPathStart(null); setPathEnd(null);
            }}
            title="Find the shortest relation path between two figures"
          >
            {pathMode ? '✕ Exit path' : 'Find path →'}
          </button>
        </div>
      </div>

      {yearScope && (
        <div className="graph-time-bar">
          <span className="graph-time-label">Year:</span>
          <input
            type="range"
            min={-3000} max={2025} step={1}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            aria-label="Year scrubber"
          />
          <div className="graph-time-year">{window.formatYearSigned(year)}</div>
          <div className="graph-time-anchors">
            {[
              [-2300, '2300 BCE'],
              [-1184, 'Troy'],
              [-27,   'Augustus'],
              [800,   '800 CE'],
              [1492,  '1492'],
              [1851,  '1851'],
            ].map(([y, label]) => (
              <button
                key={y}
                className="graph-time-anchor"
                onClick={() => setYear(y)}
                title={`Jump to ${window.formatYearSigned(y)}`}
              >{label}</button>
            ))}
          </div>
          <div className="graph-time-status">
            <strong>{scopedPeople.length.toLocaleString()}</strong> of {people.length.toLocaleString()} figures
          </div>
        </div>
      )}

      {pathMode && (
        <div className="graph-path-bar">
          <span className="graph-path-step">Path:</span>
          <button
            className={'graph-path-slot ' + (pathStart ? 'set' : 'empty') + (pathStart && !pathEnd ? ' active' : '')}
            onClick={() => setPathStart(null)}
          >
            <span className="slot-label">From</span>
            {pathStart ? (
              <span className="slot-value">{window.displayName(byId.get(pathStart))}</span>
            ) : (
              <span className="slot-hint">click a node →</span>
            )}
          </button>
          <span className="graph-path-arrow">→</span>
          <button
            className={'graph-path-slot ' + (pathEnd ? 'set' : 'empty') + (pathStart && !pathEnd ? ' active' : '')}
            onClick={() => setPathEnd(null)}
          >
            <span className="slot-label">To</span>
            {pathEnd ? (
              <span className="slot-value">{window.displayName(byId.get(pathEnd))}</span>
            ) : (
              <span className="slot-hint">click a node →</span>
            )}
          </button>
          {(pathStart || pathEnd) && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => { setPathStart(null); setPathEnd(null); }}
            >clear</button>
          )}
          <div className="graph-path-status">
            {pathResult?.unreachable && (
              <span className="graph-path-unreachable">no path within 8 hops</span>
            )}
            {pathResult && !pathResult.unreachable && pathResult.edges.length > 0 && (
              <span className="graph-path-length">
                <strong>{pathResult.edges.length}</strong> hop{pathResult.edges.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      )}

      <div ref={containerRef} className="graph-canvas">
        {graph.nodes.length === 0 ? (
          <div className="graph-empty">
            <div className="empty-mark" aria-hidden="true" />
            <h2>No {mode === 'cross-tradition' ? 'cross-tradition' : mode} edges in this set.</h2>
            <p>Try a different relation mode or loosen the rail filter.</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={size.w} height={size.h}
            onClick={(e) => { if (e.target === svgRef.current) setFocusId(null); }}
          >
            <g ref={gRef}>
              {graph.links.map((l, i) => {
                const sId = typeof l.source === 'string' ? l.source : l.source.id;
                const tId = typeof l.target === 'string' ? l.target : l.target.id;
                const sx = typeof l.source === 'object' ? l.source.x : 0;
                const sy = typeof l.source === 'object' ? l.source.y : 0;
                const tx = typeof l.target === 'object' ? l.target.x : 0;
                const ty = typeof l.target === 'object' ? l.target.y : 0;
                const style = EDGE_STYLE[l.family] || EDGE_STYLE.Other;
                const op = edgeOpacity(sId, tId, l.family);
                const inPath = pathEdgeSet && pathEdgeSet.has(
                  (sId < tId ? sId : tId) + '|' + (sId < tId ? tId : sId)
                );
                return (
                  <line
                    key={i}
                    ref={el => { if (el) linkElRefs.current.set(i, el); else linkElRefs.current.delete(i); }}
                    x1={sx} y1={sy} x2={tx} y2={ty}
                    stroke={inPath ? '#B5371F' : style.stroke}
                    strokeOpacity={inPath ? 0.95 : style.alpha * op}
                    strokeWidth={inPath ? 2.4 : style.width}
                    strokeDasharray={inPath ? undefined : (style.dash || undefined)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoverEdge({
                      kind: l.kind, family: l.family,
                      a: window.displayName(byId.get(sId)) || sId,
                      b: window.displayName(byId.get(tId)) || tId,
                    })}
                    onMouseLeave={() => setHoverEdge(null)}
                  />
                );
              })}
              {graph.nodes.map((n) => {
                const isFocus = focusId === n.id;
                const isHover = hoverNode === n.id;
                const r = 3.5 + Math.min(8, Math.sqrt(n.degree));
                // Hit-target radius. Fitts' law — the visible dot is too
                // small (7-23 px diameter) to land on cleanly. An invisible
                // larger circle behind it makes the *clickable* area
                // 28-39 px while preserving the visual minimalism.
                const hitR = Math.max(14, r + 8);
                const fill = window.TYPE_TIER[n.type]?.color || '#888';
                const stroke = window.colorForTradition(n.tradition) || 'rgba(0,0,0,0.2)';
                const op = nodeOpacity(n);
                return (
                  <g
                    key={n.id}
                    ref={el => { if (el) nodeElRefs.current.set(n.id, el); else nodeElRefs.current.delete(n.id); }}
                    transform={`translate(${n.x || 0},${n.y || 0})`}
                    style={{ cursor: 'pointer', opacity: op, transition: 'opacity .12s' }}
                    // Disable hits on tier-toggled-off nodes so the user
                    // can't trip over an invisible-but-still-live hit zone.
                    pointerEvents={op === 0 ? 'none' : 'auto'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pathMode) {
                        // Click cycles through: empty → set start → set end
                        // → reset and set start again.
                        if (!pathStart || (pathStart && pathEnd)) {
                          setPathStart(n.id);
                          setPathEnd(null);
                        } else if (n.id !== pathStart) {
                          setPathEnd(n.id);
                        }
                        return;
                      }
                      setFocusId(n.id);
                    }}
                    onDoubleClick={(e) => { e.stopPropagation(); onOpenDetail(n.id); }}
                    onMouseEnter={(e) => {
                      setHoverNode(n.id);
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => { setHoverNode(null); setHoverPos(null); }}
                  >
                    {/* Invisible hit-target. fill="transparent" (not "none")
                        because "none" is non-hittable in SVG; transparent
                        paint catches events without rendering anything. */}
                    <circle r={hitR} fill="transparent" />
                    {(isFocus || (pathNodeSet && pathNodeSet.has(n.id))) && (
                      <circle r={r + 5} fill="none"
                              stroke={(pathStart === n.id || pathEnd === n.id) ? '#B5371F' : '#0B0B0B'}
                              strokeOpacity={0.65}
                              strokeWidth={(pathStart === n.id || pathEnd === n.id) ? 2 : 1} />
                    )}
                    <circle
                      r={r}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isFocus || isHover ? 2.2 : 1.4}
                    />
                    {shouldShowLabel(n) && (
                      <text
                        x={r + 5}
                        y={3.5}
                        fontFamily="Newsreader, serif"
                        fontSize={isFocus ? 13 : (isHover ? 12 : 11)}
                        fontWeight={isFocus ? 600 : 500}
                        fill="#0B0B0B"
                        // pointerEvents="all" — entire text bounding box
                        // catches events, not just the rendered glyphs.
                        // Clicking on a name now opens that node.
                        pointerEvents="all"
                        style={{ paintOrder: 'stroke', stroke: 'rgba(250,250,247,0.92)', strokeWidth: 3 }}
                      >
                        {n.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Persistent legend, top-right of the canvas */}
        <GraphLegend
          activeFamilies={activeFamilies}
          hiddenFamilies={hiddenFamilies}
          hiddenTiers={hiddenTiers}
          onToggleFamily={(name) => setHiddenFamilies(s => {
            const n = new Set(s);
            n.has(name) ? n.delete(name) : n.add(name);
            return n;
          })}
          onToggleTier={(t) => setHiddenTiers(s => {
            const n = new Set(s);
            n.has(t) ? n.delete(t) : n.add(t);
            return n;
          })}
          onReset={() => { setHiddenFamilies(new Set()); setHiddenTiers(new Set()); }}
        />

        {/* Zoom controls, bottom-left */}
        <div className="graph-zoom" aria-label="Zoom controls">
          <button onClick={() => zoomBy(1.4)}     title="Zoom in (+)"  aria-label="Zoom in">+</button>
          <button onClick={() => zoomBy(1 / 1.4)} title="Zoom out (−)" aria-label="Zoom out">−</button>
          <button onClick={resetZoom} className="graph-zoom-home" title="Reset zoom" aria-label="Reset zoom">⌂</button>
        </div>

        {/* Edge hover tooltip */}
        {hoverEdge && (
          <div className="graph-edge-tip">
            <div className="graph-edge-tip-kind">
              <span
                className="graph-edge-tip-swatch"
                style={{
                  background: EDGE_STYLE[hoverEdge.family]?.stroke,
                  opacity: EDGE_STYLE[hoverEdge.family]?.alpha,
                }}
              />
              {hoverEdge.kind}
            </div>
            <div className="graph-edge-tip-ends">
              {hoverEdge.a} <span>↔</span> {hoverEdge.b}
            </div>
          </div>
        )}

        {/* Node hover info chip — position follows the cursor. Suppress
            when the focus card or path summary card is showing for the
            same node, to avoid double-display. */}
        {hoverNode && hoverPos && hoverNode !== focusId && hoverNode !== pathStart && hoverNode !== pathEnd && (() => {
          const n = byId.get(hoverNode);
          if (!n) return null;
          const tier = window.TYPE_TIER[n.type];
          const gn = graph.nodes.find(x => x.id === hoverNode);
          return (
            <div
              className="graph-node-chip"
              style={{
                left: Math.min(hoverPos.x + 14, (containerRef.current?.getBoundingClientRect().right || 9999) - 280),
                top:  hoverPos.y + 14,
              }}
            >
              <div className="graph-node-chip-name">{window.displayName(n)}</div>
              <div className="graph-node-chip-meta">
                <window.TierIcon type={n.type} size={11} />
                <span>{tier?.label || n.type}</span>
                <span className="sep">·</span>
                <span>{n.tradition}</span>
                {gn && (
                  <>
                    <span className="sep">·</span>
                    <span className="graph-node-chip-degree">{gn.degree} {gn.degree === 1 ? 'edge' : 'edges'}</span>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Path summary card — supersedes focus card while in path mode */}
        {pathMode && pathResult && pathResult.edges.length > 0 && (
          <PathCard
            result={pathResult}
            byId={byId}
            onOpenDetail={onOpenDetail}
            onClear={() => { setPathStart(null); setPathEnd(null); }}
          />
        )}

        {/* Focus card — only when a node is focused and we're NOT in path mode */}
        {!pathMode && focused && (
          <FocusCard
            entry={focused}
            links={graph.links}
            byId={byId}
            onClear={() => setFocusId(null)}
            onOpenDetail={(id) => onOpenDetail(id)}
            onFocusNeighbor={(id) => setFocusId(id)}
          />
        )}
      </div>

      <div className="graph-footer">
        {pathMode ? (
          <>
            <span>Click any node to set the From slot; then any other to set To.</span>
            <span>Shortest path appears automatically when both are set.</span>
          </>
        ) : (
          <>
            <span>Click to focus · double-click to open entry</span>
            <span>Hover an edge to read its kind</span>
            <span>Scroll to zoom · drag to pan</span>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Graph });
