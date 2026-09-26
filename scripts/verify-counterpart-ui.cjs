// Browser regression checks over authored targets, without figure-specific selectors.
const assert = require('node:assert/strict');
function partitionCases(people, count) {
 assert.ok(Number.isInteger(count) && count > 0);
 const parts=Array.from({length:count},()=>({targets:[],accountPeople:[]}));
 const targets=Object.values(people).flatMap(p=>(p.nameLinks||[]).filter(n=>['resolved','disputed'].includes(n.status)&&n.personId).map(n=>({p,n})));
 const accountPeople=Object.values(people).filter(p=>p.parentageAccounts?.length);
 targets.forEach((value,i)=>parts[i%count].targets.push(value));
 accountPeople.forEach((value,i)=>parts[i%count].accountPeople.push(value));
 return parts;
}
async function verifyCounterpartUI(page, base, people, cases=partitionCases(people,1)[0]) {
 await verifyNameProbeFixture(page);
 const open = async p => { await page.goto(`${base}#/browse/${encodeURIComponent(p.id)}`, {waitUntil:'domcontentloaded'}); await page.waitForFunction(name => document.querySelector('.detail h1, .detail-panel h1')?.textContent === name, p.name.primary); };
 const {targets,accountPeople}=cases;
 let targetCount=0;
 console.log(`counterpart UI: starting ${targets.length} authored name targets`);
 for(const {p,n} of targets){
  // Independent cases start in a fresh document; each case still exercises
  // sequential Names, relationship-list and graph-neighbor keyboard navigation.
  await page.goto('about:blank');
  console.log(`counterpart UI: target ${++targetCount}/${targets.length} ${p.id} -> ${n.personId}`);
  await open(p);
  const a=nameLinkLocator(page,n.value);
  assert.equal(await a.count(),1);
  if(n.status==='disputed')assert.ok((await a.locator('..').innerText()).includes('disputed'));
  assert.equal(await a.getAttribute('href'),`#/browse/${encodeURIComponent(n.personId)}`);
  await a.focus();await a.press('Enter');
  await page.waitForFunction(name=>document.querySelector('.detail h1, .detail-panel h1')?.textContent===name,people[n.personId].name.primary);
  assert.ok(page.url().endsWith(encodeURIComponent(n.personId)));
  // Exercise the two other native-anchor surfaces for the same explicit pair.
  const outgoing=(p.relations||[]).some(r=>r.personId===n.personId);
  const incoming=(people[n.personId].relations||[]).some(r=>r.personId===p.id);
  const targetHref=`#/browse/${encodeURIComponent(n.personId)}`;
  if(outgoing){
   await open(p);
   const anchor=page.locator(`.relations-list a[href="${targetHref}"]`).first();
   await anchor.focus();await anchor.press('Enter');
   await page.waitForFunction(name=>document.querySelector('.detail h1, .detail-panel h1')?.textContent===name,people[n.personId].name.primary);
  }
  if(outgoing||incoming){
   await open(p);await page.locator('.detail-bar').getByRole('button',{name:'Show in graph',exact:true}).click();
   await page.locator('.graph-modes').getByRole('button',{name:'All',exact:true}).click();
   const neighbor=page.locator(`a.graph-focus-neighbor[href="${targetHref}"]`).first();
   await neighbor.focus();await neighbor.press('Enter');
   await page.waitForFunction(name=>document.querySelector('.detail h1, .detail-panel h1')?.textContent===name,people[n.personId].name.primary);
  }
 }
 let accountCount=0;
 for(const p of accountPeople){
  await page.goto('about:blank');
  console.log(`counterpart UI: accounts for ${p.id}`);
  await open(p);
  const select=page.locator('.lineage-account').getByRole('combobox',{name:`Parentage account for ${p.name.primary}`,exact:true});
  await select.waitFor({state:'visible'});
  for(const a of p.parentageAccounts){
   await select.selectOption(a.id);
   // A selection schedules React state/layout work. Observe the selected value,
   // its enclosing evidence panel and the tree in one committed DOM snapshot.
   // Do not compose a document-scoped role locator inside a scoped `has` filter.
   await page.waitForFunction(accountSelectionReady, {
    label:`Parentage account for ${p.name.primary}`, accountId:a.id,
    parents:a.parents.map(r=>people[r.personId].name.primary),
    sources:a.sources.map(s=>s.reference),
   });
   accountCount++;
  }
 }
 console.log(`counterpart UI: ${targets.length} keyboard navigations and ${accountCount} account selections passed`);
 return {targetCount,accountCount};
}
function nameLinkLocator(page,value){
 return page.locator('.section-names').getByRole('link',{name:value,exact:true});
}
async function verifyNameProbeFixture(page){
 const context=await page.context().browser().newContext();
 const fixture=await context.newPage();
 try{
  await fixture.setContent('<section class="section-names"><a class="name-rec-value" href="#N1">Shared label</a><a class="name-rec-value" href="#N2">Shared label (regional)</a><span class="name-rec-value">Ordinary alias</span></section>');
  for(const [label,target] of [['Shared label','#N1'],['Shared label (regional)','#N2']]){
   const a=nameLinkLocator(fixture,label);assert.equal(await a.count(),1);
   assert.equal(await a.getAttribute('href'),target);await a.focus();await a.press('Enter');
   assert.ok(fixture.url().endsWith(target));
  }
  assert.equal(await nameLinkLocator(fixture,'Ordinary alias').count(),0);
 }finally{await context.close();}
}
function accountSelectionReady(expected, doc = document) {
 const controls=Array.from(doc.querySelectorAll('select')).filter(s=>s.getAttribute('aria-label')===expected.label);
 if(controls.length!==1 || controls[0].value!==expected.accountId)return false;
 const panel=controls[0].closest('.lineage-account');
 const canvas=doc.querySelector('.lineage-canvas');
 if(!panel || !canvas)return false;
 const cards=Array.from(canvas.querySelectorAll('.lineage-card-name')).map(n=>n.textContent);
 return expected.parents.every(name=>cards.includes(name)) && expected.sources.every(reference=>panel.textContent.includes(reference));
}

