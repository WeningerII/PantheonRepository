// ═══════════════════════════════════════════════════════════════════════════
//  Atlas.jsx — plate-carrée world map. Pigment-fill territories from the
//  legacy atlas dictionary, layered by kind (core / extent / colonies /
//  successors / diaspora). Hover to inspect, click to focus.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: __aState, useEffect: __aEff, useRef: __aRef, useMemo: __aMemo, useCallback: __aCb } = React;

// Visual treatment per layer kind. Defaults are deliberately low so 50+
// overlapping traditions don't fight. Focused / hovered traditions get
// boosted via a multiplier downstream.
const LAYER_STYLES = {
  core:       { fillOpacity: 0.30, strokeWidth: 0.5, dash: null,    label: 'Core' },
  extent:     { fillOpacity: 0.11, strokeWidth: 0.4, dash: null,    label: 'Extent' },
  colonies:   { fillOpacity: 0.18, strokeWidth: 0.5, dash: '3 2',   label: 'Colonies' },
  successors: { fillOpacity: 0.18, strokeWidth: 0.5, dash: '5 2',   label: 'Successors' },
  diaspora:   { fillOpacity: 0.24, strokeWidth: 0.5, dash: '1 2',   label: 'Diaspora' },
};

const LAYER_ORDER = ['core', 'extent', 'colonies', 'successors', 'diaspora'];

// Cache world basemap across mounts. Loads countries (so we can render
// borders) AND derives the land outline (so we can clip tradition
// polygons to actual landmass via SVG clip-path).
let __basemapPromise = null;
function loadBasemap() {
  if (__basemapPromise) return __basemapPromise;
  __basemapPromise = fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json')
    .then(r => {
      if (!r.ok) throw new Error('basemap fetch failed: HTTP ' + r.status);
      return r.json();
    })
    .then(topo => {
      const tc = window.topojson;
      if (!tc) throw new Error('topojson-client UMD not loaded');
      return {
        countries: tc.feature(topo, topo.objects.countries),
        land:      tc.merge(topo,  topo.objects.countries.geometries),
      };
    });
  return __basemapPromise;
}

function polyPath(projection, coords) {
  if (!coords || coords.length < 3) return null;
  const pts = [];
  for (const c of coords) {
    const p = projection([c[0], c[1]]);
    if (!p || !isFinite(p[0]) || !isFinite(p[1])) continue;
    pts.push(p);
  }
  if (pts.length < 3) return null;
  return 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z';
}

// Shoelace area in raw lon/lat units — used only for sort ordering so the
// bigger continental fills never bury smaller territories.
function polygonArea(coords) {
  if (!coords || coords.length < 3) return 0;
  let a = 0;
  for (let i = 0, n = coords.length; i < n; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % n];
    a += (x1 * y2 - x2 * y1);
  }
  return Math.abs(a) / 2;
}

// Centroid of a [lon,lat] ring, in projected coords.
function projectedCentroid(projection, coords) {
  let sx = 0, sy = 0, n = 0;
  for (const c of coords) {
    const p = projection([c[0], c[1]]);
    if (!p || !isFinite(p[0]) || !isFinite(p[1])) continue;
    sx += p[0]; sy += p[1]; n++;
  }
  if (!n) return null;
  return [sx / n, sy / n];
}

