// Lane-owned audit output; uses the shared closure contract without identity heuristics.
const fs=require('node:fs');
const path=require('node:path');
const {inventory}=require('./lib/counterpart-audit.cjs');
function report(people){
 const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../data-sources/audits/polynesian-counterparts/scope.json'),'utf8'));
 return inventory(people,config);
}
if(require.main===module){
 const result=report(require('./build-tiers.cjs').loadCorpus({quiet:true}).seedPeople);
 fs.writeFileSync(path.join(__dirname,'../data-sources/audits/polynesian-counterparts/ledger.json'),JSON.stringify(result,null,1)+'\n');
 console.log(`${result.records.length} scoped records; research completeness not certified`);
}
module.exports={report};
