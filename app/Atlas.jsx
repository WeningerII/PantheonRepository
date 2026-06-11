// ═══════════════════════════════════════════════════════════════════════════
//  Atlas.jsx — Natural Earth world map. Pigment-fill territories from the
//  legacy atlas dictionary, layered by kind (core / extent / colonies /
//  successors / diaspora). Hover to inspect, click to focus (the view glides
//  to the territory), Escape or ocean-click to clear.
//
//  Territory geometry goes through d3.geoPath as real GeoJSON polygons:
//  rings are Chaikin-smoothed (the authored hulls are 5-14 vertex sketches —
//  corner-cutting turns them into organic boundaries without inventing
//  territory beyond the cited hull), wound spherically (a backwards ring
//  would fill the complement of the region — the whole rest of the globe),
//  and resampled adaptively by d3 so edges curve correctly under the
//  projection and split cleanly at the antimeridian.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: __aState, useEffect: __aEff, useRef: __aRef, useMemo: __aMemo, useCallback: __aCb } = React;

// Visual treatment per layer kind. Defaults are deliberately low so 200+
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
    })
    .catch(e => {
      // Never cache a rejection: one transient network failure would brick
      // the atlas for the rest of the session (remounts reuse the promise).
      __basemapPromise = null;
      throw e;
    });
  return __basemapPromise;
}

// ── Territory geometry ───────────────────────────────────────────────────