function Atlas({ atlas, byId, traditionFilter, onOpenDetail }) {
  const [basemap, setBasemap] = __aState(null);
  const [basemapErr, setBasemapErr] = __aState(null);
  const [layers, setLayers] = __aState({
    core: true, extent: true, colonies: true, successors: true, diaspora: true,
  });
  const [focused, setFocused] = __aState(null);   // tradition name
  const [hover, setHover] = __aState(null);        // { tradition, polygon, x, y }
  const [yearScope, setYearScope] = __aState(false);
  const [year, setYear] = __aState(0);              // signed; -BCE / +CE
  const containerRef = __aRef(null);
  const svgRef = __aRef(null);
  const gRef = __aRef(null);
  const [size, setSize] = __aState({ w: 0, h: 0 });
  const [zoomK, setZoomK] = __aState(1);

  // Load basemap on mount
  __aEff(() => {
    let alive = true;
    loadBasemap()
      .then(data => { if (alive) setBasemap(data); })
      .catch(e => { if (alive) setBasemapErr(e.message); });
    return () => { alive = false; };
  }, []);

  // Observe container size
  __aEff(() => {
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

  // Build projection. Plate-carrée scales the world to 360° wide; we fit
  // it to the container's width and let height clip if needed.
  const projection = __aMemo(() => {
    if (!window.d3 || !size.w || !size.h) return null;
    const k = size.w / (2 * Math.PI);
    return window.d3.geoEquirectangular()
      .scale(k)
      .translate([size.w / 2, size.h / 2]);
  }, [size.w, size.h]);

  // Apply d3.zoom to the SVG; mutate the inner g's transform imperatively
  // so we don't re-render the world basemap on every wheel tick.
  __aEff(() => {
    if (!svgRef.current || !window.d3) return;
    const d3 = window.d3;
    const zoom = d3.zoom()
      .scaleExtent([1, 12])
      .translateExtent([[-size.w * 0.5, -size.h * 0.5], [size.w * 1.5, size.h * 1.5]])
      .on('zoom', (e) => {
        if (gRef.current) gRef.current.setAttribute('transform', e.transform.toString());
        setZoomK(e.transform.k);
      });
    d3.select(svgRef.current).call(zoom);
    return () => { try { d3.select(svgRef.current).on('.zoom', null); } catch (_) {} };
  }, [size.w, size.h]);

  // Pre-compute the world basemap paths once basemap+projection are ready.
  const basemapPaths = __aMemo(() => {
    if (!basemap || !projection || !window.d3) return null;
    const path = window.d3.geoPath(projection);
    return {
      land:      path(basemap.land),
      countries: path(basemap.countries),
    };
  }, [basemap, projection]);

  // Visible traditions (rail filter, if set, narrows the set).
  const visibleTraditions = __aMemo(() => {
    const all = Object.keys(atlas || {});
    if (!traditionFilter || !traditionFilter.size) return all;
    return all.filter(t => traditionFilter.has(t));
  }, [atlas, traditionFilter]);

  // For each tradition, count figures of that tradition in the registry
  // — used to suppress traditions with zero entries from the footer count.
  const figureCount = __aMemo(() => {
    const m = new Map();
    if (!byId) return m;
    for (const e of byId.values()) {
      m.set(e.tradition, (m.get(e.tradition) || 0) + 1);
    }
    return m;
  }, [byId]);

  // Pre-compute the rendered tradition polygons (path strings) so we don't
  // re-project on every hover. Each poly carries a parsed era range when one
  // can be extracted from the free-text period, plus a raw area used for
  // z-ordering (small polygons drawn on top of large ones).
  const renderedTraditions = __aMemo(() => {
    if (!projection) return [];
    return visibleTraditions.map(trad => {
      const t = atlas[trad];
      if (!t?.polygons?.length) return null;
      const polys = t.polygons.map((poly, i) => ({
        i,
        kind: poly.kind || 'core',
        period: poly.period || '',
        source: poly.source || '',
        d: polyPath(projection, poly.coords),
        centroid: projectedCentroid(projection, poly.coords),
        raw: poly,
        era: window.parsePeriod(poly.period, trad),
        area: polygonArea(poly.coords),
      })).filter(p => p.d);
      const maxArea = polys.reduce((m, p) => Math.max(m, p.area), 0);
      return { tradition: trad, polys, color: window.colorForTradition(trad), maxArea };
    }).filter(Boolean);
  }, [visibleTraditions, atlas, projection]);

  const resetZoom = __aCb(() => {
    if (!svgRef.current || !window.d3) return;
    const d3 = window.d3;
    d3.select(svgRef.current).transition().duration(400).call(d3.zoom().transform, d3.zoomIdentity);
  }, []);

  const toggleLayer = __aCb((k) => setLayers(s => ({ ...s, [k]: !s[k] })), []);

  const renderedTotalCount = renderedTraditions.length;
  const renderedPolyCount = renderedTraditions.reduce(
    (n, t) => n + t.polys.filter(p => layers[p.kind]).length, 0,
  );
  const erasCovered = renderedTraditions.reduce(
    (n, t) => n + t.polys.filter(p => p.era).length, 0,
  );
  const erasTotal = renderedTraditions.reduce((n, t) => n + t.polys.length, 0);

  return (
    <div className="atlas-wrap">
      <div className="atlas-bar">
        <div className="atlas-bar-section">
          <span className="atlas-bar-label">Layers</span>
          <div className="atlas-layers">
            {LAYER_ORDER.map(k => (
              <button
                key={k}
                className={'atlas-layer-btn ' + (layers[k] ? 'on' : '')}
                onClick={() => toggleLayer(k)}
              >
                <span className={'atlas-layer-mark layer-' + k} />
                {LAYER_STYLES[k].label}
              </button>
            ))}
          </div>
        </div>
        <div className="atlas-bar-section atlas-stats">
          <span>{renderedTotalCount.toLocaleString()} traditions</span>
          <span>{renderedPolyCount.toLocaleString()} polygons</span>
        </div>
        <div className="atlas-bar-right">
          {focused && (
            <>
              <span className="graph-focused-label">
                Focused: <strong>{focused}</strong>
              </span>
              <button className="btn btn-sm btn-ghost" onClick={() => setFocused(null)}>clear</button>
            </>
          )}
          <button className="btn btn-sm" onClick={resetZoom} title="Reset zoom">Reset zoom</button>
        </div>
      </div>

      <div className="atlas-time">
        <button
          className={'btn btn-sm' + (yearScope ? ' btn-on' : '')}
          onClick={() => setYearScope(s => !s)}
          title="Scope polygons to a specific year"
        >
          {yearScope ? 'Year-scoped' : 'Scope by year'}
        </button>
        {yearScope ? (
          <>
            <input
              type="range"
              min={-3000} max={2025} step={1}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              aria-label="Year scrubber"
            />
            <div className="atlas-time-year">{window.formatYearSigned(year)}</div>
          </>
        ) : (
          <div className="atlas-time-hint">All time — every parsed era visible.</div>
        )}
        {/* Quick-jump anchors — clicking enables scope if it's off. */}
        <div className="atlas-time-anchors">
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
              className="atlas-time-anchor"
              onClick={() => { setYear(y); if (!yearScope) setYearScope(true); }}
              title={`Jump to ${window.formatYearSigned(y)}`}
            >{label}</button>
          ))}
        </div>
        {yearScope && (
          <div className="atlas-time-coverage">
            {erasCovered}/{erasTotal} with parsed dates
          </div>
        )}
      </div>

      <div ref={containerRef} className="atlas-canvas">
        {basemapErr && (
          <div className="atlas-empty">
            <div className="empty-mark" aria-hidden="true" />
            <h2>Could not load the world basemap.</h2>
            <p className="atlas-empty-detail">{basemapErr}</p>
            <p>The atlas needs network access to the world-atlas CDN. The legacy globe is still reachable above.</p>
          </div>
        )}
        {!basemapErr && (
          <svg
            ref={svgRef}
            width={size.w} height={size.h}
            onClick={(e) => { if (e.target === svgRef.current) setFocused(null); }}
          >
            {/* clipPath: every tradition polygon is clipped to actual land,
                so hand-drawn bounding shapes stop floating in oceans. */}
            <defs>
              {basemapPaths && (
                <clipPath id="atlas-land" clipPathUnits="userSpaceOnUse">
                  <path d={basemapPaths.land} />
                </clipPath>
              )}
            </defs>

            <g ref={gRef}>
              {/* Graticule — barely-there 30° reference grid. */}
              {projection && (() => {
                const lines = [];
                for (let lon = -180; lon <= 180; lon += 30) {
                  const a = projection([lon, -85]);
                  const b = projection([lon,  85]);
                  if (a && b) lines.push(
                    <line key={'lon' + lon} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                          stroke="rgba(0,0,0,0.045)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
                  );
                }
                for (let lat = -60; lat <= 60; lat += 30) {
                  const a = projection([-180, lat]);
                  const b = projection([ 180, lat]);
                  if (a && b) lines.push(
                    <line key={'lat' + lat} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                          stroke="rgba(0,0,0,0.045)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
                  );
                }
                return lines;
              })()}

              {/* World basemap: land fill, then country borders on top. */}
              {basemapPaths && (
                <>
                  <path
                    d={basemapPaths.land}
                    fill="#EDE6D3"
                    stroke="rgba(0,0,0,0.28)"
                    strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={basemapPaths.countries}
                    fill="none"
                    stroke="rgba(0,0,0,0.10)"
                    strokeWidth={0.4}
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}

              {/* Tradition territories — clipped to land. Within each layer
                  kind, traditions with smaller maxArea are drawn last so they
                  sit on top of continental sweeps. */}
              <g clipPath="url(#atlas-land)">
                {['extent', 'successors', 'colonies', 'diaspora', 'core'].map(layerKind => {
                  if (!layers[layerKind]) return null;
                  const ordered = renderedTraditions
                    .filter(t => t.polys.some(p => p.kind === layerKind))
                    .sort((a, b) => b.maxArea - a.maxArea);  // larger first
                  return (
                    <g key={layerKind}>
                      {ordered.map(({ tradition, polys, color }) => {
                        const dim = focused && focused !== tradition;
                        const layerPolys = polys.filter(p => p.kind === layerKind);
                        if (!layerPolys.length) return null;
                        const style = LAYER_STYLES[layerKind];
                        const isFocus = focused === tradition;
                        const focusBoost = isFocus ? 1.6 : 1;
                        return (
                          <g
                            key={tradition}
                            style={{
                              opacity: dim ? 0.18 : 1,
                              transition: 'opacity .15s',
                            }}
                          >
                            {layerPolys.map(p => {
                              // Year-scope: polygons whose parsed era contains
                              // the selected year stay full; out-of-range fade;
                              // unparseable periods land mid so they remain
                              // visible but obviously not era-confirmed.
                              let yearOp = 1;
                              if (yearScope) {
                                if (!p.era) yearOp = 0.18;
                                else if (year >= p.era.start && year <= p.era.end) yearOp = 1;
                                else yearOp = 0.04;
                              }
                              const fillOp   = style.fillOpacity * focusBoost * yearOp;
                              const strokeOp = (isFocus ? 1.0 : 0.6) * (yearOp > 0.3 ? 1 : 0.3);
                              return (
                                <path
                                  key={p.i}
                                  d={p.d}
                                  fill={color}
                                  fillOpacity={fillOp}
                                  stroke={color}
                                  strokeOpacity={strokeOp}
                                  strokeWidth={isFocus ? style.strokeWidth * 1.6 : style.strokeWidth}
                                  strokeDasharray={style.dash}
                                  strokeLinejoin="round"
                                  vectorEffect="non-scaling-stroke"
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={(e) => setHover({
                                    tradition, polygon: p.raw,
                                    x: e.clientX, y: e.clientY,
                                  })}
                                  onMouseMove={(e) => setHover(h => h && { ...h, x: e.clientX, y: e.clientY })}
                                  onMouseLeave={() => setHover(null)}
                                  onClick={(e) => { e.stopPropagation(); setFocused(tradition); }}
                                />
                              );
                            })}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>

              {/* Tradition labels (core centroid). Greedy collision-aware
                  placement: largest polygons get label priority, smaller
                  ones skip if their rect overlaps an already-placed label.
                  Focused + hovered traditions always show, bypassing the
                  collision check. World-space rects scale with 1/zoomK so
                  screen-space size stays constant — zooming in shrinks the
                  rects and reveals more labels naturally, no thresholds. */}
              {projection && (() => {
                const ordered = renderedTraditions.slice()
                  .sort((a, b) => b.maxArea - a.maxArea);
                const placed = [];
                const out = [];
                const scale = 1 / zoomK;
                for (const { tradition, polys } of ordered) {
                  const core = polys.find(p => p.kind === 'core') || polys[0];
                  if (!core?.centroid) continue;
                  const isFocus = focused === tradition;
                  const isHover = hover?.tradition === tradition;
                  const fontSize = (isFocus ? 14 : 11) * scale;
                  // Approximate label rect (serif average ~0.55em char width)
                  const w = tradition.length * fontSize * 0.55 + 6 * scale;
                  const h = fontSize * 1.2 + 4 * scale;
                  const [cx, cy] = core.centroid;
                  const rect = [cx - w / 2, cy - h / 2, w, h];

                  // Always show focused / hovered
                  if (isFocus || isHover) {
                    placed.push(rect);
                    out.push({ tradition, cx, cy, fontSize, isFocus, isHover });
                    continue;
                  }
                  // Greedy AABB collision check
                  const collides = placed.some(([px, py, pw, ph]) =>
                    rect[0] < px + pw && rect[0] + rect[2] > px &&
                    rect[1] < py + ph && rect[1] + rect[3] > py,
                  );
                  if (collides) continue;
                  placed.push(rect);
                  out.push({ tradition, cx, cy, fontSize, isFocus: false, isHover: false });
                }
                return out.map(({ tradition, cx, cy, fontSize, isFocus, isHover }) => (
                  <g key={'lbl-' + tradition}
                     transform={`translate(${cx},${cy})`}
                     pointerEvents="none">
                    <text
                      textAnchor="middle"
                      fontFamily="Newsreader, serif"
                      fontWeight={isFocus ? 600 : 500}
                      fontSize={fontSize}
                      fill="#0B0B0B"
                      style={{
                        paintOrder: 'stroke',
                        stroke: 'rgba(250,250,247,0.95)',
                        strokeWidth: 3.5 * scale,
                      }}
                    >
                      {tradition}
                    </text>
                  </g>
                ));
              })()}
            </g>
          </svg>
        )}

        {/* Hover tooltip — fixed-position overlay (not inside zoomed g). */}
        {hover && (
          <div
            className="atlas-tooltip"
            style={{
              left: Math.min(hover.x + 14, (containerRef.current?.getBoundingClientRect().right || 9999) - 340),
              top:  hover.y + 14,
            }}
          >
            <div className="atlas-tooltip-trad">
              <span
                style={{
                  display: 'inline-block', width: 8, height: 8, marginRight: 8,
                  background: window.colorForTradition(hover.tradition),
                  borderRadius: 1,
                }}
              />
              {hover.tradition}
              <span className="atlas-tooltip-kind">{hover.polygon.kind}</span>
              {figureCount.get(hover.tradition) > 0 && (
                <span className="atlas-tooltip-count">{figureCount.get(hover.tradition)} figures</span>
              )}
            </div>
            {hover.polygon.period && (
              <div className="atlas-tooltip-period">{hover.polygon.period}</div>
            )}
            {hover.polygon.source && (
              <div className="atlas-tooltip-source">{hover.polygon.source}</div>
            )}
          </div>
        )}
      </div>

      <div className="atlas-footer">
        <span>Hover a territory to inspect.</span>
        <span>Click to focus its tradition.</span>
        <span>Scroll to zoom · drag to pan.</span>
        {focused && figureCount.get(focused) > 0 && (
          <span className="atlas-foot-cta">
            <button className="btn btn-sm btn-accent" onClick={() => onOpenDetail && onOpenDetail(focused)}>
              {figureCount.get(focused)} {focused} figures →
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Atlas });
