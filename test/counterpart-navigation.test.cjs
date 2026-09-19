const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const babel = require('@babel/standalone');
const { applyRelationshipSupplement: apply } = require('../scripts/lib/relationship-supplement.cjs');
const citation = { reference: 'Text 1, section 2', url: 'https://example.org/text' };
const nodes = () => Object.fromEntries(['N0','N1','N2','N3'].map(id=>[id,{id,name:{primary:'Shared label',alt:['Alias']},tradition:id==='N1'?'T1':'T0',parentIds:[]} ]));
const link = (status,personId) => ({value:'Shared label',tradition:'T1',status,...(personId?{personId}:{}),sources:[citation]});
const account = (id,parents) => ({id,label:id,parents:parents.map(personId=>({personId,kind:'parent',sources:[citation]})),sources:[citation]});
function scope(file) {
 const s={React,window:{nameRecords:p=>p.nameLinks,TYPE_TIER:{},displayName:p=>p.name.primary,TierIcon:()=>null}};
 vm.createContext(s);vm.runInContext(babel.transform(fs.readFileSync(path.join(__dirname,'../app',file),'utf8'),{presets:['react']}).code,s);return s;
}
test('explicit name targets distinguish shared labels and same-record aliases',()=>{
 const m=nodes();apply(m,{N0:{nameLinks:[link('resolved','N1'),{...link('same-record'),value:'Alias',tradition:'T0'},{...link('disputed'),value:'Uncertain'}]}});
 const s=scope('Detail.jsx');const html=renderToStaticMarkup(React.createElement(s.NameRecords,{entry:m.N0,byId:new Map(Object.entries(m))}));
 assert.match(html,/href="#\/browse\/N1"/);assert.equal((html.match(/<a /g)||[]).length,1);assert.match(html,/disputed/);assert.doesNotMatch(html,/browse\/N0/);
 const once=structuredClone(m);apply(m,{N0:{nameLinks:[link('resolved','N1')]}});assert.deepEqual(m,once);
});
test('missing, self, and unresolved targets fail atomically',()=>{
 for(const l of [link('resolved','missing'),link('resolved','N0'),link('unresolved','N1'),{...link('resolved','N1'),sources:[]}]){
 const m=nodes(),before=structuredClone(m);assert.throws(()=>apply(m,{N0:{nameLinks:[l]},N2:{parentageAccounts:[account('A0',['N3'])]}}));assert.deepEqual(m,before);
 }
});
test('duplicate authored name keys reject conflicting targets before mutation',()=>{
 const m=nodes(), before=structuredClone(m);
 assert.throws(()=>apply(m,{N0:{nameLinks:[link('resolved','N1'),link('resolved','N2')]}}));
 assert.deepEqual(m,before);
});
test('separate cited accounts preserve default parents and support explicit empty parentage',()=>{
 const m=nodes();m.N0.parentIds=['N1','N2'];apply(m,{N0:{parentageAccounts:[account('A0',['N3']),account('A1',[])]}});
 assert.deepEqual(m.N0.parentIds,['N1','N2']);assert.equal(m.N0.parentageAccounts[0].parents[0].sources[0].reference,citation.reference);
 const s=scope('Lineage.jsx');const byId=new Map(Object.entries(m));
 const p=s.projectLineageAccounts(byId,{N0:'A0'});
 assert.deepEqual(Array.from(p.byId.get('N0').parentIds),['N3']);assert.equal(p.childrenOf.has('N1'),false);assert.deepEqual(Array.from(p.childrenOf.get('N3')),['N0']);
 assert.deepEqual(Array.from(s.projectLineageAccounts(byId,{N0:'A1'}).byId.get('N0').parentIds),[]);
 assert.deepEqual(m.N0.parentIds,['N1','N2']);
 const rename=x=>JSON.parse(JSON.stringify(x).replace(/N(\d)/g,'R$1'));
 const renamed=s.projectLineageAccounts(new Map(Object.entries(rename(m))),{R0:'A0'});
 assert.deepEqual(Array.from(renamed.byId.get('R0').parentIds),['R3']);
});
test('accounts reject dangling endpoints, duplicate account IDs, and conflicting redefinitions',()=>{
 for(const list of [[account('A0',['missing'])],[account('A0',['N1']),account('A0',['N2'])],[account('A0',['N0'])]])assert.throws(()=>apply(nodes(),{N0:{parentageAccounts:list}}));
 const m=nodes();apply(m,{N0:{parentageAccounts:[account('A0',['N1'])]}});assert.throws(()=>apply(m,{N0:{parentageAccounts:[account('A0',['N2'])]}}));
});
test('all authored counterpart targets and account citations survive corpus generation',()=>{
 const {seedPeople:m}=require('../scripts/build-tiers.cjs').loadCorpus({quiet:true});
 for(const f of fs.readdirSync(path.join(__dirname,'../data-sources/relationships')).filter(f=>f.endsWith('.json'))){
 const patches=JSON.parse(fs.readFileSync(path.join(__dirname,'../data-sources/relationships',f),'utf8'));
 for(const [id,p] of Object.entries(patches)){
  for(const n of p.nameLinks||[]){assert.ok(m[id].nameLinks.some(x=>JSON.stringify(x)===JSON.stringify(n)));if(n.status==='resolved')assert.ok(m[n.personId]);}
  for(const a of p.parentageAccounts||[]){assert.ok(m[id].parentageAccounts.some(x=>JSON.stringify(x)===JSON.stringify(a)));for(const r of a.parents)assert.ok(m[r.personId]);}
 }
 }
});

