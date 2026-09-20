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
test('every authored alias has its own cited review decision',()=>{
 const scope=JSON.parse(read('data-sources/audits/polynesian-counterparts/scope.json'));
 for(const record of authored)for(const alias of record.name.alt||[]){
  const decision=(scope.nameReviews[record.id]||[]).find(d=>d.value===alias);
  assert.ok(decision,`${record.id}: ${alias}`);
  assert.ok(decision.sources.length&&decision.review);
  assert.equal(decision.identityStatus,'same-record');
 }
});
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
test('cited revisions preserve superseded evidence and expose their final field values',()=>{
 const batches=JSON.parse(read('data-sources/corrections/polynesian-counterparts.json'));
 for(const [id,corrections] of Object.entries(batches))for(const c of corrections){
  const history=people[id].corrections.find(h=>h.id===c.id);
  assert.deepEqual(JSON.parse(JSON.stringify(history.previous)),c.expected,`${id} ${c.id}`);
  assert.deepEqual(JSON.parse(JSON.stringify(history.decision)),c);
  let current=people[id];for(const key of c.path)current=current[key];
  if(c.op==='replace')assert.deepEqual(JSON.parse(JSON.stringify(current)),c.value);
  assert.ok(people[id].variants.some(v=>v.id===`correction:${c.id}`&&v.sources.length));
 }
});
test('explicit name reviews preserve target status and survive identifier renaming',()=>{
 const cite={reference:'Text A, section 1',url:'https://example.org/a'};
 const make=(a,b)=>({[a]:{id:a,name:{primary:'Alpha',alt:[]},tradition:'T',sources:[],parentIds:[],nameLinks:[{value:'Beta',tradition:'T',status:'resolved',personId:b,sources:[cite]}]},[b]:{id:b,name:{primary:'Beta',alt:[]},tradition:'T',sources:[],parentIds:[]}});
 const config=(a)=>({seeds:[a],relationshipPattern:'counterpart',nameReviews:{[a]:[{value:'Alpha',status:'reviewed-adequate',identityStatus:'same-record',sources:[cite],review:'Checked explicit source form.'},{value:'Beta',status:'reviewed-adequate',sources:[cite],review:'Checked explicit target form.'}]}});
 for(const [a,b] of [['N1','N2'],['R7','R3']]){
  const people=make(a,b),before=JSON.stringify(people),result=report(people,config(a));
  const names=result.records.find(r=>r.id===a).names;
  assert.equal(names.find(n=>n.value==='Alpha').status,'same-record');
  assert.equal(names.find(n=>n.value==='Beta').status,'resolved');
  assert.equal(names.find(n=>n.value==='Beta').personId,b);
  assert.deepEqual(names.find(n=>n.value==='Alpha').reviewSources,[cite]);
  assert.equal(JSON.stringify(people),before);
  assert.throws(()=>report(people,{...config(a),nameReviews:{[a]:[{value:'Missing',sources:[cite],review:'Absent name'}]}}));
 }
});
test('authored tabular accounts retain explicit targets, citations and ambiguous groups',()=>{
 const tables=JSON.parse(read('data-sources/audits/polynesian-counterparts/source-tables.json'));
 for(const table of tables)for(const row of table.resolvedRows||[]){
  const targets=[row.fatherId,row.motherId,...row.husbandGroupIds||[],...row.childIds].filter(Boolean);
  for(const id of targets)assert.ok(people[id],id);
  for(const id of row.childIds){
   const account=people[id].parentageAccounts.find(a=>a.id===row.accountId);
   assert.ok(account,`${id}: ${row.accountId}`);
   assert.deepEqual(JSON.parse(JSON.stringify(account.sources)),row.sources);
   assert.deepEqual(Array.from(account.parents,p=>p.personId).sort(),[row.fatherId,row.motherId].filter(Boolean).sort());
   if(row.husbandGroupIds){
    assert.equal(account.parents.length,1);
    assert.ok(account.notes);
    for(const parent of row.husbandGroupIds)assert.ok(people[id].relations.some(r=>r.kind==='genealogical-group-context'&&r.personId===parent&&r.sources.length));
   }
  }
 }
});
