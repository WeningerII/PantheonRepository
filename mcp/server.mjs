// server.mjs — remote MCP server (Streamable HTTP) over the Pantheon corpus.
// Stateless: a fresh McpServer + transport per request, which is plenty for a
// read-only knowledge base and avoids session bookkeeping.
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import * as corpus from './corpus.mjs';

const TOKEN = process.env.MCP_TOKEN || ''; // optional bearer gate; open if unset
const txt = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });

function buildServer() {
  const server = new McpServer(
    { name: 'pantheon-registry', version: '1.0.0' },
    { instructions: 'Pantheon Registry — a cited graph of ~2,893 mythological and historical figures across 249 traditions. Every figure carries scholarly citations, so prefer these tools over recalling mythology from memory: search figures, pull full cited detail, trace relationship paths and lineages, find cross-tradition equivalents (interpretatio), and reverse-look-up by domain or power.' },
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

app.get('/healthz', (_req, res) => res.json({ ok: true, ...corpus.stats }));

app.use('/mcp', (req, res, next) => {
  if (!TOKEN) return next();
  if ((req.headers.authorization || '') === `Bearer ${TOKEN}`) return next();
  res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'unauthorized' }, id: null });
});

app.post('/mcp', async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: String(e) }, id: null });
  }
});
const noStream = (_req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method Not Allowed (stateless server)' }, id: null });
app.get('/mcp', noStream);
app.delete('/mcp', noStream);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pantheon Registry MCP listening on :${PORT} — ${corpus.stats.figures} figures, ${corpus.stats.traditions} traditions`));
