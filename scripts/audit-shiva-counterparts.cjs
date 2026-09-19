const fs=require('node:fs');const path=require('node:path');
const {inventory}=require('./lib/counterpart-audit.cjs');
const dir=path.join(__dirname,'../data-sources/audits/shiva-counterparts');
function report(people,config){
 const out=inventory(people,config);
 out.ownership=config.ownership;
 for(const r of out.records){
  r.owner=config.ownership.records[r.id]||'Shiva discovery frontier; research unfinished';
  for(const n of r.names){const v=config.nameReviews?.[r.id]?.[n.value];if(v)Object.assign(n,v);}
  r.claims=Object.fromEntries(['notes','domains','faculties','materialCulture','lifecycle','epithets','iconography','cult','linguistic','externalRefs','corrections','parentageCorrections'].filter(k=>people[r.id][k]!=null).map(k=>[k,people[r.id][k]]));
 }
 return out;
}
if(require.main===module){
 const config=JSON.parse(fs.readFileSync(path.join(dir,'scope.json'),'utf8'));
 const {seedPeople}=require('./build-tiers.cjs').loadCorpus({quiet:true});
 const out=report(seedPeople,config);
 fs.writeFileSync(path.join(dir,'ledger.json'),JSON.stringify(out,null,1)+'\n');
 console.log(`${out.records.length} records; research completeness remains ${out.complete}`);
}
module.exports={report};
