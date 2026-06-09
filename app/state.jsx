// ═══════════════════════════════════════════════════════════════════════════
//  state.jsx — data + filter + selection hooks
//  Reads from the legacy registry's localStorage so the seed is shared.
// ═══════════════════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const PEOPLE_KEY = 'pantheon_registry_v8';
const ATLAS_KEY  = 'pantheon_atlas_v2';

// Type-tier metadata. The five tiers form an ordinal scale of divinity:
// deity (1) → demigod (½) → quartigod (¼) → scion (trace) → mortal (0).
// The fill geometry of each TierIcon below encodes this literally.
//
// Color palette: five distinct hues spread across the wheel so the tiers
// remain separable at small sizes. Avoids the brick accent (#B5371F) and
// origin-mark blue (#1F4E79) so the categorical channels never collide.
const TYPE_TIER = {
  deity:     { label: 'Deity',     order: 0, color: '#DDA017', desc: 'Fully divine — pantheonic god or independent supernatural power.' },  // gold
  demigod:   { label: 'Demigod',   order: 1, color: '#B45C2D', desc: 'Half divine, half mortal — typically a god\'s direct child.' },  // bronze
  quartigod: { label: 'Quartigod', order: 2, color: '#6E4C9E', desc: 'One-quarter divine — a demigod\'s child, more mortal than not.' },  // violet
  scion:     { label: 'Scion',     order: 3, color: '#3A8A55', desc: 'Distant divine descent — a noble line tracing to a god.' },  // forest green
  mortal:    { label: 'Mortal',    order: 4, color: '#555148', desc: 'Wholly human — heroes, kings, prophets, founders.' },  // graphite
};

// Tier keys in display order. Derived from TYPE_TIER.order so adding a new
// tier in one place propagates to every UI that iterates the list.
const TYPE_ORDER = Object.keys(TYPE_TIER).sort(
  (a, b) => TYPE_TIER[a].order - TYPE_TIER[b].order
);

// ── Tier icons ───────────────────────────────────────────────────────────
// Each icon is a custom SVG with fill geometry that matches the tier's
// fraction of divinity. Designed at 16×16 viewBox; scale via the `size`
// prop. Crisp at any size, unlike the unicode-fraction chips I replaced.

function TierIcon({ type, size = 14, title }) {
  const meta = TYPE_TIER[type];
  if (!meta) return null;
  const c = meta.color;
  const r = 6, sw = 1.5;
  const common = {
    width: size, height: size,
    viewBox: '0 0 16 16',
    style: { flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' },
    'aria-label': title || meta.label,
    role: 'img',
  };
  switch (type) {
    case 'deity':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r={r} fill={c} />
        </svg>
      );
    case 'demigod':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r={r} fill="none" stroke={c} strokeWidth={sw} />
          <path d="M8 2A6 6 0 0 1 8 14Z" fill={c} />
        </svg>
      );
    case 'quartigod':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r={r} fill="none" stroke={c} strokeWidth={sw} />
          <path d="M8 2A6 6 0 0 1 14 8L8 8Z" fill={c} />
        </svg>
      );
    case 'scion':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r={r} fill="none" stroke={c} strokeWidth={sw} />
          <circle cx="8" cy="8" r="1.8" fill={c} />
        </svg>
      );
    case 'mortal':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r={r} fill="none" stroke={c} strokeWidth={sw} />
        </svg>
      );
    default:
      return null;
  }
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('readJSON failed', key, e);
    return null;
  }
}

function loadPeople() {
  const v = readJSON(PEOPLE_KEY);
  if (!v) {
    // localStorage was empty or the seed write was refused (the corpus now
    // exceeds the ~5 MB localStorage cap): fall back to the in-memory seed
    // data.js exposes on window.__PR so the registry still displays.
    const mem = window.__PR && window.__PR.seedPeople;
    return mem ? Object.values(mem) : [];
  }
  if (Array.isArray(v)) return v;
  // The legacy registry stores a MAP keyed by entry id. It may also be
  // wrapped under .people / .entries depending on schema version.
  if (v.people && typeof v.people === 'object') {
    return Array.isArray(v.people) ? v.people : Object.values(v.people);
  }
  if (v.entries && Array.isArray(v.entries)) return v.entries;
  // Plain id-keyed map at the top level.
  return Object.values(v).filter(x => x && typeof x === 'object' && (x.id || x.name));
}

