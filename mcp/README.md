# Pantheon Registry — MCP connector

A remote [Model Context Protocol](https://modelcontextprotocol.io) server over the
Pantheon Registry corpus (4,000+ cited figures across 360+ traditions). It loads
`app/data.js` exactly the way the test/build pipeline does (`window.__PR`), so the
connector and the app share one source of truth and every answer stays cited. The
counts the server advertises to a model are read live from the corpus, so they
never drift as it grows.

## Tools

Fourteen tools, designed for LLM use: batch gets, a one-call `dossier` view,
discoverable vocabularies, closest-match suggestions on every miss, compact
paginated output, and canonical matching across relation-kind variants
(`killed-by` finds `killed by`, and points at `killer-of` as see-also).

| Tool | What it answers |
|------|-----------------|
| `search_figures` | names, epithets (original + translation), full-text notes; filters: tradition/type/era/domain/power/icon/place/item class/relation kind/year |
| `get_figure` | one or many ids; views `card` → `standard` → `dossier` (one-call context) → `full` (iconography, cult attestations, variants, per-claim citations) |
| `relate` | shortest path between two figures, every step typed; optional kind restriction |
| `neighbors` | a figure's direct connections grouped by relation kind, with kind counts |
| `trace_lineage` | ancestors/descendants with divinity tiers + the root's divinity math |
| `cross_tradition_equivalents` | interpretatio / equated-with / syncretism, one transitive hop |
| `query_relations` | corpus-wide edge slices by kind ("all killed-by edges among the Aztec") |
| `who_governs` / `who_wields` | domain + power registries; wields returns holders AND inheritors with provenance |
| `get_item` | 2,687-item registry: custody chains, holders, lore, native names |
| `vocab` | every controlled vocabulary with counts — relation kinds, spheres, powers, item classes, iconography, places, epithet tags, eras, traditions |
| `aggregate` | grouped counts (by tradition/type/era/domain/power/item class/relation kind/death manner) |
| `list_traditions` / `tradition_overview` | tradition index + profile (tiers, eras, top domains, territory) |

Transport: **Streamable HTTP** at `POST /mcp`. Health check at `GET /healthz`.

## Run locally

```bash
cd mcp
npm install
npm run smoke      # offline self-test of the query layer
PORT=3939 npm start
curl localhost:3939/healthz
```

## Deploy on Render

1. **New → Blueprint**, pick this repo (branch `main`). Render reads `render.yaml`
   and builds `mcp/Dockerfile`.
2. (Optional) set `MCP_TOKEN` in the dashboard to require
   `Authorization: Bearer <token>` on `/mcp`. Leave unset for an open read-only
   endpoint.
3. Deploy. The service URL is `https://<name>.onrender.com`; the MCP endpoint is
   `https://<name>.onrender.com/mcp`.

> The blueprint defaults to the **free** plan, which spins down when idle (first
> request after idle is slow). Switch the plan to **starter** to keep it warm.

### Keeping the corpus fresh

`app/data.js` is baked into the image at build time, so the connector only
reflects a corpus change after the image is **rebuilt**. The corpus grows, and
the free plan does not reliably rebuild on its own — so the live server can drift
behind `main` (stale figure/tradition counts). Two ways to stay current:

- **One-time fix for current drift:** Render dashboard → *pantheon-registry-mcp*
  → **Manual Deploy → Deploy latest commit**.
- **Automatic henceforth:** copy the service's **Deploy Hook** URL (Render →
  Settings → Deploy Hook) into a repo secret `RENDER_DEPLOY_HOOK_URL`. The
  `.github/workflows/deploy-mcp.yml` workflow then redeploys the connector on
  every push to `main` that touches `app/data.js` or `mcp/`. (Inert until the
  secret is set.)

The counts the server advertises (its `instructions` and `/healthz`) are read
live from the loaded corpus, so once the image is current, so are the numbers.

## Add as a Claude connector

In claude.ai → **Settings → Connectors → Add custom connector**, paste the
`/mcp` URL (and the bearer token, if you set one) — same flow you used for
`codex-musica-mcp`.

## Configuration

| Env var | Meaning |
|---------|---------|
| `PORT` | listen port (Render injects this) |
| `MCP_TOKEN` | if set, require `Authorization: Bearer <token>` on `/mcp` |
| `MCP_ALLOWED_ORIGINS` | if set (comma-separated), restrict browser CORS to these origins; unset = open to any origin (default). Server-to-server clients send no `Origin` and are unaffected. |
| `PANTHEON_DATA` | override path to `data.js` (defaults to `../app/data.js`) |

CORS is enabled so browser-based MCP clients (the [Inspector](https://github.com/modelcontextprotocol/inspector) web tool, web playgrounds, connectors that fetch from the page) can complete the session handshake — the server exposes the `Mcp-Session-Id` response header they need to read.
