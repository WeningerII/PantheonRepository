const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const babel=require('@babel/standalone');
const kinds=['buddhist-adaptation','identified-in-text','disputed-identification','comparative-identification','indirect-syncretic-association','localized-cult-assimilation','regional-cult-form','identification-awaiting-verification','historical-association','comparison-under-review', 'iconographic-comparison', 'scholarly-comparison', 'textual-identification'];
function scope(){
 const s={React:require('react'),window:{},console};vm.createContext(s);
 for(const name of ['state.jsx','Graph.jsx'])vm.runInContext(babel.transform(fs.readFileSync(path.join(__dirname,'../app',name),'utf8'),{presets:['react']}).code,s);
 return s;
}
test('qualified comparison kinds remain visible without changing their evidence labels',()=>{
 const s=scope();
 for(const kind of kinds){
  assert.equal(s.relationFamily(kind),'Cross-tradition');
  assert.equal(s.relationFamily(' '+kind.toUpperCase()+' '),'Cross-tradition');
  const people=[{id:'N0',name:{primary:'Shared'},tradition:'T0',relations:[{kind,personId:'N1',sources:[{reference:'Text 1'}]}]},{id:'N1',name:{primary:'Shared'},tradition:'T1'}];
  const graph=s.buildGraph(people,new Map(people.map(p=>[p.id,p])),'cross-tradition',null);
  assert.equal(graph.links.length,1);assert.equal(graph.links[0].kind,kind);
 }
 assert.equal(s.relationFamily('created-by'),'Other');
 assert.equal(s.relationFamily('unrecognized-kind'),'Other');
});
