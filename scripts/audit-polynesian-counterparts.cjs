// Lane-owned audit output; uses the shared closure contract without identity heuristics.
const fs=require('node:fs');
const path=require('node:path');
const {inventory}=require('./lib/counterpart-audit.cjs');
function report(people,config){
 config ||= JSON.parse(fs.readFileSync(path.join(__dirname,'../data-sources/audits/polynesian-counterparts/scope.json'),'utf8'));
 const result=inventory(people,config);
 // Explicit source-review decisions are distinct from navigation identity status.
 for(const record of result.records){
  for(const decision of config.nameReviews?.[record.id]||[]){
   const names=record.names.filter(n=>n.value===decision.value);
   if(!names.length||!decision.sources?.length||!decision.review)throw new Error(`Invalid name review for ${record.id}`);
   for(const name of names){
    name.reviewStatus=decision.status;
    name.reviewSources=decision.sources;
    name.review=decision.review;
    if(name.status==='awaiting-research'&&decision.identityStatus==='same-record')name.status='same-record';
   }
  }
 }
 return result;
}
if(require.main===module){
 const result=report(require('./build-tiers.cjs').loadCorpus({quiet:true}).seedPeople);
 fs.writeFileSync(path.join(__dirname,'../data-sources/audits/polynesian-counterparts/ledger.json'),JSON.stringify(result,null,1)+'\n');
 console.log(`${result.records.length} scoped records; research completeness not certified`);
}
module.exports={report};
