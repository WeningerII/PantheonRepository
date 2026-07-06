// server.mjs — remote MCP server (Streamable HTTP) over the Pantheon corpus.
// Session-managed (the canonical MCP pattern): initialize opens a session,
// subsequent POSTs route by Mcp-Session-Id, GET opens the notification stream,
// DELETE tears the session down. This is what claude.ai's connector expects.
import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as corpus from './corpus.mjs';

const TOKEN = process.env.MCP_TOKEN || ''; // optional bearer gate; open if unset
const txt = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });

function buildServer() {
  // Advertised counts are read straight from the loaded corpus so the
  // instructions the model sees on connect can never drift from the data
  // (the corpus grows; a hard-coded "2,893 figures" went stale).
  const server = new McpServer(
    { name: 'pantheon-registry', version: '1.0.0' },
    { instructions: `Pantheon Registry — a cited graph of ${corpus.stats.figures.toLocaleString()} mythological and historical figures across ${corpus.stats.traditions} traditions. Every figure carries scholarly citations, so prefer these tools over recalling mythology from memory: search figures, pull full cited detail, trace relationship paths and lineages, find cross-tradition equivalents (interpretatio), and reverse-look-up by domain or power.` },
  );

  server.registerTool('search_figures',
    { description: 'Search figures by name (fuzzy/partial), optionally filtered by tradition, type (deity|numen|demigod|quartigod|scion|mortal) or era. Returns compact hits; follow up with get_figure.',
      inputSchema: { query: z.string(), tradition: z.string().optional(), type: z.string().optional(), era: z.string().optional(), limit: z.number().int().positive().max(100).optional() } },
    async (a) => txt(corpus.searchFigures(a.query, a)));

  server.registerTool('get_figure',
    { description: 'Full cited detail for one figure id: genealogy (parents/children), domains, powers (faculties), material culture, epithets, relations, notes and sources.',
      inputSchema: { id: z.string() } },
    async ({ id }) => txt(corpus.getFigure(id) || { error: `unknown id: ${id}` }));

  server.registerTool('relate',
    { description: 'Shortest relationship path between two figure ids across the genealogy + relations graph (e.g. how Heracles connects to Helen).',
      inputSchema: { a: z.string(), b: z.string() } },
    async ({ a, b }) => txt(corpus.relate(a, b)));

  server.registerTool('trace_lineage',
    { description: 'Ancestors and descendants of a figure up to a given depth (default 3).',
      inputSchema: { id: z.string(), depth: z.number().int().positive().max(8).optional() } },
    async ({ id, depth }) => txt(corpus.lineage(id, { depth })));

  server.registerTool('cross_tradition_equivalents',
    { description: 'Cross-tradition equivalents of a figure via interpretatio / equated-with edges (e.g. Zeus → Jupiter, Amun, Marduk).',
      inputSchema: { id: z.string() } },
    async ({ id }) => txt(corpus.equivalents(id)));

  server.registerTool('who_governs',
    { description: 'Figures across all traditions who govern a domain/sphere (substring match, e.g. "sea", "war", "death").',
      inputSchema: { sphere: z.string(), limit: z.number().int().positive().max(200).optional() } },
    async ({ sphere, limit }) => txt(corpus.whoGoverns(sphere, { limit })));

  server.registerTool('who_wields',
    { description: 'Figures who wield a given power/faculty (matched on faculty id or name).',
      inputSchema: { power: z.string(), limit: z.number().int().positive().max(200).optional() } },
    async ({ power, limit }) => txt(corpus.whoWields(power, { limit })));

  server.registerTool('list_traditions',
    { description: 'Every tradition in the corpus with its figure count.', inputSchema: {} },
    async () => txt(corpus.listTraditions()));

  server.registerTool('tradition_overview',
    { description: 'Overview of one tradition: counts by tier, era vocabulary, territory periods, and a sample of figures.',
      inputSchema: { name: z.string() } },
    async ({ name }) => txt(corpus.traditionOverview(name)));

  return server;
}

const app = express();
app.use(express.json({ limit: '2mb' }));

// CORS — required for browser-originated MCP clients (the MCP Inspector web
// tool, web playgrounds, and connectors that fetch from the page). The
// Streamable HTTP handshake hands the client its session in the
// `Mcp-Session-Id` RESPONSE header; a browser can't read that header unless
// the server explicitly EXPOSES it, so without this the whole session flow
// dies at the first follow-up call. Runs before the /mcp auth gate so the
// credential-less OPTIONS preflight is answered, not 401'd.
//
// Default is open (any origin) — the data is public and read-only. Set
// MCP_ALLOWED_ORIGINS to a comma-separated list to restrict browser access to
// named origins (e.g. "https://claude.ai,https://chatgpt.com"); server-to-
// server clients send no Origin and are unaffected either way.
const ALLOWED_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const originAllowed = (origin) => {
  if (!ALLOWED_ORIGINS.length) return origin || '*'; // open
  return origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
};
app.use((req, res, next) => {
  const allow = originAllowed(req.headers.origin);
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, MCP-Protocol-Version');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  // Preflight from a disallowed browser origin is refused; everything else
  // (including originless server-to-server calls) proceeds — a browser with a
  // disallowed origin simply won't receive the ACAO header and is blocked
  // client-side, exactly as intended.
  if (req.method === 'OPTIONS') { res.status(allow ? 204 : 403).end(); return; }
  next();
});

app.get('/healthz', (_req, res) => res.json({ ok: true, ...corpus.stats }));

app.use('/mcp', (req, res, next) => {
  if (!TOKEN) return next();
  if ((req.headers.authorization || '') === `Bearer ${TOKEN}`) return next();
  res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'unauthorized' }, id: null });
});

// active transports keyed by session id
const transports = {};

app.post('/mcp', async (req, res) => {
  const sid = req.headers['mcp-session-id'];
  let transport;
  if (sid && transports[sid]) {
    transport = transports[sid];
  } else if (!sid && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => { transports[id] = transport; },
    });
    transport.onclose = () => { if (transport.sessionId) delete transports[transport.sessionId]; };
    await buildServer().connect(transport);
  } else {
    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: no valid session id (send an initialize request first)' }, id: null });
    return;
  }
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: String(e) }, id: null });
  }
});

// GET = open the SSE notification stream; DELETE = end the session
const bySession = async (req, res) => {
  const sid = req.headers['mcp-session-id'];
  if (!sid || !transports[sid]) { res.status(400).send('Invalid or missing session id'); return; }
  await transports[sid].handleRequest(req, res);
};
app.get('/mcp', bySession);
app.delete('/mcp', bySession);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pantheon Registry MCP listening on :${PORT} — ${corpus.stats.figures} figures, ${corpus.stats.traditions} traditions`));
