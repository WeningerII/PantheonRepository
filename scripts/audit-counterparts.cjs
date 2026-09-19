const fs=require('node:fs');const path=require('node:path');
const {inventory}=require('./lib/counterpart-audit.cjs');
const root=path.join(__dirname,'..');
const dir=path.join(root,'data-sources/audits/connected-counterparts');
const config=JSON.parse(fs.readFileSync(path.join(dir,'scope.json'),'utf8'));
const {seedPeople}=require('./build-tiers.cjs').loadCorpus({quiet:true});
const report=inventory(seedPeople,config);
fs.writeFileSync(path.join(dir,'ledger.json'),JSON.stringify(report,null,1)+'\n');
console.log(`${report.records.length} scoped records; ${report.records.reduce((n,p)=>n+p.relations.filter(r=>r.status.startsWith('unresolved')).length,0)} unresolved references; completeness not certified`);
