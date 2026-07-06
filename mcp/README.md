# Pantheon Registry — MCP connector

A remote [Model Context Protocol](https://modelcontextprotocol.io) server over the
Pantheon Registry corpus (4,000+ cited figures across 360+ traditions). It loads
`app/data.js` exactly the way the test/build pipeline does (`window.__PR`), so the
connector and the app share one source of truth and every answer stays cited. The
counts the server advertises to a model are read live from the corpus, so they
never drift as it grows.

## Tools

| Tool | What it answers |
|------|-----------------|
| `search_figures` | fuzzy/faceted figure search |
| `get_figure` | full cited detail for one figure |
| `relate` | shortest relationship path between two figures |
| `trace_lineage` | ancestors / descendants to a depth |
| `cross_tradition_equivalents` | interpretatio (Zeus → Jupiter, Amun…) |
| `who_governs` / `who_wields` | reverse lookup by domain / power |
| `list_traditions` / `tradition_overview` | tradition index + summary |

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