function loadAtlas() {
  const v = readJSON(ATLAS_KEY);
  if (v && typeof v === 'object') return v;
  return (window.__PR && window.__PR.seedAtlas) || {};
}

// ── Era helpers ──────────────────────────────────────────────────────────

function eraStart(tradition, era) {
  const d = window.__PR?.ERA_DATES?.[tradition]?.[era];
  if (!d) return null;
  return d.textualStart ?? d.mythicStart ?? null;
}

// Era keys are hyphen-cased slugs: `mu-allaqat-poetic`, `late-bronze-age`,
// `pre-imperial-zhou`. Display them as Title Case with hyphens → spaces,
// and don't UPPERCASE them downstream — these are 2-4 word phrases that
// don't read as labels in caps. Preserve all-caps tokens (e.g. CE/BCE,
// roman numerals) by lookup.
const ERA_PRESERVE = new Set(['ce', 'bce', 'ad', 'bc', 'ii', 'iii', 'iv', 'vi', 'vii', 'viii', 'ix', 'xi', 'xii']);
const ERA_LOWER = new Set(['and', 'of', 'the', 'to', 'in', 'on', 'at', 'by', 'a', 'an']);
function formatEra(era) {
  if (!era) return '';
  return era.split(/[-\s]+/).filter(Boolean).map((w, i) => {
    const lw = w.toLowerCase();
    if (ERA_PRESERVE.has(lw)) return lw.toUpperCase();
    if (i > 0 && ERA_LOWER.has(lw)) return lw;
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join(' ');
}

function getEntryDates(entry) {
  try { return window.__PR?.getEntryDates?.(entry) || {}; }
  catch (_) { return {}; }
}

function entryAnchorYear(entry) {
  const d = getEntryDates(entry);
  if (d.textualStart != null) return d.textualStart;
  if (d.mythicStart != null)  return d.mythicStart;
  const t = entry?.temporal?.era;
  return eraStart(entry?.tradition, t);
}

// ── Warm-start hydration ─────────────────────────────────────────────────
// Since app/data.js now seeds window.__PR synchronously at module load,
// the new UI always has the canonical constants available before state.jsx
// even reads them. hydrateConstants() remains as a no-op fast-path check
// (returns true if __PR is already there, which it always is) — kept so
// main.jsx's branch shape doesn't have to change.

function hydrateConstants() {
  return !!(window.__PR && window.__PR.ERA_DATES);
}

function hasSeededPeople() {
  // The in-memory seed (window.__PR.seedPeople) counts: when the corpus is too
  // large for localStorage, the persist is skipped but the app still has data.
  const memSeeded = () => {
    const mem = window.__PR && window.__PR.seedPeople;
    return !!(mem && Object.keys(mem).length > 0);
  };
  try {
    const raw = localStorage.getItem('pantheon_registry_v8');
    if (!raw) return memSeeded();
    const data = JSON.parse(raw);
    if (!data) return memSeeded();
    if (Array.isArray(data)) return data.length > 0;
    if (Array.isArray(data.people))  return data.people.length > 0;
    if (Array.isArray(data.entries)) return data.entries.length > 0;
    if (typeof data === 'object')    return Object.keys(data).length > 0;
    return memSeeded();
  } catch (e) { return memSeeded(); }
}

// ── Tradition pigments ───────────────────────────────────────────────────

const FALLBACK_PIGMENTS = [
  '#5a7a52', '#7a4a5a', '#a08a5a', '#4a7a6a', '#7a5a3a',
  '#5a4a7a', '#8a6a3a', '#3a6a5a', '#7a3a4a', '#5a6a3a',
];

function colorForTradition(tradition) {
  const pal = window.__PR?.TRADITION_PIGMENTS || {};
  if (pal[tradition]) return pal[tradition];
  let h = 0;
  for (let i = 0; i < (tradition || '').length; i++) {
    h = ((h << 5) - h + tradition.charCodeAt(i)) | 0;
  }
  return FALLBACK_PIGMENTS[Math.abs(h) % FALLBACK_PIGMENTS.length];
}

// ── Period text parser ───────────────────────────────────────────────────
// Atlas polygons carry a free-text `period` field ("Treaty of Fort Laramie
// (1851)", "Late Woodland (650-1200 CE)", "~17th-18th c. CE", etc.). This
// extracts a numeric year range so the atlas can scope rendering to a
// specific year. Returns { start, end } in signed years (BCE negative,
// CE positive) — or null if nothing parses. Pragmatic: covers ~85% of
// the actual period strings in the registry.

function parsePeriod(text, tradition) {
  if (!text || typeof text !== 'string') return null;
  const s = text.toLowerCase();
  let m;

  // "1500-1100 BCE", "650-1200 CE", "1100-1184 BCE"
  m = s.match(/(?:^|[^a-z\d])(\d{1,4})\s*[-–—]\s*(\d{1,4})\s*(bce|ce|bc|ad)\b/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const isBCE = m[3].startsWith('b');
    if (isBCE) return { start: -Math.max(a, b), end: -Math.min(a, b) };
    return { start: Math.min(a, b), end: Math.max(a, b) };
  }

  // Century range: "16th-17th c. BCE" / "17th-18th c. CE"
  m = s.match(/(\d{1,2})(?:st|nd|rd|th)[\s\-–]*(\d{1,2})(?:st|nd|rd|th)\s*[-–]?\s*c(?:\.|entur(?:y|ies))?\s*(bce|ce|bc|ad)/);
  if (m) {
    const c1 = parseInt(m[1], 10);
    const c2 = parseInt(m[2], 10);
    const isBCE = m[3].startsWith('b');
    if (isBCE) return { start: -c1 * 100, end: -(c2 - 1) * 100 };
    return { start: (c1 - 1) * 100, end: c2 * 100 };
  }

  // Single century: "5th c. BCE" / "17th c. CE"
  m = s.match(/(\d{1,2})(?:st|nd|rd|th)\s*[-–]?\s*c(?:\.|entur(?:y|ies))?\s*(bce|ce|bc|ad)/);
  if (m) {
    const c = parseInt(m[1], 10);
    const isBCE = m[2].startsWith('b');
    if (isBCE) return { start: -c * 100, end: -(c - 1) * 100 };
    return { start: (c - 1) * 100, end: c * 100 };
  }

  // Qualified century: "early 19th c.", "mid 19th c.", "late 19th c."
  m = s.match(/(early|mid|late|peak)\s*\-?\s*(\d{1,2})(?:st|nd|rd|th)\s*[-–]?\s*c(?:\.|entury)?\s*(bce|ce|bc|ad)?/);
  if (m) {
    const q = m[1];
    const c = parseInt(m[2], 10);
    const isBCE = (m[3] || '').startsWith('b');
    const base = isBCE ? -(c) * 100 : (c - 1) * 100;
    const top  = isBCE ? -(c - 1) * 100 : c * 100;
    if (q === 'early') return { start: base,      end: base + 33 };
    if (q === 'mid')   return { start: base + 33, end: base + 66 };
    if (q === 'late' || q === 'peak') return { start: base + 66, end: top };
  }

  // Plain BCE/CE single year: "1184 BCE", "c. 800 CE", "~1500 BCE", "1851 CE"
  m = s.match(/(?:^|[^a-z\d])(?:[~c]\.?\s*)?(\d{1,4})\s*(bce|ce|bc|ad)\b/);
  if (m) {
    const y = parseInt(m[1], 10);
    return m[2].startsWith('b') ? { start: -y, end: -y + 1 } : { start: y, end: y + 1 };
  }

  // Naked 4-digit year, assume CE (covers "(1851)", "1701", "1888-1900")
  m = s.match(/\b(\d{4})\b\s*[-–]?\s*(\d{2,4})?\b/);
  if (m) {
    const y = parseInt(m[1], 10);
    if (y >= 1 && y <= 2100) {
      let end = y + 1;
      if (m[2]) {
        let y2 = parseInt(m[2], 10);
        if (y2 < 100) y2 = Math.floor(y / 100) * 100 + y2;
        if (y2 >= y && y2 <= 2100) end = y2;
      }
      return { start: y, end };
    }
  }

  // Fallback: scan the period text for era keys in ERA_DATES for this
  // tradition. Era keys are hyphen-cased (e.g. 'mycenaean-bronze-age'); the
  // period text uses spaces. Matching either form picks up phrases like
  // "Mycenaean Bronze Age framing the heroic age" that the numeric parsers
  // miss entirely.
  if (tradition) {
    const eraDates = window.__PR?.ERA_DATES?.[tradition];
    if (eraDates) {
      const keys = Object.keys(eraDates)
        // longest first — 'mycenaean-bronze-age' should win over 'bronze-age'
        .sort((a, b) => b.length - a.length);
      for (const key of keys) {
        const phrase = key.replace(/-/g, ' ');
        if (s.includes(phrase) || s.includes(key)) {
          const d = eraDates[key];
          const start = d.textualStart ?? d.mythicStart;
          const end   = d.textualEnd   ?? d.mythicEnd ?? (start != null ? start + 1 : null);
          if (start != null) return { start, end };
        }
      }
    }
  }

  return null;
}

// Format a signed year for display.
function formatYearSigned(y) {
  if (y == null) return '—';
  if (y < 0) return `${-y} BCE`;
  if (y === 0) return '0';
  return `${y} CE`;
}

// Format a year range. Returns null if both bounds are absent. If both bounds
// are present and equal (or start present and end absent), returns a single
// formatted year — collapses to a point rather than rendering "X – X". Used
// by Browse and Detail's date display.
function formatYearRangeSigned(start, end) {
  if (start == null && end == null) return null;
  if (start != null && end != null && start !== end) {
    return `${formatYearSigned(start)} – ${formatYearSigned(end)}`;
  }
  if (start != null) return formatYearSigned(start);
  if (end != null)   return formatYearSigned(end);
  return null;
}

// ── Display helpers ──────────────────────────────────────────────────────

function displayName(entry) {
  if (!entry) return '';
  if (typeof entry.name === 'string') return entry.name;
  return entry.name?.primary || entry.name?.canonical || entry.id || '';
}

function altNames(entry) {
  const n = entry?.name;
  if (!n || typeof n === 'string') return [];
  return Array.isArray(n.alt) ? n.alt.filter(Boolean) : [];
}

function transliterations(entry) {
  const t = entry?.name?.transliterations;
  if (!t || typeof t !== 'object') return [];
  return Object.entries(t).map(([script, value]) => ({ script, value }));
}

// ── Relation families ────────────────────────────────────────────────────
// Groups the 60+ relation kinds into legible families. Shared between
// the detail panel (which groups relations by family) and the graph view
// (which colors and filters edges by family).

const RELATION_FAMILIES = [
  {
    name: 'Lineage',
    kinds: ['parent', 'parent of', 'father of', 'mother of', 'maternal grandfather', 'maternal family',
            'ancestor of', 'descendant of', 'descendant mantis', 'uncle of',
            'foster parent', 'foster child', 'foster mother of', 'foster sibling',
            'social father', 'social grandfather', 'stepfather',
            'sibling', 'half sibling', 'half-sibling', 'twin sibling', 'sister',
            'half sibling by context', 'sibling and spouse', 'sibling claimed',
            'sibling or cross tradition counterpart',
            'parent life 1', 'parent life 2', 'sibling life 1', 'sibling life 2'],
  },
  {
    name: 'Bonds',
    kinds: ['lover', 'spouse', 'former spouse', 'former-spouse', 'beloved',
            'rejected suitor life 1',
            'companion', 'sworn companion', 'traveling companion', 'inseparable companion',
            'guest friend', 'host'],
  },
  {
    name: 'Teaching',
    kinds: ['mentor', 'student', 'tutor', 'protégé', 'teacher of', 'subordinate to'],
  },
  {
    name: 'Conflict',
    kinds: ['enemy', 'rival', 'antagonist', 'nemesis',
            'rival and beloved of', 'rival and foundation partner',
            'killer of', 'killed by', 'killed mothers killers',
            'defeated and caused death of', 'attempted rape of',
            'tricked by', 'sibling and confronter'],
  },
  {
    name: 'Alliance',
    kinds: ['ally'],
  },
  {
    name: 'Cross-tradition',
    kinds: ['interpretatio', 'syncretism', 'equated with',
            'foundational precursor to', 'post death continuation',
            'sex exchange with', 'primary', 'secondary'],
  },
];

function relationFamily(kind) {
  const k = (kind || '').toLowerCase().trim();
  for (const fam of RELATION_FAMILIES) {
    if (fam.kinds.some(x => x.toLowerCase() === k)) return fam.name;
  }
  return 'Other';
}

// ── Hook: useData ────────────────────────────────────────────────────────
//
// data.js seeds localStorage synchronously at module load — by the time this
// hook first runs, both PEOPLE_KEY and ATLAS_KEY are populated. So we load
// once via the state initializer (synchronous, before first paint) and call
// it done. The earlier architecture had this hook polling localStorage every
// 100ms up to 200 times because the legacy registry seeded asynchronously
// from inside its own useEffect; that's gone now and the polling along with
// it. ready is just `people.length > 0` since there's nothing left to await.

function useData() {
  const [people] = useState(loadPeople);
  const [atlas]  = useState(loadAtlas);
  const ready = people.length > 0;

  // Index by id for relation lookups, and a reverse parentage index so the
  // lineage view can walk descendants in O(1).
  const byId = useMemo(() => {
    const m = new Map();
    people.forEach(p => m.set(p.id, p));
    return m;
  }, [people]);

  const childrenOf = useMemo(() => {
    const m = new Map();
    for (const p of people) {
      for (const pid of (p.parentIds || [])) {
        if (!m.has(pid)) m.set(pid, []);
        m.get(pid).push(p.id);
      }
    }
    return m;
  }, [people]);

  return { people, atlas, byId, childrenOf, ready };
}

// ── Hook: useFilters ─────────────────────────────────────────────────────

const SORTS = {
  alpha:     { label: 'Alphabetical', short: 'A→Z',       cmp: (a, b) => displayName(a).localeCompare(displayName(b)) },
  tradition: { label: 'Tradition',    short: 'Tradition', cmp: (a, b) => (a.tradition || '').localeCompare(b.tradition || '') || displayName(a).localeCompare(displayName(b)) },
  era:       { label: 'Era (oldest)', short: 'Era',       cmp: (a, b) => {
    const ya = entryAnchorYear(a); const yb = entryAnchorYear(b);
    if (ya == null && yb == null) return displayName(a).localeCompare(displayName(b));
    if (ya == null) return 1;
    if (yb == null) return -1;
    return ya - yb;
  }},
  type:      { label: 'Type',         short: 'Type',      cmp: (a, b) => (TYPE_TIER[a.type]?.order ?? 99) - (TYPE_TIER[b.type]?.order ?? 99) || displayName(a).localeCompare(displayName(b)) },
};

function useFilters(people) {
  const [query, setQuery]         = useState('');
  const [types, setTypes]         = useState(new Set()); // empty = all
  const [origin, setOrigin]       = useState('both');    // both | canon | original
  const [traditions, setTraditions] = useState(new Set()); // empty = all
  const [sort, setSort]           = useState('alpha');

  const traditionList = useMemo(() => {
    const counts = new Map();
    people.forEach(p => {
      const t = p.tradition || 'Unsorted';
      counts.set(t, (counts.get(t) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [people]);

  const typeCounts = useMemo(() => {
    const m = Object.fromEntries(TYPE_ORDER.map(t => [t, 0]));
    people.forEach(p => { if (m[p.type] != null) m[p.type]++; });
    return m;
  }, [people]);

  // Pre-flattened search haystack per entry. Built once per `people` change
  // and reused across every keystroke. Without this, each character typed
  // rebuilt 601 × (displayName + altNames + transliterations + lowercase)
  // calls — ~10-15 ms per keystroke. With it, search is one Map.get and
  // one String.includes per entry.
  const searchHaystacks = useMemo(() => {
    const m = new Map();
    for (const p of people) {
      const name = displayName(p).toLowerCase();
      const alts = altNames(p).join(' ').toLowerCase();
      const trad = (p.tradition || '').toLowerCase();
      // Transliterations let a Sanskrit-literate user typing "Shiva" find
      // an entry whose canonical name is in Devanagari, and similarly for
      // Greek (Ζεύς → "Zeus"), Egyptian, Chinese, etc.
      const xlits = transliterations(p)
        .map(t => (t.value || '') + ' ' + (t.script || ''))
        .join(' ')
        .toLowerCase();
      m.set(p.id, name + ' ' + alts + ' ' + trad + ' ' + xlits);
    }
    return m;
  }, [people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = people.filter(p => {
      if (types.size && !types.has(p.type)) return false;
      if (origin === 'canon'    && p.origin !== 'canon') return false;
      if (origin === 'original' && p.origin === 'canon') return false;
      if (traditions.size && !traditions.has(p.tradition)) return false;
      if (q) {
        const hay = searchHaystacks.get(p.id);
        if (!hay || !hay.includes(q)) return false;
      }
      return true;
    });
    out.sort(SORTS[sort].cmp);
    return out;
  }, [people, query, types, origin, traditions, sort, searchHaystacks]);

  const toggleType = useCallback((t) => {
    setTypes(prev => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }, []);

  const toggleTradition = useCallback((t) => {
    setTraditions(prev => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }, []);

  const reset = useCallback(() => {
    setQuery(''); setTypes(new Set()); setOrigin('both');
    setTraditions(new Set()); setSort('alpha');
  }, []);

  return {
    query, setQuery,
    types, toggleType, setTypes,
    origin, setOrigin,
    traditions, toggleTradition, setTraditions,
    sort, setSort,
    filtered, traditionList, typeCounts,
    reset,
  };
}

// ── Hook: useSelection ───────────────────────────────────────────────────
// Selected = the open detail entry. Cursor = the table-row keyboard focus.

function useSelection(filtered) {
  const [selectedId, setSelectedId] = useState(null);
  const [cursorIdx, setCursorIdx] = useState(0);

  // Keep cursor in bounds when filter changes
  useEffect(() => {
    if (cursorIdx >= filtered.length) setCursorIdx(Math.max(0, filtered.length - 1));
  }, [filtered.length, cursorIdx]);

  const moveCursor = useCallback((delta) => {
    setCursorIdx(i => Math.max(0, Math.min(filtered.length - 1, i + delta)));
  }, [filtered.length]);

  const open = useCallback((idOrIdx) => {
    if (typeof idOrIdx === 'number') {
      const e = filtered[idOrIdx];
      if (e) setSelectedId(e.id);
    } else {
      setSelectedId(idOrIdx);
    }
  }, [filtered]);

  return { selectedId, setSelectedId, cursorIdx, setCursorIdx, moveCursor, open };
}

// ── Derived-layer accessors ────────────────────────────────────────────────
// data.js pre-computes the divinity descent + tradition mix onto window.__PR
// (in memory). These thin, null-safe readers expose them to the detail panel.
function divinityInfo(entry) {
  try { return (entry && window.__PR?.divinity?.[entry.id]) || null; } catch (_) { return null; }
}
function traditionMix(entry) {
  try { return (entry && window.__PR?.traditionMix?.[entry.id]) || null; } catch (_) { return null; }
}
function fmtFraction(f) {
  try { return window.__PR?.formatFraction ? window.__PR.formatFraction(f) : (f == null ? '—' : String(f)); }
  catch (_) { return f == null ? '—' : String(f); }
}
function inheritedPowers(entry) {
  try { return (entry && window.__PR?.inheritedPowers?.[entry.id]) || []; } catch (_) { return []; }
}
// v3 multi-tradition name records (value + script + original glyphs + source),
// when an entry carries them. Empty for the v1/v2 single-name majority.
function nameRecords(entry) {
  return (entry && Array.isArray(entry.names)) ? entry.names : [];
}

// ── Item registry accessors ────────────────────────────────────────────────
// data.js builds the item registry (holders gathered from every figure's
// materialCulture[], merged with cited ITEM_LORE) onto window.__PR.items as an
// id→item map. These readers expose it to the Items view and let a figure's
// detail cross-link the objects it carries.
function allItems() {
  try {
    const map = window.__PR?.items || {};
    return Object.values(map).sort((a, b) =>
      (b.holderCount - a.holderCount) ||
      (b.custodyCount - a.custodyCount) ||
      String(a.displayName || a.id).localeCompare(String(b.displayName || b.id)));
  } catch (_) { return []; }
}
function itemById(id) {
  try { return (id && window.__PR?.items?.[id]) || null; } catch (_) { return null; }
}
// The item records a figure carries (its materialCulture, resolved to the shared
// item entities). Lets the detail panel link a figure's objects to the registry.
function itemsForEntry(entry) {
  try {
    const mc = entry?.materialCulture;
    if (!Array.isArray(mc) || !mc.length) return [];
    const reg = window.__PR?.items || {};
    return mc.map((m) => reg[m.id] || {
      id: m.id, classId: m.classId || null, kind: m.kind || null,
      displayName: m.id, names: [{ value: m.id }], holders: [], custody: [], sources: m.sources || [],
    });
  } catch (_) { return []; }
}

// Expose to other babel scripts
Object.assign(window, {
  TYPE_TIER, TYPE_ORDER, TierIcon,
  useData, useFilters, useSelection,
  displayName, altNames, transliterations,
  formatEra,
  getEntryDates,
  SORTS,
  RELATION_FAMILIES, relationFamily,
  colorForTradition,
  parsePeriod, formatYearSigned, formatYearRangeSigned,
  hydrateConstants, hasSeededPeople,
  divinityInfo, traditionMix, fmtFraction,
  inheritedPowers, nameRecords,
  allItems, itemById, itemsForEntry,
});
