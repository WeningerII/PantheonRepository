const fs=require('node:fs');
const path=require('node:path');
const {inventory}=require('./lib/counterpart-audit.cjs');
function build(people,config){
 const report=inventory(people,config);
 for(const r of report.records){
  r.localContext=config.recordContext[r.id]||'awaiting-research';
  r.nameReview=config.nameReviews[r.id]||[];
  r.corrections=people[r.id].corrections||[];
  r.parentageCorrections=people[r.id].parentageCorrections||[];
 }
 report.integration=config.integration;
 report.reviewEvidence=config.reviewEvidence;
 return report;
}
if(require.main===module){
 const dir=path.join(__dirname,'../data-sources/audits/mesoamerican-counterparts');
 const config=JSON.parse(fs.readFileSync(path.join(dir,'scope.json'),'utf8'));
 const {seedPeople}=require('./build-tiers.cjs').loadCorpus({quiet:true});
 const report=build(seedPeople,config);
 fs.writeFileSync(path.join(dir,'ledger.json'),JSON.stringify(report,null,1)+'\n');
 console.log(`${report.records.length} records inventoried; historical completeness not certified`);
}
module.exports={build};
