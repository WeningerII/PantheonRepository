const {test}=require('node:test');const assert=require('node:assert/strict');
const {applyClaimCorrections:apply}=require('../scripts/lib/claim-corrections.cjs');
const source={reference:'Source A, section 1'};
const nodes=()=>({N0:{id:'N0',name:{primary:'Label'},parentIds:[],faculties:[{id:'F0',name:'Unsupported',sources:[source]},{id:'F1',name:'Retained',sources:[source]}]},N1:{id:'N1',name:{primary:'Other'},parentIds:[]}});
const correction=()=>({id:'C0',path:['faculties',0],op:'remove',expected:nodes().N0.faculties[0],reason:'Reviewed passage concerns a different act.',sources:[{reference:'Source B, section 2'}]});
test('exact removal preserves superseded evidence, citations and idempotence',()=>{
 const m=nodes();apply(m,{N0:[correction()]});assert.deepEqual(m.N0.faculties,[nodes().N0.faculties[1]]);assert.deepEqual(m.N0.corrections[0].previous,nodes().N0.faculties[0]);assert.equal(m.N0.variants[0].sources[0].reference,'Source B, section 2');const once=structuredClone(m);apply(m,{N0:[correction()]});assert.deepEqual(m,once);
 const rename=x=>JSON.parse(JSON.stringify(x).replace(/N(\d)/g,'R$1'));assert.deepEqual(apply(rename(nodes()),rename({N0:[correction()]})),rename(m));
});
test('drift, duplicate IDs, unsafe paths and invalid graph targets reject the whole batch',()=>{
 for(const bad of [{...correction(),expected:{}},{...correction(),sources:[]},{...correction(),path:['id'],expected:'N0'}, {...correction(),path:['name','__proto__'],expected:{}}, {...correction(),op:'replace',path:['parentIds'],expected:[],value:['missing']}]){
  const m=nodes(),before=structuredClone(m);assert.throws(()=>apply(m,{N1:[{id:'C1',op:'replace',path:['name','primary'],expected:'Other',value:'New',reason:'Rename',sources:[source]}],N0:[bad]}));assert.deepEqual(m,before);
 }
 const m=nodes();assert.throws(()=>apply(m,{N0:[correction(),correction()]}));
});
test('nested field replacement requires exact previous value',()=>{
 const m=nodes();m.N0.iconography={attributes:[{id:'A0',notes:'Old',sources:[source]}]};
 apply(m,{N0:[{...correction(),op:'replace',path:['iconography','attributes',0,'notes'],expected:'Old',value:'Qualified'}]});assert.equal(m.N0.iconography.attributes[0].notes,'Qualified');assert.deepEqual(m.N0.iconography.attributes[0].sources,[source]);
});
test('authored corrections survive final generation without restored withdrawn claims',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const root=path.join(__dirname,'../data-sources/corrections');
 const batches={};
 for(const file of fs.existsSync(root)?fs.readdirSync(root).filter(f=>f.endsWith('.json')):[])
  for(const [id,list] of Object.entries(JSON.parse(fs.readFileSync(path.join(root,file),'utf8')))) (batches[id] ||= []).push(...list);
 const {seedPeople:p}=require('../scripts/build-tiers.cjs').loadCorpus({quiet:true});
 for(const [id,list] of Object.entries(batches))for(const c of list){assert.deepEqual(JSON.parse(JSON.stringify(p[id].corrections.find(h=>h.id===c.id).decision)),c);}
 const before=JSON.stringify(p);apply(p,batches);assert.equal(JSON.stringify(p),before);
 const data=fs.readFileSync(path.join(__dirname,'../app/data.js'),'utf8');
 assert.ok(data.lastIndexOf('(m) => applyClaimCorrections(m, CLAIM_CORRECTIONS)') > data.lastIndexOf('  applyPowerScopes,'));
});
