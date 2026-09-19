const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {seedPeople:people}=require('../scripts/build-tiers.cjs').loadCorpus({quiet:true});
const plain=x=>JSON.parse(JSON.stringify(x));
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const authored=read('data-sources/relationships/shiva-counterparts.json');
const corrections=read('data-sources/corrections/shiva-counterparts.json');
const scope=read('data-sources/audits/shiva-counterparts/scope.json');
const records=JSON.parse(fs.readFileSync(path.join(root,'data-sources/transcripts/shiva-counterparts.txt'),'utf8').split('```json\n')[1].split('```')[0]);
test('lane records and relationship evidence survive the complete generator pipeline',()=>{
 for(const p of records){
  assert.ok(people[p.id]);assert.equal(people[p.id].name.primary,p.name.primary);
  for(const source of p.sources)assert.ok(people[p.id].sources.some(s=>s.claim===source.claim&&JSON.stringify(s.citations)===JSON.stringify(source.citations)),p.id);
 }
 for(const [id,p] of Object.entries(authored)){
  for(const r of [...p.relations||[],...p.parents||[]]){
   assert.ok(people[r.personId],`${id}: ${r.personId}`);
   const found=people[id].relations.find(x=>x.personId===r.personId&&x.kind===r.kind);
   assert.ok(found,`${id}: ${r.kind}`);
   for(const citation of r.sources)assert.ok(found.sources.some(c=>JSON.stringify(c)===JSON.stringify(citation)));
  }
  for(const r of p.relationRevisions||[]){
   const found=people[id].relations.find(x=>x.personId===r.personId&&x.kind===r.kind);
   assert.ok(found?.revisions?.length,id);
   assert.ok(found.revisions.some(x=>x.previous.kind===r.fromKind),id);
   for(const c of r.sources)assert.ok(found.sources.some(x=>JSON.stringify(x)===JSON.stringify(c)));
  }
 }
});
test('authored corrections retain their old evidence and exact approved decisions',()=>{
 for(const [id,cs] of Object.entries(corrections))for(const c of cs){
  const h=people[id].corrections.find(x=>x.id===c.id);
  assert.ok(h,id);assert.deepEqual(plain(h.previous),c.expected);assert.deepEqual(plain(h.decision),c);
 }
 for(const [id,p] of Object.entries(authored))for(const c of p.parentageCorrections||[]){
  assert.deepEqual(Array.from(people[id].parentIds),c.parents.map(x=>x.personId));
  assert.ok(people[id].parentageCorrections.some(x=>x.id===c.id));
 }
});
test('lane inventory reconciles every discovery and preserves endpoint ownership',()=>{
 const {report}=require('../scripts/audit-shiva-counterparts.cjs');
 const {CATEGORIES}=require('../scripts/lib/counterpart-audit.cjs');
 const result=report(people,scope);
 assert.deepEqual(read('data-sources/audits/shiva-counterparts/ledger.json'),plain(result));
 assert.equal(result.complete,false);
 for(const p of result.records)assert.deepEqual(Object.keys(p.categories),CATEGORIES);
 for(const p of records)assert.ok(result.records.some(x=>x.id===p.id));
 for(const [id,owner] of Object.entries(scope.ownership.records))if(owner.startsWith('Sakra lane')){
  assert.equal(Object.hasOwn(authored,id),false,id);assert.equal(Object.hasOwn(corrections,id),false,id);
 }
 const passages=read('data-sources/audits/shiva-counterparts/passages.json');
 function check(x){if(Array.isArray(x))return x.forEach(check);if(!x||typeof x!=='object')return;if(x.reference&&x.url)assert.ok(passages.some(p=>p.reference===x.reference&&p.url===x.url),x.reference);Object.values(x).forEach(check);}
 check(records);check(authored);check(corrections);
});
