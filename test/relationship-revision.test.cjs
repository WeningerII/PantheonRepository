const {test}=require('node:test');
const assert=require('node:assert/strict');
const {applyRelationshipSupplement:apply}=require('../scripts/lib/relationship-supplement.cjs');
const source={reference:'Catalogue A, item 2',url:'https://example.org/a'};
const decision={personId:'N1',fromKind:'equated-with',kind:'disputed-identification',notes:'The visual identification and name derivation differ.',sources:[{reference:'Study B, section 3'}]};
const nodes=()=>({N0:{id:'N0',parentIds:[],relations:[{kind:'equated-with',personId:'N1',notes:'Earlier assertion',sources:[source]}]},N1:{id:'N1',parentIds:['N2']},N2:{id:'N2',parentIds:[]}});
test('cited revision preserves earlier evidence without transferring genealogy',()=>{
 const m=nodes();apply(m,{N0:{relationRevisions:[decision]}});
 const r=m.N0.relations[0];assert.equal(r.kind,'disputed-identification');assert.deepEqual(r.revisions[0].previous,nodes().N0.relations[0]);assert.deepEqual(r.sources[0],source);assert.deepEqual(m.N0.parentIds,[]);
 const once=structuredClone(m);apply(m,{N0:{relationRevisions:[decision]}});assert.deepEqual(m,once);
 const rename=x=>JSON.parse(JSON.stringify(x).replace(/N(\d)/g,'R$1'));
 const renamed=rename(nodes());apply(renamed,rename({N0:{relationRevisions:[decision]}}));assert.deepEqual(renamed,rename(m));
});
test('stale, ambiguous, uncited and genealogical revisions reject atomically',()=>{
 for(const d of [{...decision,fromKind:'missing'},{...decision,sources:[]},{...decision,kind:'father'},{...decision,personId:'missing'}]){
  const m=nodes(),before=structuredClone(m);assert.throws(()=>apply(m,{N0:{relationRevisions:[d]}}));assert.deepEqual(m,before);
 }
 const m=nodes(),before=structuredClone(m);assert.throws(()=>apply(m,{N0:{relationRevisions:[decision,decision]}}));assert.deepEqual(m,before);
});
test('corrected baseline retains evidence and does not equate unknown with uncreated',()=>{
 const m=nodes();m.N0.parentIds=['N1'];
 const correction={id:'C0',expected:['N1'],parents:[],reason:'The cited passage describes a partner, not a parent. Parentage remains unknown.',sources:[source]};
 apply(m,{N0:{parentageCorrections:[correction]}});
 assert.deepEqual(m.N0.parentIds,[]);assert.equal(m.N0.parentageAccounts,undefined);
 assert.deepEqual(m.N0.parentageCorrections[0].previous.parentIds,['N1']);
 const once=structuredClone(m);apply(m,{N0:{parentageCorrections:[correction]}});assert.deepEqual(m,once);
 const n=nodes(),before=structuredClone(n);assert.throws(()=>apply(n,{N0:{parentageCorrections:[correction]}}));assert.deepEqual(n,before);
});
