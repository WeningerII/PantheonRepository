// Browser regression checks over authored targets, without figure-specific selectors.
const assert = require('node:assert/strict');
async function verifyCounterpartUI(page, base, people) {
 const open = async p => { await page.goto(`${base}#/browse/${encodeURIComponent(p.id)}`, {waitUntil:'domcontentloaded'}); await page.waitForFunction(name => document.querySelector('.detail h1, .detail-panel h1')?.textContent === name, p.name.primary); };
 const targets = Object.values(people).flatMap(p => (p.nameLinks||[]).filter(n=>['resolved','disputed'].includes(n.status)&&n.personId).map(n=>({p,n})));
 assert.ok(targets.length,'authored name targets must be exercised');
 let targetCount=0;
 console.log(`counterpart UI: starting ${targets.length} authored name targets`);
 for(const {p,n} of targets){
  // Each authored pair is an independent browser case; preserve all three
  // in-case navigation paths without accumulating prior Browse/graph state.
  await page.goto('about:blank');
  console.log(`counterpart UI: target ${targetCount+1}/${targets.length} ${p.id} -> ${n.personId}`);
  await open(p);
  const a=page.locator('.section-names a.name-rec-value').filter({hasText:n.value});
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
  targetCount++;
  if(targetCount%25===0)console.log(`counterpart UI: ${targetCount}/${targets.length} name targets passed`);
 }
 let accountCount=0;
 console.log('counterpart UI: starting all authored parentage accounts');
 for(const p of Object.values(people).filter(p=>p.parentageAccounts?.length)){
  await page.goto('about:blank');
  console.log(`counterpart UI: accounts for ${p.id}`);
  await open(p);
  const select=page.locator('.lineage-account').getByRole('combobox',{name:`Parentage account for ${p.name.primary}`,exact:true});
  await select.waitFor({state:'visible'});
  const accountPanel=page.locator('.lineage-account').filter({has:select});
  assert.equal(await accountPanel.count(),1,`exact account control must identify one panel for ${p.id}`);
  for(const a of p.parentageAccounts){
   await select.selectOption(a.id);
   const canvas=page.locator('.lineage-canvas');
   for(const r of a.parents)assert.ok((await canvas.innerText()).includes(people[r.personId].name.primary));
   const accountText=await accountPanel.innerText();
   for(const source of a.sources)assert.ok(accountText.includes(source.reference));
   accountCount++;
   if(accountCount%25===0)console.log(`counterpart UI: ${accountCount} account selections passed`);
  }
 }
 console.log(`counterpart UI: ${targets.length} keyboard navigations and ${accountCount} account selections passed`);
}
module.exports={verifyCounterpartUI};
