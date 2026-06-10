// ═══════════════════════════════════════════════════════════════════════════
//  CommandPalette.jsx — ⌘K fuzzy figure jump
// ═══════════════════════════════════════════════════════════════════════════

const { useState: __cState, useEffect: __cEff, useMemo: __cMemo, useRef: __cRef, useCallback: __cCb } = React;

// Lightweight subsequence-aware fuzzy match.
// Returns null on no match, or { score, matches } where lower score = better.
function fuzzyScore(query, target) {
  if (!query) return { score: 0 };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t === q) return { score: -1000 };
  if (t.startsWith(q)) return { score: -500 + (t.length - q.length) };
  const idx = t.indexOf(q);
  if (idx >= 0) return { score: -100 + idx };
  // subsequence
  let ti = 0, qi = 0, gaps = 0, last = -1;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) {
      if (last >= 0 && ti - last > 1) gaps += (ti - last - 1);
      last = ti; qi++;
    }
    ti++;
  }
  if (qi < q.length) return null;
  return { score: gaps };
}

function CommandPalette({ people, onClose, onPick }) {
  const [q, setQ] = __cState('');
  const [cursor, setCursor] = __cState(0);
  const inputRef = __cRef(null);

  // Focus the input on open; hand focus back to the opener on close.
  __cEff(() => {
    const opener = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (opener && opener.focus && document.contains(opener)) {
        try { opener.focus({ preventScroll: true }); } catch (_) {}
      }
    };
  }, []);

  // Each result keeps its match provenance ({ p, viaAlt, viaTradition }) so
  // the list can show the alt name that actually matched, not just alts[0].
  const results = __cMemo(() => {
    const query = q.trim();
    if (!query) {
      // Default: first 25 alphabetical
      return people.slice()
        .sort((a, b) => window.displayName(a).localeCompare(window.displayName(b)))
        .slice(0, 25)
        .map(p => ({ p }));
    }
    const scored = [];
    for (const p of people) {
      const name = window.displayName(p);
      const alts = window.altNames(p);
      let best = fuzzyScore(query, name);
      for (const alt of alts) {
        const s = fuzzyScore(query, alt);
        if (s && (!best || s.score < best.score)) best = { ...s, viaAlt: alt };
      }
      const tradS = fuzzyScore(query, p.tradition || '');
      if (tradS && (!best || tradS.score + 200 < best.score)) best = { ...tradS, score: tradS.score + 200, viaTradition: true };
      if (best) scored.push({ p, ...best });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 50);
  }, [q, people]);

  __cEff(() => { setCursor(0); }, [q]);

  __cEff(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
        e.preventDefault();
        window.__kbNavTs = Date.now();
        setCursor(c => Math.max(0, Math.min(results.length - 1, c + 1)));
      } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
        e.preventDefault();
        window.__kbNavTs = Date.now();
        setCursor(c => Math.max(0, c - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const pick = results[cursor];
        if (pick) onPick(pick.p.id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [results, cursor, onPick, onClose]);

  __cEff(() => {
    const el = document.querySelector(`[data-cmdk-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  return (
    <div className="cmdk-back" onClick={onClose}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Find a figure" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          placeholder="Find a figure or tradition…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className="cmdk-results">
          {q.trim() === '' && (
            <div className="cmdk-section">
              <span>A → Z</span>
              <span className="cmdk-section-meta">first 25 alphabetical · {people.length.toLocaleString()} total</span>
            </div>
          )}
          {q.trim() !== '' && results.length > 0 && (
            <div className="cmdk-section">
              <span>Matches</span>
              <span className="cmdk-section-meta">{results.length} of {people.length.toLocaleString()}</span>
            </div>
          )}
          {results.map((r, i) => {
            const entry = r.p;
            const tier = window.TYPE_TIER[entry.type];
            const alts = window.altNames(entry);
            // Show the alt that actually matched the query, so picking
            // "Wotan" explains why Odin is in the list.
            const altShown = r.viaAlt || (alts.length > 0 ? alts[0] : null);
            return (
              <div
                key={entry.id}
                className={'cmdk-item' + (i === cursor ? ' active' : '')}
                data-cmdk-idx={i}
                onMouseEnter={() => {
                  if (Date.now() - (window.__kbNavTs || 0) < 250) return;
                  setCursor(i);
                }}
                onClick={() => onPick(entry.id)}
              >
                <div className="cmdk-item-name-line">
                  <window.TierIcon type={entry.type} size={12} />
                  <span className="name">{window.displayName(entry)}</span>
                  {altShown && <span className="alt">{altShown}</span>}
                </div>
                <div className="meta">
                  <span>{tier?.label || entry.type}</span>
                  <span>{entry.tradition}</span>
                </div>
              </div>
            );
          })}
          {results.length === 0 && (
            <div className="cmdk-empty">
              No figures match <em>"{q}"</em>.
            </div>
          )}
        </div>
        <div className="cmdk-footer">
          <span><span className="kbd">↑</span><span className="kbd">↓</span> move</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CommandPalette });
