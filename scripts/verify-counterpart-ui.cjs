// Browser regression checks over authored targets, without figure-specific selectors.
const assert = require('node:assert/strict');
async function verifyCounterpartUI(page, base, people) {
 await verifyNameProbeFixture(page);
 const open = async p => { await page.goto(`${base}#/browse/${encodeURIComponent(p.id)}`, {waitUntil:'domcontentloaded'}); await page.waitForFunction(name => document.querySelector('.detail h1, .detail-panel h1')?.textContent === name, p.name.primary); };
 const targets = Object.values(people).flatMap(p => (p.nameLinks||[]).filter(n=>['resolved','disputed'].includes(n.status)&&n.personId).map(n=>({p,n})));
 assert.ok(targets.length,'authored name targets must be exercised');
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
 for(const p of Object.values(people).filter(p=>p.parentageAccounts?.length)){
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
module.exports={verifyCounterpartUI,accountSelectionReady};
