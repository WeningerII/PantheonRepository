const {test}=require('node:test');
const assert=require('node:assert/strict');
const {partitionCases}=require('../scripts/verify-counterpart-ui.cjs');

test('browser partitions exercise every explicit target and account exactly once',()=>{
 const people={
  n1:{id:'n1',nameLinks:[{value:'Alpha',status:'resolved',personId:'n2'},{value:'Alpha extended',status:'disputed',personId:'n3'},{value:'Beta',status:'unresolved'}],parentageAccounts:[{id:'a'},{id:'b'}]},
  n2:{id:'n2',nameLinks:[{value:'Gamma',status:'resolved',personId:'n1'}],parentageAccounts:[{id:'c'}]},
  n3:{id:'n3',parentageAccounts:[{id:'d'}]}
 };
 for(const count of [1,2,3,7]){
  const parts=partitionCases(people,count);
  const keys=parts.flatMap(p=>p.targets.map(({p,n})=>`${p.id}/${n.personId}/${n.value}`));
  assert.deepEqual(keys.sort(),['n1/n2/Alpha','n1/n3/Alpha extended','n2/n1/Gamma'].sort());
  assert.equal(new Set(keys).size,keys.length);
  assert.deepEqual(parts.flatMap(p=>p.accountPeople.flatMap(p=>p.parentageAccounts.map(a=>`${p.id}/${a.id}`))).sort(),['n1/a','n1/b','n2/c','n3/d']);
 }
 const renamed=Object.fromEntries(Object.values(people).map(p=>[p.id.replace('n','r'),{...p,id:p.id.replace('n','r'),nameLinks:p.nameLinks?.map(n=>({...n,personId:n.personId?.replace('n','r')}))}]));
 assert.deepEqual(partitionCases(renamed,3).map(p=>[p.targets.length,p.accountPeople.length]),partitionCases(people,3).map(p=>[p.targets.length,p.accountPeople.length]));
 assert.throws(()=>partitionCases(people,0));
});
