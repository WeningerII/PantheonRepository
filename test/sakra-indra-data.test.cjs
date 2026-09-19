const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {inventory}=require('../scripts/lib/counterpart-audit.cjs');
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const patches={...read('data-sources/relationships/sakra-indra-network.json'),...read('data-sources/relationships/shiva-shared-reciprocals.json')};
const {seedPeople:people}=require('../scripts/build-tiers.cjs').loadCorpus({quiet:true});
test('authored family claims retain targets, citations, and independent accounts',()=>{
 for(const [id,p] of Object.entries(patches)){
  assert.ok(people[id],id);
  for(const rel of p.relations||[]){
   assert.ok(people[rel.personId],rel.personId);
   const actual=people[id].relations.find(x=>x.personId===rel.personId&&x.kind===rel.kind);
   assert.ok(actual);
   for(const s of rel.sources)assert.ok(actual.sources.some(a=>a.reference===s.reference&&a.url===s.url));
   if(rel.kind==='reborn-as')assert.ok(!(people[id].parentIds||[]).includes(rel.personId));
  }
  for(const a of p.parentageAccounts||[]){
   assert.deepEqual(JSON.parse(JSON.stringify(people[id].parentageAccounts.find(x=>x.id===a.id))),a);
   for(const parent of a.parents)assert.ok(people[parent.personId]);
  }
 }
});
test('lane inventory is reproducible and no unresolved category is called complete',()=>{
 const config=read('data-sources/audits/sakra-indra/scope.json');
 const actual=read('data-sources/audits/sakra-indra/ledger.json');
 assert.deepEqual(actual,JSON.parse(JSON.stringify(inventory(people,config))));
 assert.equal(actual.complete,false);
 for(const p of actual.records)for(const c of Object.values(p.categories))if(['awaiting-research','disputed'].includes(c.status))assert.notEqual(c.reviewComplete,true);
 for(const id of Object.keys(patches))assert.ok(actual.records.some(p=>p.id===id),id);
});
test('cited corrections survive the final derivation pass with previous evidence',()=>{
 const corrections=read('data-sources/corrections/sakra-indra-network.json');
 for(const [id,list] of Object.entries(corrections))for(const c of list){
  let value=people[id];for(const key of c.path)value=value[key];
  assert.deepEqual(JSON.parse(JSON.stringify(value)),c.value);
  const h=people[id].corrections.find(h=>h.id===c.id);
  assert.deepEqual(JSON.parse(JSON.stringify(h.previous)),c.expected);
  assert.deepEqual(JSON.parse(JSON.stringify(h.decision.sources)),c.sources);
 }
});
test('authored counterpart revisions remain in the shared comparison graph category',()=>{
 const vm=require('node:vm');const babel=require('@babel/standalone');
 const scope={React:require('react'),window:{},console};vm.createContext(scope);
 vm.runInContext(babel.transform(fs.readFileSync(path.join(root,'app/state.jsx'),'utf8'),{presets:['react']}).code,scope);
 const corrections=read('data-sources/corrections/sakra-indra-network.json');
 for(const list of Object.values(corrections))for(const c of list){
  if(c.path[0]==='relations')for(const r of Array.isArray(c.value)?c.value.filter(r=>!c.expected.some(old=>old.personId===r.personId&&old.kind===r.kind)):[c.value])assert.equal(scope.relationFamily(r.kind),'Cross-tradition',c.id);
 }
});