// Chaikin corner-cutting in lon/lat space. Each pass replaces every vertex
// with two points at 1/4 and 3/4 of its edges, doubling the count and
// rounding the corners; two passes turn a 12-vertex sketch into a 48-point
// organic boundary. Interpolation is a convex combination, so smoothed
// points always stay inside the original hull's coordinate range (no new
// out-of-bounds or antimeridian-crossing points can appear).
function chaikinSmooth(ring, passes = 2) {
  // Drop the duplicated closing point; geoJSON rings get re-closed below.
  let pts = ring;
  if (pts.length > 1) {
    const [f, l] = [pts[0], pts[pts.length - 1]];
    if (f[0] === l[0] && f[1] === l[1]) pts = pts.slice(0, -1);
  }
  if (pts.length < 3) return ring;
  for (let p = 0; p < passes; p++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}

// Build a spherically valid GeoJSON Polygon from an authored ring. d3-geo
// interprets rings on the sphere: one wound the "wrong" way denotes the
// complement of the intended region and floods the rest of the world. Any
// authored hull is far smaller than a hemisphere, so if d3.geoArea reports
// more than 2π steradians, the ring needs reversing.
function ringToFeature(coords, smooth = true) {
  if (!coords || coords.length < 3 || !window.d3) return null;
  let ring = smooth ? chaikinSmooth(coords) : coords.slice();
  // Close the ring (geoJSON requires first === last).
  const [f, l] = [ring[0], ring[ring.length - 1]];
  if (f[0] !== l[0] || f[1] !== l[1]) ring = [...ring, f];
  let feature = { type: 'Polygon', coordinates: [ring] };
  if (window.d3.geoArea(feature) > 2 * Math.PI) {
    feature = { type: 'Polygon', coordinates: [ring.slice().reverse()] };
  }
  return feature;
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

function Atlas({ atlas, byId, focused, setFocused, traditionFilter, onOpenDetail }) {
  // `focused` is lifted to the Shell so the territory focus participates in
  // URL routing — #/atlas/<tradition> deep-links (and glides) to a territory.
  const [basemap, setBasemap] = __aState(null);
  const [basemapErr, setBasemapErr] = __aState(null);
  const [layers, setLayers] = __aState({
    core: true, extent: true, colonies: true, successors: true, diaspora: true,
  });
  const [hover, setHover] = __aState(null);        // { tradition, polygon } — x/y live in mouseRef
  // Tooltip position is applied imperatively: routing clientX/clientY through
  // state re-rendered the entire map (144 paths + label layout) per mousemove.
  const tooltipRef = __aRef(null);
  const mouseRef = __aRef({ x: 0, y: 0 });
  const positionTooltip = (x, y) => {
    mouseRef.current = { x, y };
    const el = tooltipRef.current;
    if (!el) return;
    const right = containerRef.current?.getBoundingClientRect().right || 9999;
    el.style.left = Math.min(x + 14, right - 340) + 'px';
    el.style.top  = (y + 14) + 'px';
  };
  const [yearScope, setYearScope] = __aState(false);
  const [year, setYear] = __aState(0);              // signed; -BCE / +CE
  const containerRef = __aRef(null);
  const svgRef = __aRef(null);
  const gRef = __aRef(null);
  const zoomRef = __aRef(null);
  const [size, setSize] = __aState({ w: 0, h: 0 });
  const [zoomK, setZoomK] = __aState(1);

  // Load basemap on mount (re-runs when the user hits Retry after a failure)
  const [basemapTry, setBasemapTry] = __aState(0);
  __aEff(() => {
    let alive = true;
    loadBasemap()
      .then(data => { if (alive) { setBasemap(data); setBasemapErr(null); } })
      .catch(e => { if (alive) setBasemapErr(e.message); });
    return () => { alive = false; };
  }, [basemapTry]);

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

  // Build projection. Natural Earth — the compromise projection used by
  // most modern reference atlases: gently curved meridians, low shape
  // distortion in the populated latitudes, and a bounded oval frame that
  // reads as a finished map rather than an unrolled cylinder. Fitted to the
  // container with a small margin.
  const projection = __aMemo(() => {
    if (!window.d3 || !size.w || !size.h) return null;
    return window.d3.geoNaturalEarth1()
      .fitExtent([[10, 10], [size.w - 10, size.h - 10]], { type: 'Sphere' });
  }, [size.w, size.h]);

  // Apply d3.zoom to the SVG; mutate the inner g's transform imperatively
  // so we don't re-render the world basemap on every wheel tick.
  __aEff(() => {
    if (!svgRef.current || !window.d3) return;
    const d3 = window.d3;
    const zoom = d3.zoom()
      // Explicit viewport extent: d3's default reads svg.width.baseVal at
      // gesture/transition time — we already know the size, and jsdom (the
      // test harness) doesn't implement SVGAnimatedLength at all.
      .extent([[0, 0], [size.w, size.h]])
      .scaleExtent([1, 12])
      .translateExtent([[-size.w * 0.5, -size.h * 0.5], [size.w * 1.5, size.h * 1.5]])
      .on('zoom', (e) => {
        if (gRef.current) gRef.current.setAttribute('transform', e.transform.toString());
        setZoomK(e.transform.k);
      });
    zoomRef.current = zoom;
    d3.select(svgRef.current).call(zoom);
    return () => { try { d3.select(svgRef.current).on('.zoom', null); } catch (_) {} };
  }, [size.w, size.h]);

  // Pre-compute the world basemap paths once basemap+projection are ready.
  // The sphere outline frames the projection; the graticule renders as one
  // properly curved path instead of straight chords.
  const basemapPaths = __aMemo(() => {
    if (!basemap || !projection || !window.d3) return null;
    const path = window.d3.geoPath(projection);
    return {
      sphere:    path({ type: 'Sphere' }),
      graticule: path(window.d3.geoGraticule10()),
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

  // Smooth + wind each authored ring into a spherical GeoJSON feature once
  // per atlas/filter change — independent of projection and zoom.
  const territoryFeatures = __aMemo(() => {
    if (!window.d3) return [];
    return visibleTraditions.map(trad => {
      const t = atlas[trad];
      if (!t?.polygons?.length) return null;
      const polys = t.polygons.map((poly, i) => ({
        i,
        kind: poly.kind || 'core',
        feature: ringToFeature(poly.coords),
        raw: poly,
        era: window.parsePeriod(poly.period, trad),
        area: polygonArea(poly.coords),
      })).filter(p => p.feature);
      if (!polys.length) return null;
      const maxArea = polys.reduce((m, p) => Math.max(m, p.area), 0);
      return { tradition: trad, polys, color: window.colorForTradition(trad), maxArea };
    }).filter(Boolean);
  }, [visibleTraditions, atlas]);

  // Project the features into path strings + anchors so we don't re-project
  // on every hover. d3.geoPath resamples edges adaptively under the curved
  // projection and splits rings at the antimeridian.
  const renderedTraditions = __aMemo(() => {
    if (!projection || !window.d3) return [];
    const path = window.d3.geoPath(projection);
    return territoryFeatures.map(({ tradition, polys, color, maxArea }) => ({
      tradition, color, maxArea,
      polys: polys.map(p => ({
        ...p,
        d: path(p.feature),
        centroid: path.centroid(p.feature),
        bounds: path.bounds(p.feature),
      })).filter(p => p.d),
    })).filter(t => t.polys.length);
  }, [territoryFeatures, projection]);

  const resetZoom = __aCb(() => {
    if (!svgRef.current || !window.d3 || !zoomRef.current) return;
    window.d3.select(svgRef.current).transition().duration(400)
      .call(zoomRef.current.transform, window.d3.zoomIdentity);
  }, []);

  // Focusing a tradition glides the viewport to its territory (fit the
  // combined projected bounds with a margin, capped so a city-state doesn't
  // slam to max zoom). Glides exactly ONCE per focus value: the effect
  // retries while the projection/size isn't ready yet (cold deep-link load),
  // then records the glide so later resizes or pans never re-yank the
  // camera. Clearing focus leaves the camera where the user put it.
  const glidedRef = __aRef(null);
  __aEff(() => {
    if (!focused) { glidedRef.current = null; return; }
    if (glidedRef.current === focused) return;
    if (!svgRef.current || !zoomRef.current || !window.d3 || !size.w || !size.h) return;
    const t = renderedTraditions.find(r => r.tradition === focused);
    if (!t) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of t.polys) {
      if (!p.bounds) continue;
      x0 = Math.min(x0, p.bounds[0][0]); y0 = Math.min(y0, p.bounds[0][1]);
      x1 = Math.max(x1, p.bounds[1][0]); y1 = Math.max(y1, p.bounds[1][1]);
    }
    if (!isFinite(x0) || x1 <= x0 || y1 <= y0) return;
    glidedRef.current = focused;
    const k = Math.max(1, Math.min(8, 0.75 / Math.max((x1 - x0) / size.w, (y1 - y0) / size.h)));
    const transform = window.d3.zoomIdentity
      .translate(size.w / 2 - k * (x0 + x1) / 2, size.h / 2 - k * (y0 + y1) / 2)
      .scale(k);
    window.d3.select(svgRef.current).transition().duration(650)
      .call(zoomRef.current.transform, transform);
  }, [focused, renderedTraditions, size.w, size.h]);

  // Escape clears the territory focus — but only when no overlay is open;
  // the Shell's Escape cascade owns the key while a palette/panel is up.
  __aEff(() => {
    if (!focused) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('.cmdk, .detail')) return;
      setFocused(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);

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
          {/* Type-ahead jump: an exact tradition name glides the camera to
              its territory. Native datalist — keyboardable for free. */}
          <input
            className="atlas-find"
            list="atlas-find-traditions"
            placeholder="Find territory…"
            aria-label="Find a tradition's territory"
            onChange={(e) => {
              const name = e.target.value;
              if (atlas[name]) {
                setFocused(name);
                e.target.value = '';
                e.target.blur();
              }
            }}
          />
          <datalist id="atlas-find-traditions">
            {visibleTraditions.map(t => <option key={t} value={t} />)}
          </datalist>
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
            <button
              className="btn btn-sm"
              onClick={() => { setBasemapErr(null); setBasemapTry(t => t + 1); }}
            >Retry</button>
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
              {/* Sphere frame: ocean wash inside the projection's oval,
                  curved 10° graticule, then land + country borders. */}
              {basemapPaths && (
                <>
                  <path
                    d={basemapPaths.sphere}
                    fill="#E4E9E4"
                    stroke="rgba(11,11,11,0.35)"
                    strokeWidth={0.8}
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={basemapPaths.graticule}
                    fill="none"
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth={0.4}
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={basemapPaths.land}
                    fill="#EDE6D3"
                    stroke="rgba(0,0,0,0.30)"
                    strokeWidth={0.55}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={basemapPaths.countries}
                    fill="none"
                    stroke="rgba(0,0,0,0.09)"
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
                        // Hovering ANY of a tradition's polygons lifts the
                        // whole tradition, so multi-polygon cultures read as
                        // one entity under the pointer.
                        const isHoverTrad = hover?.tradition === tradition;
                        const focusBoost = isFocus ? 1.6 : (isHoverTrad ? 1.3 : 1);
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
                              const strokeOp = (isFocus ? 1.0 : isHoverTrad ? 0.85 : 0.6) * (yearOp > 0.3 ? 1 : 0.3);
                              return (
                                <React.Fragment key={p.i}>
                                  {/* Focused territories get a light under-
                                      stroke so the boundary stays crisp over
                                      any fill it crosses. */}
                                  {isFocus && (
                                    <path
                                      d={p.d}
                                      fill="none"
                                      stroke="rgba(250,250,247,0.9)"
                                      strokeWidth={style.strokeWidth * 3.2}
                                      strokeLinejoin="round"
                                      vectorEffect="non-scaling-stroke"
                                      pointerEvents="none"
                                    />
                                  )}
                                  <path
                                    d={p.d}
                                    fill={color}
                                    fillOpacity={fillOp}
                                    stroke={color}
                                    strokeOpacity={strokeOp}
                                    strokeWidth={isFocus ? style.strokeWidth * 1.8 : style.strokeWidth}
                                    strokeDasharray={style.dash}
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={(e) => {
                                      positionTooltip(e.clientX, e.clientY);
                                      setHover({ tradition, polygon: p.raw });
                                    }}
                                    onMouseMove={(e) => positionTooltip(e.clientX, e.clientY)}
                                    onMouseLeave={() => setHover(null)}
                                    onClick={(e) => { e.stopPropagation(); setFocused(tradition); }}
                                  />
                                </React.Fragment>
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
                  if (!core?.centroid || !isFinite(core.centroid[0]) || !isFinite(core.centroid[1])) continue;
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

        {/* Hover tooltip — fixed-position overlay (not inside zoomed g).
            Position comes from mouseRef at mount and is updated imperatively
            by positionTooltip on every mousemove. */}
        {hover && (
          <div
            ref={tooltipRef}
            className="atlas-tooltip"
            style={{
              left: Math.min(mouseRef.current.x + 14, (containerRef.current?.getBoundingClientRect().right || 9999) - 340),
              top:  mouseRef.current.y + 14,
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
        <span>Click to focus — the map glides to it; Esc or ocean-click clears.</span>
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

Object.assign(window, {
  Atlas,
  // Internal geometry helpers, exposed for the test suite: a winding bug in
  // ringToFeature floods the whole globe with one territory's fill, and a
  // smoothing bug can push points outside the authored hull — both are
  // asserted directly in render.test.cjs.
  __atlasGeo: { chaikinSmooth, ringToFeature },
});
