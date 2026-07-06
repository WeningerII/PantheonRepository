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

// Compact serialization: results land verbatim in the calling model's context
// window, so no pretty-print indentation. A hard cap guards against a query
// that would flood the caller; the truncation note teaches the fix.
const MAX_CHARS = 40000;
const txt = (obj) => {
  let s = JSON.stringify(obj);
  if (s.length > MAX_CHARS) {
    s = s.slice(0, MAX_CHARS) + `…"} [truncated at ${MAX_CHARS} chars — use limit/offset, a narrower view, or a more specific filter]`;
  }
  return { content: [{ type: 'text', text: s }] };
};

function buildServer() {
  // Advertised counts are read straight from the loaded corpus so the
  // instructions the model sees on connect can never drift from the data.
  const server = new McpServer(
    { name: 'pantheon-registry', version: '2.0.0' },
    { instructions: `Pantheon Registry — a cited graph of ${corpus.stats.figures.toLocaleString()} mythological and historical figures across ${corpus.stats.traditions} traditions, plus ${corpus.stats.items.toLocaleString()} mythic items, ${corpus.stats.powers.toLocaleString()} powers, ${corpus.stats.domains.toLocaleString()} domains, and ${corpus.stats.relation_kinds} typed relation kinds. Every claim carries scholarly citations — prefer these tools over recalling mythology from memory.

Workflow that works: (1) unsure of exact vocabulary? call vocab (relation kinds, domain spheres, power ids, item classes, iconographic attributes, cult places, eras, epithet tags) — all lookups also return closest-match suggestions on a miss, so a wrong guess teaches the next call. (2) find figures with search_figures — it matches names, epithets (original AND translation), and full-text notes, and takes structured filters (tradition/type/era/domain/power/icon/place/item_class/relation_kind/alive_in_year). (3) get_figure with view:"dossier" answers most single-figure questions in ONE call (genealogy, divinity math, typed relations, items, equivalents, cult places, death). (4) relate/neighbors/lineage/query_relations for graph questions; who_governs/who_wields/get_item for the domain/power/item registries; aggregate for counts. All ids are stable — feed any id from one result into the next call.` },
  );

  server.registerTool('search_figures',
    { description: 'Find figures. Free-text q matches names, alt names, epithets (original script AND English translation), and full-text notes/attestations — each hit says WHAT matched. Structured filters combine with q or work alone: tradition, type (deity|numen|demigod|quartigod|scion|mortal), era, domain (sphere id or substring), power (faculty id or substring), icon (iconographic attribute, e.g. "thunderbolt"), place (cult/birth/death place), item_class (holders of that class), relation_kind [+ relation_to] ("enemy" of "greek_hesiod_zeus"), alive_in_year (negative = BCE). Paginated; a zero-hit result includes suggestions.',
      inputSchema: {
        q: z.string().optional(), tradition: z.string().optional(), type: z.string().optional(), era: z.string().optional(),
        domain: z.string().optional(), power: z.string().optional(), icon: z.string().optional(), place: z.string().optional(),
        item_class: z.string().optional(), relation_kind: z.string().optional(), relation_to: z.string().optional(),
        alive_in_year: z.number().int().optional(),
        limit: z.number().int().positive().max(100).optional(), offset: z.number().int().nonnegative().optional(),
      } },
    async (a) => txt(corpus.searchFigures(a.q || '', a)));

  server.registerTool('get_figure',
    { description: 'Retrieve figures by id — pass one id or up to 20 (batch beats repeated calls). view controls depth: "card" (one line), "standard" (genealogy, divinity math, domains with native terms, powers, items held, epithets with translations, typed relations, citations), "dossier" (standard + inherited powers, cross-tradition equivalents, lifecycle, cult places, death — the one-call answer for "tell me about X"), "full" (everything: iconography, cult records with attestations, multi-script names, variants/competing claims, associations, per-claim citations). Unknown ids return closest-match suggestions.',
      inputSchema: { id: z.union([z.string(), z.array(z.string()).max(20)]), view: z.enum(['card', 'standard', 'dossier', 'full']).optional() } },
    async ({ id, view }) => txt(corpus.getFigure(id, { view: view || 'standard' })));

  server.registerTool('relate',
    { description: 'Shortest relationship path between two figure ids across genealogy + all typed relations. Every step is labeled with its relation kind (parent of / spouse / enemy / interpretatio / …). Optional via: restrict traversal to specific relation kinds (genealogy edges always allowed).',
      inputSchema: { a: z.string(), b: z.string(), via: z.array(z.string()).optional(), maxHops: z.number().int().positive().max(12).optional() } },
    async ({ a, b, via, maxHops }) => txt(corpus.relate(a, b, { via, maxHops })));

  server.registerTool('neighbors',
    { description: 'Everyone directly connected to a figure, grouped by typed relation kind (parents, children, spouses, enemies, equated-with, …), plus a kind→count map of the whole neighbourhood. Optional kinds filter (e.g. ["enemy","killed-by"]). Use for "who are X\'s allies/enemies/consorts" without walking the graph by hand.',
      inputSchema: { id: z.string(), kinds: z.array(z.string()).optional(), limit: z.number().int().positive().max(200).optional() } },
    async ({ id, kinds, limit }) => txt(corpus.neighbors(id, { kinds, limit })));

  server.registerTool('trace_lineage',
    { description: 'Ancestors and descendants of a figure to a given depth (default 3, max 8), each annotated with divinity tier; the root includes its full divinity computation (fraction, basis, which ancestors contribute what share).',
      inputSchema: { id: z.string(), depth: z.number().int().positive().max(8).optional() } },
    async ({ id, depth }) => txt(corpus.lineage(id, { depth })));

  server.registerTool('cross_tradition_equivalents',
    { description: 'Cross-tradition equivalents of a figure via interpretatio / equated-with / syncretism edges, including one transitive hop (Zeus → Jupiter → …). The comparative-mythology tool: "who is the Norse counterpart of X".',
      inputSchema: { id: z.string() } },
    async ({ id }) => txt(corpus.equivalents(id)));

  server.registerTool('query_relations',
    { description: 'Slice the relation graph by kind: all "killed-by" edges, every "interpretatio" pair, all "mentor" relationships — optionally restricted to a tradition or era. Returns from/to pairs with names. Discover the available kinds with vocab("relation_kinds"). Use for corpus-wide questions like "which gods were killed" or "list divine twins".',
      inputSchema: { kind: z.string(), tradition: z.string().optional(), era: z.string().optional(), limit: z.number().int().positive().max(100).optional(), offset: z.number().int().nonnegative().optional() } },
    async (a) => txt(corpus.queryRelations(a.kind, a)));

  server.registerTool('who_governs',
    { description: 'Figures across all traditions who govern a domain/sphere (e.g. "sea", "war", "death", "smithing"), with their context tag and native-language term. Fuzzy: a partial sphere matches all containing spheres; misses return sphere suggestions.',
      inputSchema: { sphere: z.string(), limit: z.number().int().positive().max(200).optional() } },
    async ({ sphere, limit }) => txt(corpus.whoGoverns(sphere, { limit })));

  server.registerTool('who_wields',
    { description: 'Figures who hold a power/faculty — returned as attested HOLDERS (with scope tags + whether the power is inheritable) and INHERITORS (who descends from a holder, from whom, how many generations removed, full or partial). Fuzzy on the power id; misses return suggestions. Use for "who can shapeshift", "who inherited Zeus\'s storm powers".',
      inputSchema: { power: z.string(), limit: z.number().int().positive().max(200).optional() } },
    async ({ power, limit }) => txt(corpus.whoWields(power, { limit })));

  server.registerTool('get_item',
    { description: 'The mythic-item registry (2,687 items: weapons, regalia, relics…). Pass an exact item id for full detail — custody chain (who forged it, who wielded it, era by era, cited), holders, native names, lore, maker, resting place. Pass a name/text query (optionally with item_class) to search; a single hit auto-expands. Use for "who forged Mjölnir", "trace the thunderbolt\'s custody".',
      inputSchema: { query: z.string(), item_class: z.string().optional(), limit: z.number().int().positive().max(100).optional() } },
    async ({ query, item_class, limit }) => txt(corpus.getItem(query, { item_class, limit })));

  server.registerTool('vocab',
    { description: 'Enumerate the corpus\'s controlled vocabularies WITH usage counts — call this before guessing an id. kinds: relation_kinds (typed edges), domains (spheres), powers (faculty ids), item_classes, iconography (attributes like lion-skin, thunderbolt), places (cult/birth/death sites), epithet_tags (semantic tags), eras (per tradition), traditions. Optional prefix filters the list.',
      inputSchema: { kind: z.enum(['relation_kinds', 'domains', 'powers', 'item_classes', 'iconography', 'places', 'epithet_tags', 'eras', 'traditions']), prefix: z.string().optional(), limit: z.number().int().positive().max(500).optional() } },
    async ({ kind, prefix, limit }) => txt(corpus.vocab(kind, { prefix, limit })));

  server.registerTool('aggregate',
    { description: 'Count figures grouped by a dimension — tradition, type, era, domain, power, item_class, relation_kind, or death_manner — optionally filtered by tradition/type/era first. Answers "how many war deities per tradition", "commonest relation kinds among the Norse", "most-shared domains" without pulling records.',
      inputSchema: { group_by: z.enum(['tradition', 'type', 'era', 'domain', 'power', 'item_class', 'relation_kind', 'death_manner']), tradition: z.string().optional(), type: z.string().optional(), era: z.string().optional(), limit: z.number().int().positive().max(500).optional() } },
    async (a) => txt(corpus.aggregate(a.group_by, a)));

  server.registerTool('list_traditions',
    { description: 'Every tradition in the corpus with its figure count, largest first.', inputSchema: {} },
    async () => txt(corpus.listTraditions()));

  server.registerTool('tradition_overview',
    { description: 'One tradition in profile: figure counts by divinity tier, its era vocabulary (in order), most-populated domains, historical territory periods from the atlas, and a sample of figures with ids to drill into.',
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
app.listen(PORT, () => console.log(`Pantheon Registry MCP listening on :${PORT} — ${corpus.stats.figures} figures, ${corpus.stats.traditions} traditions, ${corpus.stats.items} items`));
