// ═══════════════════════════════════════════════════════════════════════════
//  Lifecycle.jsx — era-scaled timeline of a figure's status transitions.
//
//  A lifecycle is an ordered sequence of (typeStatus, vitalStatus, era,
//  notes) tuples. The data carries genuine temporal structure — eras have
//  numeric date ranges, stages slot inside eras with an ordinal — but the
//  prior render dumped it as a vertical list and lost the structure.
//
//  This renders the same data as a horizontal axis: tradition eras as
//  bands of variable pixel width, stage nodes plotted at their era's
//  start year (sub-positioned by eraOrdering when an era holds multiple
//  stages), connected by a thin progression line. Type-status governs
//  the node fill; vital-status governs the path style of the segment
//  leading INTO that stage (dotted means the figure was dead through it,
//  solid means alive). Notes appear on hover.
//
//  Fallback: if the tradition has fewer than two parseable era dates,
//  we render an unscaled progression — still horizontal, still readable,
//  but without a numeric ruler.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: __lcState, useMemo: __lcMemo, useRef: __lcRef, useEffect: __lcEff } = React;

// Type-status palette. Reuses node fills from Graph + adds the in-between
// states the lifecycle data uses (titan / primordial / apotheosed / etc).
const TS_FILL = {
  primordial: '#3F3A33',
  titan:      '#806033',
  deity:      '#C2972B',
  apotheosed: '#C2972B',
  demigod:    '#A04D26',
  quartigod:  '#7F6E54',
  scion:      '#487A57',
  mortal:     '#6B6660',
  deposed:    '#5A5550',
  euhemeros:  '#5A5550',
};

// Glyph drawn inside the stage node.
const TS_GLYPH = {
  primordial: '∞',
  titan:      'T',
  deity:      'D',
  apotheosed: '✦',
  demigod:    '½',
  quartigod:  '¼',
  scion:      'S',
  mortal:     'M',
  deposed:    '×',
  euhemeros:  'M',
};

const NODE_R = 12;
const AXIS_H = 28;          // height of the era ruler (band labels)
const ROW_H  = 60;          // vertical room for stage nodes
const PAD_X  = 24;

function nameForTypeStatus(ts) {
  if (!ts) return '—';
  return ts.charAt(0).toUpperCase() + ts.slice(1);
}

// ── Build the era spans (ordered, with numeric start/end) ──────────────
//
// For lifecycle plotting we prefer mythic dates over textual dates: textual
// dates are when the SOURCES were written (e.g. Hesiod c.-750, Apollodorus
// c.150 CE), and they collapse every mythic era to the same wide attestation
// window. Mythic dates are when the story is SET (Titanomachy → Trojan War),
// which is the right axis for a figure's transitions. Textual dates serve
// only as fallback when mythic is unavailable.

function buildEraSpans(tradition) {
  const order = window.__PR?.ERA_ORDER?.[tradition] || [];
  const dates = window.__PR?.ERA_DATES?.[tradition] || {};
  const spans = [];
  for (let i = 0; i < order.length; i++) {
    const era = order[i];
    const d = dates[era];
    if (!d) continue;
    const start = d.mythicStart ?? d.textualStart;
    let end     = d.mythicEnd   ?? d.textualEnd ?? null;
    // Some eras lack an end date (open-ended modern). Use a sensible
    // ceiling so the band still gets pixels.
    if (end == null) {
      const next = order.slice(i + 1).map(e => dates[e]).filter(Boolean)[0];
      if (next) end = next.mythicStart ?? next.textualStart ?? (start != null ? start + 100 : null);
      else if (start != null) end = Math.max(start + 100, 2025);
    }
    if (start == null || end == null) continue;
    spans.push({ era, start, end, idx: i });
  }
  return spans;
}

