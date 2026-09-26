const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { applyRelationshipSupplement: apply } = require('../scripts/lib/relationship-supplement.cjs');
const cited = { kind: 'primary', reference: 'Document 1, section 2', url: 'https://example.org/source' };
const claim = (personId, kind = 'parent') => ({ personId, kind, sources: [cited] });
const records = () => Object.fromEntries(['N0','N1','N2','N3'].map(id => [id, { id, tradition: id === 'N3' ? 'T1' : 'T0', parentIds: [] }]));

test('cited parent additions preserve earlier edges and remain idempotent', () => {
  const m = records(); m.N0.parentIds = ['N1'];
  m.N0.relations = [{ ...claim('N1'), sources: [{ reference: 'Document 0' }] }];
  const p = { N0: { parents: [claim('N1'), claim('N2','mother')] } };
  apply(m,p); const result = structuredClone(m); apply(m,p);
  assert.deepEqual(m,result);
  assert.deepEqual(m.N0.parentIds,['N1','N2']);
  assert.equal(m.N0.parentRoles.N2,'mother');
  assert.deepEqual(m.N0.relations[0].sources.map(x=>x.reference),['Document 0',cited.reference]);
});

test('identity links and variants never import or replace parentage', () => {
  const m = records(); m.N3.parentIds=['N2'];
  apply(m,{N0:{relations:[claim('N3','counterpart-of')], variants:[{id:'V0',claim:'parentage',description:'A different account',sources:[cited]}]}});
  assert.deepEqual(m.N0.parentIds,[]);
  assert.deepEqual(m.N3.parentIds,['N2']);
  assert.equal(m.N0.variants[0].description,'A different account');
});

test('invalid targets, uncited claims and competing parent sets fail before any mutation', () => {
  for (const bad of [claim('absent'),{personId:'N2',kind:'parent'},claim('N2','sibling')]) {
    const m=records(), before=structuredClone(m);
    assert.throws(()=>apply(m,{N1:{relations:[claim('N2','ally')]},N0:{parents:[bad]}}));
    assert.deepEqual(m,before);
  }
  const m=records(); m.N0.parentIds=['N1','N2']; const before=structuredClone(m);
  assert.throws(()=>apply(m,{N0:{parents:[claim('N3')]}}),/separate account/);
  assert.deepEqual(m,before);
});

test('external references resolve by both exact name and tradition with evidence preserved', () => {
  const m=records();m.N0.relations=[
    {kind:'ally',externalRef:{name:'Label 1',tradition:'T0'},sources:[{reference:'Original account'}]},
    {kind:'ally',externalRef:{name:'Label 1',tradition:'T1'}},
    {kind:'ally',externalRef:{name:'Label 10',tradition:'T0'}}];
  const patches={N0:{resolve:[{externalName:'Label 1',tradition:'T0',personId:'N1',sources:[cited]}]}};
  apply(m,patches);const once=structuredClone(m);apply(m,patches);
  assert.deepEqual(m,once);
  assert.equal(m.N0.relations[0].personId,'N1');
  assert.equal(m.N0.relations[0].sources[0].reference,'Original account');
  assert.equal(m.N0.relations[1].externalRef.tradition,'T1');
  assert.equal(m.N0.relations[2].externalRef.name,'Label 10');
});

test('renaming every identifier preserves supplement behavior', () => {
  const m=records(), p={N0:{parents:[claim('N1')],relations:[claim('N3','counterpart-of')]}};
  const rename=x=>JSON.parse(JSON.stringify(x).replace(/N(\d)/g,'R$1'));
  assert.deepEqual(apply(rename(m),rename(p)),rename(apply(m,p)));
});

test('coherent account groups reject ambiguous or malformed membership atomically', () => {
  const account = {id:'A0',label:'Claimed pedigree',lineageGroup:'G0',kind:'claimed-genealogy',
    parents:[claim('N1')],sources:[cited]};
  const m=records();
  apply(m,{N0:{parentageAccounts:[account]}});
  assert.equal(m.N0.parentageAccounts[0].lineageGroup,'G0');
  for(const invalid of [{...account,id:'A1'}, {...account,id:'A1',lineageGroup:' '},
    {...account,id:'A1',lineageGroup:'G1',kind:'unknown'}]) {
    const before=structuredClone(m);
    assert.throws(()=>apply(m,{N1:{relations:[claim('N2','ally')]},N0:{parentageAccounts:[invalid]}}));
    assert.deepEqual(m,before);
  }
});

test('cited classification corrections require an exact baseline and preserve their decision', () => {
  const m=records(); m.N0.type='mortal';
  const correction={id:'C0',expected:'mortal',type:'demigod',reason:'The source names a divine parent.',sources:[cited]};
  const patch={N0:{classificationCorrections:[correction],parents:[claim('N1')]}};
  apply(m,patch);
  assert.equal(m.N0.type,'demigod'); assert.equal(m.N0.classificationCorrections[0].previous,'mortal');
  const once=structuredClone(m); apply(m,patch); assert.deepEqual(m,once);
  for(const bad of [{...correction,id:'C1'}, {...correction,type:'unsupported'}, {...correction,sources:[]}]) {
    assert.throws(()=>apply(m,{N0:{classificationCorrections:[bad]}})); assert.deepEqual(m,once);
  }
});

test('every authored relationship supplement survives the generated corpus', () => {
  const {seedPeople:m}=require('../scripts/build-tiers.cjs').loadCorpus({quiet:true});
  for(const file of fs.readdirSync(path.join(__dirname,'../data-sources/relationships')).filter(f=>f.endsWith('.json'))) {
    const patches=JSON.parse(fs.readFileSync(path.join(__dirname,'../data-sources/relationships',file),'utf8'));
    for(const [id,p] of Object.entries(patches)) {
      for(const r of p.parents||[]) assert.ok(m[id].parentIds.includes(r.personId),`${id} missing parent ${r.personId}`);
      for(const r of [...(p.parents||[]),...(p.relations||[])]) {
        const actual=m[id].relations.find(a=>a.personId===r.personId&&a.kind===r.kind);
        assert.ok(actual,`${id} missing cited relation ${r.personId}`);
        for(const s of r.sources) assert.ok(actual.sources.some(a=>a.reference===s.reference));
      }
      for(const v of p.variants||[]) assert.ok(m[id].variants.some(a=>a.id===v.id&&a.description===v.description));
      for(const r of p.resolve||[]) assert.ok(!m[id].relations.some(a=>a.externalRef?.name===r.externalName&&a.externalRef?.tradition===r.tradition));
    }
  }
});

test('detail renders separate variant accounts and relationship citations without a full corpus fetch', () => {
  const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
  const scope={React,window:{displayName:p=>p.name.primary}};vm.createContext(scope);
  vm.runInContext(require('@babel/standalone').transform(fs.readFileSync(path.join(__dirname,'../app/Detail.jsx'),'utf8'),{presets:['react']}).code,scope);
  const entry={variants:[{id:'V0',claim:'parentage',description:'Separate account A',sources:[cited]}],relations:[claim('N1','father')]};
  const v=renderToStaticMarkup(React.createElement(scope.VariantAccounts,{entry}));
  assert.match(v,/Separate account A/);assert.match(v,/Document 1, section 2/);
  const byId=new Map([['N1',{name:{primary:'Node 1'}}]]);
  const s=renderToStaticMarkup(React.createElement(scope.Sources,{entry,byId}));
  assert.match(s,/Node 1/);assert.match(s,/Document 1, section 2/);
});
