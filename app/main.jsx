// ═══════════════════════════════════════════════════════════════════════════
//  main.jsx — entry point. app/data.js has already seeded window.__PR and
//  localStorage synchronously by the time this runs, so there's nothing to
//  await — just mount the Shell.
// ═══════════════════════════════════════════════════════════════════════════

// Error boundary so one bad entry render doesn't unmount the whole shell.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('[ErrorBoundary]', err, info); }
  reset = () => this.setState({ err: null });
  render() {
    if (this.state.err) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-eyebrow">Render failed</div>
          <div className="error-boundary-title">
            Something rendered the wrong shape and the panel unmounted.
          </div>
          <pre className="error-boundary-trace">
            {String(this.state.err && this.state.err.stack || this.state.err)}
          </pre>
          <button onClick={this.reset} className="btn btn-sm">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Boot
(function boot() {
  const stepEl = () => document.getElementById('boot-step');
  const barEl  = () => document.getElementById('boot-bar');
  const errEl  = () => document.getElementById('boot-err');
  const setStep = (t, pct) => {
    const s = stepEl();   if (s) s.textContent = t;
    const b = barEl();    if (b && pct != null) b.style.width = pct + '%';
    const boot = document.getElementById('boot');
    if (boot) {
      if (pct === 100) boot.classList.add('complete');
      else if (pct != null && pct < 100) boot.classList.remove('complete');
    }
  };
  const fatal = (e) => {
    const el = errEl();
    if (el) { el.style.display = 'block'; el.textContent = String(e?.stack || e); }
    const s = stepEl();
    if (s) s.textContent = 'failed';
  };

  try {
    // data.js has run; __PR is set. Count entries for the boot label so it's
    // specific instead of a generic "ready". Prefer localStorage (it holds
    // user edits when a persist ever succeeded; same precedence as
    // state.jsx loadPeople), fall back to the in-memory seed — the corpus
    // exceeds the localStorage quota, so in real browsers only the
    // in-memory path exists.
    let corpus = null;
    try {
      const key = (window.__PR && window.__PR.PEOPLE_KEY) || 'pantheon_registry_v9';
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) corpus = data;
        else if (data && typeof data === 'object') corpus = Object.values(data);
      }
    } catch (_) { /* ignore — fall through to the seed */ }
    if (!corpus || !corpus.length) {
      const seed = window.__PR && window.__PR.seedPeople;
      if (seed) corpus = Object.values(seed);
    }
    const figureCount = corpus ? corpus.length : null;

    // Fill the boot splash subtitle from the live corpus — hardcoded counts
    // here have gone stale 3x over before.
    if (corpus) {
      const traditions = new Set(corpus.map((p) => p && p.tradition).filter(Boolean));
      const sub = document.querySelector('#boot .subtitle');
      if (sub) sub.textContent = `${figureCount.toLocaleString()} figures, ${traditions.size} traditions, one index.`;
    }

    setStep(figureCount ? `loaded ${figureCount} figures` : 'ready', 100);

    const mount = document.getElementById('app');
    if (!mount) throw new Error('#app mount point not found');
    ReactDOM.createRoot(mount).render(
      <ErrorBoundary><window.Shell /></ErrorBoundary>
    );
    document.getElementById('boot')?.classList.add('hidden');
    setTimeout(() => document.getElementById('boot')?.remove(), 500);
    window.__bootDone = true;
  } catch (e) {
    fatal(e);
  }
})();