test('audit closure follows incoming edges and keeps all categories and unresolved references',()=>{
 const {inventory,CATEGORIES}=require('../scripts/lib/counterpart-audit.cjs');
 const m=nodes();m.N1.relations=[{kind:'counterpart-of',personId:'N0'}];m.N2.parentIds=['N1'];m.N2.relations=[{kind:'parent',externalRef:{name:'Unknown',tradition:'T0'}}];
 const config={seeds:['N0'],relationshipPattern:'counterpart|parent'};
 const result=inventory(m,config);
 assert.deepEqual(result.records.map(p=>p.id),['N0','N1','N2']);
 assert.equal(result.complete,false);
 for(const p of result.records)assert.deepEqual(Object.keys(p.categories),CATEGORIES);
 assert.equal(result.records[2].relations.at(-1).status,'unresolved-reference');
 const rename=x=>JSON.parse(JSON.stringify(x).replace(/N(\d)/g,'R$1'));
 assert.deepEqual(inventory(rename(m),rename(config)),rename(result));
});
test('committed audit ledger exactly reconciles with the generated corpus',()=>{
 const {inventory}=require('../scripts/lib/counterpart-audit.cjs');
 const dir=path.join(__dirname,'../data-sources/audits/connected-counterparts');
 const config=JSON.parse(fs.readFileSync(path.join(dir,'scope.json'),'utf8'));
 const actual=JSON.parse(fs.readFileSync(path.join(dir,'ledger.json'),'utf8'));
 const {seedPeople}=require('../scripts/build-tiers.cjs').loadCorpus({quiet:true});
 assert.deepEqual(actual,JSON.parse(JSON.stringify(inventory(seedPeople,config))));
});

test('disputed name targets navigate with visible qualification and reject invalid IDs atomically',()=>{
 const m=nodes();apply(m,{N0:{nameLinks:[link('disputed','N1')]}});
 const s=scope('Detail.jsx');const html=renderToStaticMarkup(React.createElement(s.NameRecords,{entry:m.N0,byId:new Map(Object.entries(m))}));
 assert.match(html,/href="#\/browse\/N1"/);assert.match(html,/disputed/);
 for(const id of ['missing','N0']){const copy=nodes(),before=structuredClone(copy);assert.throws(()=>apply(copy,{N0:{nameLinks:[link('disputed',id)]}}));assert.deepEqual(copy,before);}
 const rename=x=>JSON.parse(JSON.stringify(x).replace(/N(\d)/g,'R$1'));
 const renamed=rename(m);const rh=renderToStaticMarkup(React.createElement(s.NameRecords,{entry:renamed.R0,byId:new Map(Object.entries(renamed))}));
 assert.match(rh,/href="#\/browse\/R1"/);assert.match(rh,/disputed/);
});
