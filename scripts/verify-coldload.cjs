#!/usr/bin/env node
// Manual/CI-optional check (needs Chromium at /opt/pw-browsers or PLAYWRIGHT_BROWSERS_PATH):
//   node scripts/verify-coldload.cjs
// Guards the two initial-load stability invariants after `python3 build.py --pages`:
//   1. mounted Browse rows grow MONOTONICALLY (the reveal window never collapses
//      when a data tier installs mid-load);
//   2. a mounted row NEVER changes height (table-layout: fixed — no column
//      re-negotiation as batches mount).
// Cold-load stability probe: sample the Browse list every 150ms for 8s from
// first paint. The mounted-row count must grow MONOTONICALLY (the reveal
// window must never collapse when the idle tier installs land), and a
// row visible early must keep its height once mounted.
const { chromium } = require('playwright-core');
const http=require('http'),fs=require('fs'),path=require('path');
const NM='/home/user/PantheonRepository/node_modules', SITE='/home/user/PantheonRepository/dist/site', DIST='/home/user/PantheonRepository/dist';
const MIME={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css'};
const srv=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';let f=p.startsWith('/data/')?path.join(DIST,p):path.join(SITE,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(rs);});
(async()=>{
  await new Promise(r=>srv.listen(8881,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1400,height:900}});
  await pg.route('**/fonts.g**',r=>r.fulfill({status:404,body:''}));
  await pg.route('**/world-atlas**',r=>r.fulfill({body:fs.readFileSync('/home/user/PantheonRepository/test/fixtures/countries-110m.json'),contentType:'application/json'}));
  await pg.route('**/cdnjs.cloudflare.com/**',r=>{const u=r.request().url();if(u.includes('react-dom'))return r.fulfill({body:fs.readFileSync(NM+'/react-dom/umd/react-dom.production.min.js'),contentType:'application/javascript'});if(u.includes('/react/'))return r.fulfill({body:fs.readFileSync(NM+'/react/umd/react.production.min.js'),contentType:'application/javascript'});if(u.includes('d3'))return r.fulfill({body:fs.readFileSync(NM+'/d3/dist/d3.min.js'),contentType:'application/javascript'});if(u.includes('topojson'))return r.fulfill({body:fs.readFileSync(NM+'/topojson/dist/topojson.min.js'),contentType:'application/javascript'});return r.fulfill({status:404,body:''});});
  await pg.goto('http://127.0.0.1:8881/index.html#/browse',{waitUntil:'load'});
  await pg.waitForSelector('.browse-table tbody tr',{timeout:30000});
  const samples=[];
  const t0=Date.now();
  while(Date.now()-t0<8000){
    const s=await pg.evaluate(()=>{
      const rows=document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)');
      const first=rows[0];
      return { n:rows.length, h:first?first.getBoundingClientRect().height:0 };
    });
    samples.push(s);
    await pg.waitForTimeout(150);
  }
  let drops=0, maxN=0, hChanges=0, h0=null;
  for(const s of samples){
    if(s.n<maxN) drops++;
    maxN=Math.max(maxN,s.n);
    if(h0===null&&s.h) h0=s.h;
    else if(h0!==null&&s.h&&Math.abs(s.h-h0)>0.5) hChanges++;
  }
  console.log('samples:',samples.length,'| final mounted rows:',samples[samples.length-1].n);
  console.log('row-count DROPS (reveal collapses):',drops, drops===0?'— monotonic ✓':'— COLLAPSE DETECTED');
  console.log('first-row height changes:',hChanges, hChanges===0?'— stable ✓':'— UNSTABLE');
  await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1);});
