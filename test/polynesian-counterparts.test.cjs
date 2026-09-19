const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadCorpus}=require('../scripts/build-tiers.cjs');
const {report}=require('../scripts/audit-polynesian-counterparts.cjs');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const people=loadCorpus({quiet:true}).seedPeople;
const authored=JSON.parse(read('data-sources/transcripts/polynesian-counterparts.txt').match(/```json\n([\s\S]*?)\n```/)[1]);
const patches=JSON.parse(read('data-sources/relationships/polynesian-counterparts.json'));
test('lane-authored claims retain their exact cited descriptions and validated targets',()=>{
 for(const record of authored){
  assert.ok(people[record.id],record.id);
  assert.ok(people[record.id].sources.some(s=>s.claim===record.notes && JSON.stringify(s.citations)===JSON.stringify(record.sources[0].citations)),record.id);
 }
 for(const [id,patch] of Object.entries(patches)){
  for(const r of [...patch.parents||[],...patch.relations||[],...patch.nameLinks||[]]){
   if(r.personId)assert.ok(people[r.personId],`${id} -> ${r.personId}`);
   assert.ok(r.sources.length && r.sources.every(s=>s.reference&&s.url),id);
  }
  for(const account of patch.parentageAccounts||[]){
   assert.deepEqual(JSON.parse(JSON.stringify(people[id].parentageAccounts.find(a=>a.id===account.id))),account);
   for(const parent of account.parents)assert.ok(people[parent.personId]);
  }
 }
});
test('independent authored accounts do not silently become default parentage',()=>{
 for(const [id,patch] of Object.entries(patches)){
  const newRecord=authored.find(r=>r.id===id);
  if(!newRecord||!patch.parentageAccounts?.length||patch.parents?.length)continue;
  assert.deepEqual(Array.from(people[id].parentIds||[]),newRecord.parentIds,id);
 }
});
test('lane ledger is reproducible and accounts for every authored and discovered endpoint',()=>{
 const actual=report(people);
 assert.deepEqual(JSON.parse(read('data-sources/audits/polynesian-counterparts/ledger.json')),JSON.parse(JSON.stringify(actual)));
 const ids=new Set(actual.records.map(r=>r.id));
 for(const r of authored)assert.ok(ids.has(r.id),r.id);
 for(const id of Object.keys(patches))assert.ok(ids.has(id),id);
 assert.equal(actual.complete,false,'Open research must never be represented as complete');
 for(const r of actual.records)assert.equal(Object.keys(r.categories).length,16);
});
