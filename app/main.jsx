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
    // data.js has run; __PR is set and localStorage is seeded. Count entries
    // for the boot label so it's specific instead of a generic "ready".
    let figureCount = null;
    try {
      const raw = localStorage.getItem('pantheon_registry_v8');
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data === 'object' && !Array.isArray(data)) {
          figureCount = Object.keys(data).length;
        } else if (Array.isArray(data)) {
          figureCount = data.length;
        }
      }
    } catch (_) { /* ignore — generic label is fine */ }

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