// Build the full plot model: era band rects, stage nodes (with x), and
// inter-stage segments.
function buildPlot(lc, tradition, width) {
  const eraSpans = buildEraSpans(tradition);
  if (eraSpans.length === 0) return { mode: 'fallback', stages: lc };

  // Restrict the axis range to just the eras the entry actually touches,
  // plus one band of slack on either side so the start/end isn't flush.
  const touched = new Set(lc.map(s => s.era));
  const touchedIdx = eraSpans
    .map((s, i) => touched.has(s.era) ? i : -1)
    .filter(i => i >= 0);
  if (touchedIdx.length === 0) return { mode: 'fallback', stages: lc };
  const lo = Math.max(0, Math.min(...touchedIdx) - 1);
  const hi = Math.min(eraSpans.length - 1, Math.max(...touchedIdx) + 1);
  const visibleSpans = eraSpans.slice(lo, hi + 1);
  const tMin = visibleSpans[0].start;
  const tMax = visibleSpans[visibleSpans.length - 1].end;
  // Degenerate span (single zero-width era, or unparseable bounds) would make
  // xFor divide by zero and emit NaN coordinates — fall back to the unscaled
  // progression instead.
  if (!(tMax > tMin)) return { mode: 'fallback', stages: lc };

  const plotW = Math.max(280, width - PAD_X * 2);
  const xFor = (year) => PAD_X + ((year - tMin) / (tMax - tMin)) * plotW;

  const bands = visibleSpans.map(s => ({
    era: s.era,
    x0: xFor(s.start),
    x1: xFor(s.end),
    label: s.era.replace(/-/g, ' '),
    start: s.start,
    end: s.end,
  }));

  // Group stages by era so we can fan multiple events out.
  const byEra = new Map(visibleSpans.map(s => [s.era, s]));
  const inEra = new Map();
  for (const s of lc) {
    if (!byEra.has(s.era)) continue;
    if (!inEra.has(s.era)) inEra.set(s.era, []);
    inEra.get(s.era).push(s);
  }
  // Within each era, sort by eraOrdering (fallback to original index)
  for (const arr of inEra.values()) {
    arr.sort((a, b) => (a.eraOrdering ?? 0) - (b.eraOrdering ?? 0));
  }

  const nodes = [];
  for (const [era, arr] of inEra) {
    const span = byEra.get(era);
    const x0 = xFor(span.start);
    const x1 = xFor(span.end);
    arr.forEach((stage, i) => {
      const frac = arr.length === 1
        ? 0.5
        : (i + 1) / (arr.length + 1);
      const x = x0 + (x1 - x0) * frac;
      const yearApprox = span.start + (span.end - span.start) * frac;
      nodes.push({
        stage, x,
        yearApprox,
        era: stage.era,
        originalIndex: lc.indexOf(stage),
      });
    });
  }
  nodes.sort((a, b) => a.originalIndex - b.originalIndex);

  return { mode: 'scaled', bands, nodes, plotW, tMin, tMax };
}

// ── Components ─────────────────────────────────────────────────────────

function StageNode({ node, hover, onHover, onLeave }) {
  const ts = node.stage.typeStatus;
  const fill = TS_FILL[ts] || '#5A5550';
  const glyph = TS_GLYPH[ts] || '?';
  const dead = (node.stage.vitalStatus || '').toLowerCase() === 'dead';
  const isHover = hover === node;
  return (
    <g
      transform={`translate(${node.x}, ${ROW_H / 2})`}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(node)}
      onMouseLeave={onLeave}
    >
      {isHover && (
        <circle r={NODE_R + 5} fill="none" stroke="rgba(11,11,11,0.32)" strokeWidth={1} />
      )}
      <circle
        r={NODE_R}
        fill={fill}
        stroke={dead ? 'rgba(11,11,11,0.72)' : 'transparent'}
        strokeWidth={dead ? 1.5 : 0}
        strokeDasharray={dead ? '2 2' : undefined}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Geist Mono, ui-monospace, monospace"
        fontSize={11}
        fontWeight={600}
        fill="#FAFAF7"
      >{glyph}</text>
    </g>
  );
}

