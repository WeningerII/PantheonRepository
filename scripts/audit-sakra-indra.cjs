const fs=require('node:fs');const path=require('node:path');
const {inventory}=require('./lib/counterpart-audit.cjs');
const dir=path.join(__dirname,'../data-sources/audits/sakra-indra');
const config=JSON.parse(fs.readFileSync(path.join(dir,'scope.json'),'utf8'));
const {seedPeople}=require('./build-tiers.cjs').loadCorpus({quiet:true});
const report=inventory(seedPeople,config);
fs.writeFileSync(path.join(dir,'ledger.json'),JSON.stringify(report,null,1)+'\n');
console.log(`${report.records.length} scoped records; research completeness not certified`);
