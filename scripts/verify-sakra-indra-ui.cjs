// Lane-authored browser coverage over data-driven relationship targets.
const assert=require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const SITE = path.join(ROOT, 'dist', 'site');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.COLDLOAD_PORT || 8883);

// Cold load may mount the first screenful plus whatever the ratchet/ramp
// legitimately adds. It must not approach the full corpus.
const COLD_ROW_MAX = 1000;
const COLD_ELEMENT_MAX = 25000;

function fail(msg) { console.error('FAIL: ' + msg); process.exitCode = 1; }

function findChromium() {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers',
                 path.join(process.env.HOME || '', '.cache', 'ms-playwright')].filter(Boolean);
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const direct = path.join(r, 'chromium');
    if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
    for (const d of fs.readdirSync(r)) {
      for (const rel of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = path.join(r, d, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;
}

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  console.error('FAIL: playwright-core is not installed. Run `npm install`.');
  process.exit(1);
}

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const base = p.startsWith('/data/') ? DIST : SITE;
  const f = path.join(base, p);
  if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end(); }
  rs.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});


(async()=>{
  const exe=findChromium(); if(!exe)throw new Error('Install Chromium before this gate.');
  await new Promise(r => srv.listen(PORT, r));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await pg.route('**/fonts.g**', r => r.fulfill({ status: 404, body: '' }));
  await pg.route('**/world-atlas**', r => r.fulfill({
    body: fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'countries-110m.json')),
    contentType: 'application/json',
  }));
  // cdnjs is unreachable in CI sandboxes; serve the pinned node_modules copies.
  // NOTE: this substitutes bytes for the cdnjs URL, so neither the URL nor its
  // SRI hash is validated here — see docs/load-performance-findings.md §4.2.
  await pg.route('**/cdnjs.cloudflare.com/**', r => {
    const u = r.request().url();
    const pick =
      u.includes('react-dom') ? 'react-dom/umd/react-dom.production.min.js' :
      u.includes('/react/') ? 'react/umd/react.production.min.js' :
      u.includes('d3') ? 'd3/dist/d3.min.js' :
      u.includes('topojson') ? 'topojson/dist/topojson.min.js' : null;
    if (!pick) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ body: fs.readFileSync(path.join(NM, pick)), contentType: 'application/javascript' });
  });


  const base=`http://127.0.0.1:${PORT}/index.html`;
  const {seedPeople:people}=require('./build-tiers.cjs').loadCorpus({quiet:true});
  const patches=JSON.parse(fs.readFileSync(path.join(ROOT,'data-sources/relationships/sakra-indra-network.json'),'utf8'));
  const pairs=Object.entries(patches).flatMap(([id,p])=>[...new Set((p.relations||[]).map(r=>r.personId))].map(target=>({id,target})));
  let relationChecks=0,graphChecks=0,qualifiedChecks=0;
  try{
    for(const {id,target} of pairs){
      await pg.goto(`${base}#/browse/${encodeURIComponent(id)}`);
      await pg.waitForFunction(name=>document.querySelector('.detail h1, .detail-panel h1')?.textContent===name,people[id].name.primary);
      const a=pg.locator(`.relations-list a[href="#/browse/${encodeURIComponent(target)}"]`).first();
      await a.waitFor();await a.focus();await a.press('Enter');
      await pg.waitForFunction(name=>document.querySelector('.detail h1, .detail-panel h1')?.textContent===name,people[target].name.primary);
      relationChecks++;
    }
    // One data-selected outgoing peer for each authored endpoint, including
    // within-tradition peers. The existing shared gate covers every Names link.
    const subjects=[...new Set(pairs.map(p=>p.id))];
    for(const id of subjects){
      const {target}=pairs.find(p=>p.id===id);
      await pg.goto(`${base}#/graph/${encodeURIComponent(id)}`);
      const all=pg.locator('.graph-modes').getByRole('button',{name:'All',exact:true});
      await all.focus();await all.press('Enter');
      await pg.waitForFunction(name=>document.querySelector('.graph-focus-name')?.textContent===name,people[id].name.primary);
      const a=pg.locator(`.graph-focus-neighbor[href="#/browse/${encodeURIComponent(target)}"]`).first();
      await a.waitFor();await a.focus();await a.press('Enter');
      await pg.waitForFunction(name=>document.querySelector('.detail h1, .detail-panel h1')?.textContent===name,people[target].name.primary);
      graphChecks++;
    }
    const corrections=JSON.parse(fs.readFileSync(path.join(ROOT,'data-sources/corrections/sakra-indra-network.json'),'utf8'));
    const qualified=Object.entries(corrections).flatMap(([id,cs])=>cs.filter(c=>c.path[0]==='relations'&&c.op==='replace').flatMap(c=>(Array.isArray(c.value)?c.value.filter(r=>!c.expected.some(old=>old.personId===r.personId&&old.kind===r.kind)):[c.value]).map(r=>({id,target:r.personId}))));
    for(const {id,target} of qualified){
      await pg.goto(`${base}#/graph/${encodeURIComponent(id)}`);
      const cross=pg.locator('.graph-modes').getByRole('button',{name:'Cross-tradition',exact:true});
      await cross.focus();await cross.press('Enter');
      await pg.waitForFunction(name=>document.querySelector('.graph-focus-name')?.textContent===name,people[id].name.primary);
      const a=pg.locator(`.graph-focus-neighbor[href="#/browse/${encodeURIComponent(target)}"]`).first();
      await a.waitFor();await a.focus();await a.press('Enter');
      await pg.waitForFunction(name=>document.querySelector('.detail h1, .detail-panel h1')?.textContent===name,people[target].name.primary);
      qualifiedChecks++;
    }
    assert.ok(relationChecks&&graphChecks&&qualifiedChecks);

    console.log(`Verified ${relationChecks} relationship-list and ${graphChecks} graph-neighbor keyboard navigations; ${qualifiedChecks} qualified Cross-tradition links.`);
  }finally{await b.close();srv.close();}
})().catch(e=>{console.error(e);srv.close();process.exitCode=1;});
