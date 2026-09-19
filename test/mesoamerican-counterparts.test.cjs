const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const people=JSON.parse(JSON.stringify(require('../scripts/build-tiers.cjs').loadCorpus({quiet:true}).seedPeople));
const patches=read('data-sources/relationships/mesoamerican-counterparts.json');
const corrections=read('data-sources/corrections/mesoamerican-counterparts.json');
test('authored targets, source accounts and aliases survive generation independently',()=>{
 for(const [id,patch] of Object.entries(patches)){
  assert.ok(people[id]);
  for(const link of patch.nameLinks||[]){
   const actual=people[id].nameLinks.find(n=>n.value===link.value&&n.tradition===link.tradition);
   assert.deepEqual(actual,link);
   if(link.personId){assert.ok(['resolved','disputed'].includes(link.status));assert.ok(people[link.personId]);assert.notEqual(link.personId,id);}
   else assert.notEqual(link.status,'resolved');
  }
  for(const account of patch.parentageAccounts||[]){
   assert.deepEqual(people[id].parentageAccounts.find(a=>a.id===account.id),account);
   for(const parent of account.parents){assert.ok(people[parent.personId]);assert.ok(parent.sources.length);}
  }
  for(const rev of patch.relationRevisions||[]){
   const actual=people[id].relations.find(r=>r.personId===rev.personId&&r.kind===rev.kind);
   assert.ok(actual);assert.ok(actual.revisions.some(h=>h.previous.kind===rev.fromKind));
   assert.ok(actual.sources.some(s=>s.reference===rev.sources[0].reference));
  }
 }
});
test('final corrections preserve evidence and are not overwritten by later passes',()=>{
 for(const [id,list] of Object.entries(corrections))for(const c of list){
  const history=people[id].corrections.find(h=>h.id===c.id);
  assert.deepEqual(history.previous,c.expected);assert.deepEqual(history.decision,c);
  let value=people[id];for(const key of c.path)value=value[key];
  assert.deepEqual(value,c.value);
  assert.ok(people[id].variants.some(v=>v.id===`correction:${c.id}`&&v.sources.length));
 }
});
test('lane inventory repeats deterministically and accounts for all new records',()=>{
 const dir='data-sources/audits/mesoamerican-counterparts/';
 const config=read(dir+'scope.json');
 const actual=require('../scripts/audit-mesoamerican-counterparts.cjs').build(people,config);
 assert.deepEqual(actual,read(dir+'ledger.json'));
 const authored=JSON.parse(fs.readFileSync(path.join(root,'data-sources/transcripts/mesoamerican-counterparts.txt'),'utf8').split('```json')[1].split('```')[0]);
 for(const p of authored)assert.ok(actual.records.some(r=>r.id===p.id));
 for(const p of actual.records){assert.equal(Object.keys(p.categories).length,16);assert.ok(p.nameReview.length);}
 assert.equal(actual.complete,false);
});
