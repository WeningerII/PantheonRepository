// A deterministic inventory, not an automatic historical completeness verdict.
const CATEGORIES = ['names','scripts','tradition','description','parentage','partners','siblings','descendants','lifecycle','domains','powers','objects','epithets','iconography','cult','sources'];
function inventory(people, config) {
 const follow = new RegExp(config.relationshipPattern);
 const edges = Object.values(people).flatMap(p => [
   ...(p.parentIds||[]).map(personId=>({subject:p.id,kind:'parent',personId})),
   ...(p.relations||[]).map(r=>({subject:p.id,...r})),
   ...(p.nameLinks||[]).filter(n=>n.personId).map(n=>({subject:p.id,kind:'counterpart-name',personId:n.personId})),
   ...(p.parentageAccounts||[]).flatMap(a=>a.parents.map(r=>({subject:p.id,...r,accountId:a.id})))
 ]);
 const ids=new Set(config.seeds);
 for(const id of ids) if(!people[id]) throw new Error(`Unknown audit seed: ${id}`);
 let changed=true;
 while(changed){changed=false;for(const e of edges)if(people[e.personId]&&follow.test(e.kind)&&(ids.has(e.subject)||ids.has(e.personId)))for(const id of [e.subject,e.personId])if(!ids.has(id)){ids.add(id);changed=true;}}
 const records=[...ids].sort().map(id=>{
   const p=people[id];
   const names=[...(p.names||[]).map(n=>({...n,form:'structured'})),
     ...[p.name?.primary,...p.name?.alt||[]].filter(Boolean).map(value=>({value,tradition:p.tradition,form:'name-or-alias'})),
     ...Object.entries(p.name?.transliterations||{}).filter(([,v])=>v).map(([script,value])=>({script,value,form:'transliteration'}))];
   for(const n of p.nameLinks||[]){const old=names.find(x=>x.value===n.value&&x.tradition===n.tradition);if(old)Object.assign(old,n);else names.push(n);}
   const relations=edges.filter(e=>e.subject===id);
   const presence={names:names.length,scripts:names.filter(n=>n.script||n.original).length,tradition:!!p.tradition,description:!!p.notes,
     parentage:(p.parentIds||[]).length,partners:relations.filter(r=>/spouse|consort|lover/.test(r.kind)).length,
     siblings:relations.filter(r=>/sibling|brother|sister/.test(r.kind)).length,descendants:edges.filter(e=>e.personId===id&&e.kind==='parent').length,
     lifecycle:(p.lifecycle||[]).length,domains:(p.domains||[]).length,powers:(p.faculties||[]).length,objects:(p.materialCulture||[]).length,
     epithets:(p.epithets||[]).length,iconography:Object.keys(p.iconography||{}).length,cult:Object.values(p.cult||{}).reduce((n,v)=>n+(Array.isArray(v)?v.length:0),0),sources:(p.sources||[]).length};
   return {id,tradition:p.tradition,names:names.map(n=>({status:'awaiting-research',...n})),
     categories:Object.fromEntries(CATEGORIES.map(key=>[key,{status:'awaiting-research',present:presence[key],...(config.reviews?.[id]?.[key]||{})}])),
     relations:relations.map(e=>({...e,status:e.personId?(people[e.personId]?'registered-target':'unresolved-target'):'unresolved-reference'})),
     sources:p.sources||[],variants:p.variants||[],parentageAccounts:p.parentageAccounts||[]};
 });
 return {schemaVersion:1,complete:false,seeds:config.seeds,relationshipPattern:config.relationshipPattern,
   meaning:'Presence and registered-target are structural observations, not source review. Added does not mean an entire category is complete.',
   records,discoveries:config.discoveries||[],sourceBlockers:config.sourceBlockers||[]};
}
module.exports={inventory,CATEGORIES};