// Select by graph structure, never by a privileged figure or tradition.
function deepestClaimedLineage(people, options={}) {
 const {projectAccountModel}=require('../app/account-model.js');
 const records=new Map(Object.entries(people));
 let deepest=null;
 for(const person of Object.values(people))for(const account of person.parentageAccounts||[]){
  if(account.kind!=='claimed-genealogy'||!account.lineageGroup)continue;
  const model=projectAccountModel(records,{[person.id]:account.id},options);
  const seen=new Set([person.id]);let frontier=[person.id],depth=0;
  for(;;){
   const next=[];
   for(const id of frontier)for(const pid of model.byId.get(id)?.parentIds||[]){
    if(model.byId.has(pid)&&!seen.has(pid)){seen.add(pid);next.push(pid);}
   }
   if(!next.length)break;
   frontier=next;depth++;
  }
  if(!deepest||depth>deepest.depth)deepest={person,account,depth,endpoints:frontier,info:model.divinityInfo(person)};
 }
 assert.ok(deepest&&deepest.depth>2,'a grouped claimed pedigree must exercise ancestry beyond the initial depth');
 return deepest;
}

async function verifyGroupedLineageUI(page,base,people,options={}){
 const {projectAccountModel}=require('../app/account-model.js');
 const chosen=deepestClaimedLineage(people,options),{person,account}=chosen;
 const baseline=projectAccountModel(people,{},options).divinityInfo(person);
 const errors=[],corpusRequests=[];
 const onError=error=>errors.push(String(error));
 const onRequest=request=>{if(/\/data\/corpus(?:[-.]|\/)/.test(request.url()))corpusRequests.push(request.url());};
 page.on('pageerror',onError);page.on('request',onRequest);
 const checkBounds=async()=>assert.equal(await page.evaluate(()=>
  document.documentElement.scrollWidth>window.innerWidth+1||document.body.scrollWidth>window.innerWidth+1),false,'profile must not overflow the viewport; tree scrolling stays inside its own container');
 const waitState=async(accountId,info)=>page.waitForFunction(expected=>{
  const select=Array.from(document.querySelectorAll('.lineage-account select')).find(s=>s.getAttribute('aria-label')===expected.label);
  const headline=document.querySelector('.descent-frac'),tier=document.querySelector('.eyebrow-tier');
  if(!select||select.value!==expected.accountId||!headline||!tier)return false;
  const type=expected.accountId?expected.info.tier:expected.authoredType;
  const label=window.TYPE_TIER?.[type]?.label||type||(expected.info.hasDivineAncestry?(expected.info.claimed?'Claimed divine ancestry':'Divine ancestry'):'Ancestry unresolved');
  return tier.textContent===label&&headline.textContent===(expected.info.fraction==null?'Unquantified':window.fmtFraction(expected.info.fraction));
 },{label:`Parentage account for ${person.name.primary}`,accountId,info,authoredType:person.type});
 try{
  for(const width of [1400,390]){
   await page.goto('about:blank');await page.setViewportSize({width,height:900});
   await page.goto(`${base}#/browse/${encodeURIComponent(person.id)}`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(name=>document.querySelector('.detail h1')?.textContent===name&&window.__PR?.tierReady?.edges!==false,person.name.primary);
   const select=page.getByRole('combobox',{name:`Parentage account for ${person.name.primary}`,exact:true});
   await select.waitFor({state:'visible'});await waitState('',baseline);await checkBounds();
   const shortcut=page.locator('.detail-header').getByRole('button',{name:account.label,exact:true});
   await shortcut.click();await waitState(account.id,chosen.info);
   await page.waitForFunction(accountSelectionReady,{
    label:`Parentage account for ${person.name.primary}`,accountId:account.id,
    parents:account.parents.map(r=>people[r.personId].name.primary),sources:account.sources.map(s=>s.reference),
   });
   assert.equal(await page.locator('.lineage-controls .lineage-step').first().locator('span').innerText(),'2↑','group selection preserves bounded initial depth');
   if(chosen.info.fraction==null)assert.match(await page.locator('.section-descent').innerText(),/missing parents are not assumed mortal/);
   await checkBounds();
   await page.getByRole('button',{name:'Show all ancestors',exact:true}).click();
   await page.waitForFunction(expected=>{
    const names=Array.from(document.querySelectorAll('.lineage-card-name')).map(n=>n.textContent);
    const depth=document.querySelector('.lineage-controls .lineage-step span')?.textContent;
    return depth===`${expected.depth}↑`&&expected.names.every(name=>names.includes(name));
   },{depth:chosen.depth,names:chosen.endpoints.map(id=>people[id].name.primary)});
   assert.equal(await page.getByRole('button',{name:'More ancestor generations',exact:true}).isDisabled(),true);
   await checkBounds();
   const alternative=person.parentageAccounts.find(a=>a.id!==account.id);
   if(alternative){
    await select.selectOption(alternative.id);
    await waitState(alternative.id,projectAccountModel(people,{[person.id]:alternative.id},options).divinityInfo(person));
   }
   await select.selectOption('');await waitState('',baseline);
   const parents=await page.locator('.parentage .who-name').allTextContents();
   assert.deepEqual(parents,(person.parentIds||[]).map(id=>people[id]?.name.primary||id),'default selection restores the recorded parents');
   assert.match(await page.locator('.detail .eyebrow').innerText(),/recorded classification/);
   await checkBounds();
   console.log(`grouped lineage UI: ${width}px, ${chosen.depth} ancestor generations, account switching and default restoration passed`);
  }
  assert.deepEqual(corpusRequests,[],'grouped ancestry must not fetch the full corpus');
  assert.deepEqual(errors,[],'grouped ancestry must not produce browser exceptions');
 }finally{page.off('pageerror',onError);page.off('request',onRequest);}
 return {depth:chosen.depth,viewports:2};
}
module.exports={verifyCounterpartUI,accountSelectionReady,partitionCases,deepestClaimedLineage,verifyGroupedLineageUI};
