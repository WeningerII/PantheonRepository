const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const records=JSON.parse(fs.readFileSync(path.join(root,'data-sources/transcripts/shiva-regional-completion.txt'),'utf8').split('```json\n')[1].split('```')[0]);
const patches=read('data-sources/relationships/shiva-regional-completion.json');
const scope=read('data-sources/audits/shiva-counterparts/scope.json');
const catalog=read('data-sources/audits/shiva-counterparts/passages.json');
const passages=read('data-sources/audits/shiva-counterparts/completion-passages.json').passages;
const {seedPeople:people}=require('../scripts/build-tiers.cjs').loadCorpus({quiet:true});
const plain=x=>JSON.parse(JSON.stringify(x));
test('regional records preserve independent IDs, cited accounts and passage coverage',()=>{
 for(const p of records){
  assert.equal(people[p.id].name.primary,p.name.primary);assert.equal(people[p.id].tradition,p.tradition);
  assert.ok(scope.seeds.includes(p.id));assert.ok(passages.some(x=>x.records.includes(p.id)||p.sources.some(s=>s.citations.some(c=>c.reference===x.source.reference))));
  for(const s of p.sources)assert.ok(people[p.id].sources.some(x=>JSON.stringify(x)===JSON.stringify(s)));
 }
 for(const [id,p] of Object.entries(patches)){
  assert.ok(people[id]);assert.ok(!scope.ownership.records[id]?.startsWith('Sakra lane'));
  for(const a of p.parentageAccounts||[]){
   assert.ok(people[id].parentageAccounts.some(x=>JSON.stringify(x)===JSON.stringify(a)));
   for(const r of a.parents)assert.ok(people[r.personId]);
  }
  for(const r of p.relations||[]){
   const found=people[id].relations.find(x=>x.personId===r.personId&&x.kind===r.kind);assert.ok(found);
   for(const c of r.sources)assert.ok(found.sources.some(x=>JSON.stringify(x)===JSON.stringify(c)));
  }
 }
});
test('regional citation catalog accounts for every authored source claim',()=>{
 function check(x){if(Array.isArray(x))return x.forEach(check);if(!x||typeof x!=='object')return;
  if(x.reference&&x.url)assert.ok(catalog.some(p=>p.reference===x.reference&&p.url===x.url),x.reference);
  Object.values(x).forEach(check);
 }
 check(records);check(patches);check(read('data-sources/corrections/shiva-regional-completion.json'));check(read('data-sources/enrichments/shiva-regional-completion.json'));
});
test('regional revisions retain superseded relationship evidence',()=>{
 for(const [id,p] of Object.entries(patches))for(const r of p.relationRevisions||[]){
  const edge=people[id].relations.find(x=>x.personId===r.personId&&x.kind===r.kind);
  assert.ok(edge?.revisions?.some(x=>x.previous.kind===r.fromKind));
  for(const source of r.sources)assert.ok(plain(edge.sources).some(x=>JSON.stringify(x)===JSON.stringify(source)));
 }
});