function LifecycleTimeline({ lc, tradition }) {
  const containerRef = __lcRef(null);
  const [width, setWidth] = __lcState(640);
  const [hover, setHover] = __lcState(null);

  __lcEff(() => {
    if (!containerRef.current) return;
    const update = () => setWidth(containerRef.current.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const plot = __lcMemo(() => buildPlot(lc, tradition, width), [lc, tradition, width]);

  if (plot.mode === 'fallback') {
    return <LifecycleFallback lc={lc} />;
  }

  const totalH = AXIS_H + ROW_H + 96;  // axis + node row + legend space

  // Pair-wise segments connecting consecutive stage nodes. Segment style
  // reflects the figure's vital status across the leading edge.
  const segments = [];
  for (let i = 1; i < plot.nodes.length; i++) {
    const a = plot.nodes[i - 1];
    const b = plot.nodes[i];
    const dead = (a.stage.vitalStatus || '').toLowerCase() === 'dead';
    segments.push({
      x1: a.x, x2: b.x, y: ROW_H / 2,
      dashed: dead,
    });
  }

  // Decide which stage labels to anchor below vs above to avoid collision.
  // Stages with x close to their neighbor alternate vertical anchor.
  const labelSide = plot.nodes.map((_, i) => i % 2 === 0 ? 'above' : 'below');

  // Build a legend strip containing only the type-statuses that actually
  // appear in this entry's lifecycle. Without it, the glyph alphabet
  // (∞ T D ✦ ½ ¼ S M ×) is opaque to a first-time reader.
  const legendStatuses = (() => {
    const seen = [];
    for (const s of lc) {
      if (s.typeStatus && !seen.includes(s.typeStatus)) seen.push(s.typeStatus);
    }
    return seen;
  })();

  return (
    <div ref={containerRef} className="lifecycle-timeline">
      <svg width={width} height={totalH} className="lifecycle-svg">
        {/* Era bands — alternating tints so eras read as discrete columns. */}
        {plot.bands.map((b, i) => (
          <g key={b.era}>
            <rect
              x={b.x0} y={AXIS_H}
              width={Math.max(0, b.x1 - b.x0)}
              height={ROW_H}
              fill={i % 2 ? 'rgba(0,0,0,0.025)' : 'rgba(0,0,0,0.012)'}
            />
            <line
              x1={b.x1} y1={AXIS_H}
              x2={b.x1} y2={AXIS_H + ROW_H}
              stroke="rgba(0,0,0,0.06)"
              strokeWidth={1}
            />
          </g>
        ))}
        {/* Era labels along the top */}
        {plot.bands.map(b => {
          const w = b.x1 - b.x0;
          if (w < 36) return null;
          return (
            <g key={'lbl-' + b.era}>
              <text
                x={(b.x0 + b.x1) / 2}
                y={AXIS_H / 2 + 4}
                textAnchor="middle"
                fontFamily="Geist Mono, ui-monospace, monospace"
                fontSize={9}
                letterSpacing={1.2}
                fill="rgba(0,0,0,0.55)"
                style={{ textTransform: 'uppercase' }}
              >{b.label}</text>
              <text
                x={(b.x0 + b.x1) / 2}
                y={AXIS_H + ROW_H + 14}
                textAnchor="middle"
                fontFamily="Geist Mono, ui-monospace, monospace"
                fontSize={9}
                fill="rgba(0,0,0,0.35)"
              >
                {window.formatYearSigned(b.start)} – {window.formatYearSigned(b.end)}
              </text>
            </g>
          );
        })}
        {/* Progression segments between consecutive stages */}
        {segments.map((s, i) => (
          <line
            key={i}
            x1={s.x1} y1={AXIS_H + s.y}
            x2={s.x2} y2={AXIS_H + s.y}
            stroke="rgba(11,11,11,0.45)"
            strokeWidth={1.4}
            strokeDasharray={s.dashed ? '3 3' : undefined}
          />
        ))}
        {/* Stage nodes */}
        <g transform={`translate(0, ${AXIS_H})`}>
          {plot.nodes.map((n, i) => (
            <StageNode
              key={i}
              node={n}
              hover={hover}
              onHover={setHover}
              onLeave={() => setHover(null)}
            />
          ))}
        </g>
        {/* Stage labels, alternating above/below the node row */}
        {plot.nodes.map((n, i) => {
          const side = labelSide[i];
          const ts = n.stage.typeStatus;
          const vital = n.stage.vitalStatus;
          const y = side === 'above'
            ? AXIS_H + ROW_H / 2 - NODE_R - 10
            : AXIS_H + ROW_H / 2 + NODE_R + 18;
          const dy2 = side === 'above' ? -12 : 12;
          return (
            <g key={'l-' + i} pointerEvents="none">
              <text
                x={n.x} y={y}
                textAnchor="middle"
                fontFamily="Newsreader, serif"
                fontSize={12}
                fontWeight={500}
                fill="#0B0B0B"
                style={{ paintOrder: 'stroke', stroke: 'rgba(250,250,247,0.92)', strokeWidth: 3 }}
              >{nameForTypeStatus(ts)}</text>
              {vital && vital !== 'alive' && (
                <text
                  x={n.x} y={y + dy2 * 0.6}
                  textAnchor="middle"
                  fontFamily="Geist Mono, ui-monospace, monospace"
                  fontSize={9}
                  letterSpacing={0.8}
                  fill="rgba(0,0,0,0.5)"
                  style={{ textTransform: 'uppercase' }}
                >{vital}</text>
              )}
            </g>
          );
        })}
      </svg>

      {legendStatuses.length > 0 && (
        <div className="lifecycle-legend">
          {legendStatuses.map(ts => (
            <span className="lifecycle-legend-item" key={ts}>
              <span
                className="lifecycle-legend-chip"
                style={{ background: TS_FILL[ts] || '#5A5550' }}
              >{TS_GLYPH[ts] || '?'}</span>
              <span className="lifecycle-legend-label">{nameForTypeStatus(ts)}</span>
            </span>
          ))}
          <span className="lifecycle-legend-note">dashed = deceased</span>
        </div>
      )}

      {hover && (
        <div className="lifecycle-card">
          <div className="lifecycle-card-eyebrow">
            <span className="lifecycle-card-chip" style={{ background: TS_FILL[hover.stage.typeStatus] || '#5A5550' }}>
              {TS_GLYPH[hover.stage.typeStatus] || '?'}
            </span>
            <span>{nameForTypeStatus(hover.stage.typeStatus)}</span>
            {hover.stage.vitalStatus && (
              <>
                <span className="lifecycle-card-dot" />
                <span>{hover.stage.vitalStatus}</span>
              </>
            )}
            <span className="lifecycle-card-dot" />
            <span>{hover.stage.era.replace(/-/g, ' ')}</span>
          </div>
          {hover.stage.notes && (
            <p className="lifecycle-card-notes">{hover.stage.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Fallback for traditions with no parseable era spans.
function LifecycleFallback({ lc }) {
  return (
    <div className="lifecycle-fallback">
      {lc.map((s, i) => (
        <div className="lifecycle-fallback-row" key={i}>
          <div
            className="lifecycle-fallback-node"
            style={{ background: TS_FILL[s.typeStatus] || '#5A5550' }}
          >
            <span>{TS_GLYPH[s.typeStatus] || '?'}</span>
          </div>
          <div className="lifecycle-fallback-body">
            <div className="lifecycle-fallback-title">
              <strong>{nameForTypeStatus(s.typeStatus)}</strong>
              <span className="lifecycle-fallback-meta">
                {s.era && <>{s.era.replace(/-/g, ' ')}</>}
                {s.vitalStatus && s.vitalStatus !== 'alive' && (
                  <span className="lifecycle-fallback-vital">· {s.vitalStatus}</span>
                )}
              </span>
            </div>
            {s.notes && <p>{s.notes}</p>}
          </div>
          {i < lc.length - 1 && <div className="lifecycle-fallback-rule" />}
        </div>
      ))}
    </div>
  );
}

function Lifecycle({ entry }) {
  const lc = entry.lifecycle || [];
  if (!lc.length) return null;
  return (
    <div className="section">
      <h2>Lifecycle <span className="count">{lc.length}</span></h2>
      <LifecycleTimeline lc={lc} tradition={entry.tradition} />
    </div>
  );
}

Object.assign(window, { Lifecycle });
