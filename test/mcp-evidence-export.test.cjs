const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const citation={reference:'Source 1, section 2',url:'https://example.org/source'};
const fixture=()=>({N0:{id:'N0',name:{primary:'Shared label',alt:['Ordinary alias']},tradition:'T0',type:'deity',parentIds:[],
 parentageAccounts:[{id:'A0',label:'Uncreated account',parents:[],sources:[citation]},{id:'A1',label:'Birth account',parents:[{personId:'N1',kind:'parent',sources:[citation]}],sources:[citation]}],
 nameLinks:[{value:'Shared label',status:'resolved',personId:'N1',sources:[citation]},{value:'Ordinary alias',status:'same-record',sources:[citation]}],
 relations:[{kind:'identified-in-account',personId:'N1',sources:[citation]}],variants:[{id:'V0',claim:'Alternative portrayal',sources:[citation]}],futureEvidence:{values:[],uncertain:null},sources:[{claim:'Origin',citations:[citation]}]},
 N1:{id:'N1',name:{primary:'Shared label'},tradition:'T1',type:'deity'}});
test('full evidence preserves cited alternatives, empty assertions, explicit targets and identifier renaming',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'corpus-evidence-'));
 const previous=process.env.PANTHEON_DATA;
 try{
  for(const prefix of ['N','R']){
   const records=JSON.parse(JSON.stringify(fixture()).replace(/N([01])/g,prefix+'$1'));
   const file=path.join(dir,prefix+'.js');
   fs.writeFileSync(file,'window.__PR='+JSON.stringify({seedPeople:records,items:{},divinity:{}})+';');
   process.env.PANTHEON_DATA=file;
   const c=await import(pathToFileURL(path.join(__dirname,'../mcp/corpus.mjs')).href+'?fixture='+prefix);
   const full=c.getFigure(prefix+'0',{view:'full'});
   assert.deepEqual(full.source_record,records[prefix+'0']);
   assert.deepEqual(full.source_record.parentageAccounts[0].parents,[]);
   assert.equal(Object.hasOwn(c.getFigure(prefix+'1',{view:'full'}).source_record,'parentIds'),false);
   full.source_record.parentageAccounts[1].sources[0].reference='Changed';
   full.source_record.parentageAccounts[0].parents.push({personId:prefix+'1'});
   assert.deepEqual(c.getFigure(prefix+'0',{view:'full'}).source_record,records[prefix+'0']);
   for(const view of ['card','standard','dossier'])assert.equal(Object.hasOwn(c.getFigure(prefix+'0',{view}),'source_record'),false);
  }
 }finally{
  if(previous===undefined)delete process.env.PANTHEON_DATA;else process.env.PANTHEON_DATA=previous;
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
test('full evidence retains every authored account and name decision from the generated corpus',async()=>{
 const c=await import(pathToFileURL(path.join(__dirname,'../mcp/corpus.mjs')).href+'?actual-corpus');
 const {seedPeople}=require('../scripts/build-tiers.cjs').loadCorpus({quiet:true});
 let checked=0;
 for(const p of Object.values(seedPeople).filter(p=>p.parentageAccounts?.length||p.nameLinks?.length)){
  const actual=c.getFigure(p.id,{view:'full'}).source_record;
  assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(p)),p.id);checked++;
 }
 assert.ok(checked>0);
});
