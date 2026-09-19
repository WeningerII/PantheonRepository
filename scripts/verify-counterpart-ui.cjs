// Browser regression checks over authored targets, without figure-specific selectors.
const assert = require('node:assert/strict');
async function verifyCounterpartUI(page, base, people) {
 const open = async p => { await page.goto(`${base}#/browse/${encodeURIComponent(p.id)}`); await page.waitForFunction(name => document.querySelector('.detail h1, .detail-panel h1')?.textContent === name, p.name.primary); };
 const targets = Object.values(people).flatMap(p => (p.nameLinks||[]).filter(n=>n.status==='resolved').map(n=>({p,n})));
 assert.ok(targets.length,'authored name targets must be exercised');
 for(const {p,n} of targets){
  await open(p);
  const a=page.locator('.section-names a.name-rec-value').filter({hasText:n.value});
  assert.equal(await a.count(),1);
  assert.equal(await a.getAttribute('href'),`#/browse/${encodeURIComponent(n.personId)}`);
  await a.focus();await a.press('Enter');
  await page.waitForFunction(name=>document.querySelector('.detail h1, .detail-panel h1')?.textContent===name,people[n.personId].name.primary);
  assert.ok(page.url().endsWith(encodeURIComponent(n.personId)));
 }
 let accountCount=0;
 for(const p of Object.values(people).filter(p=>p.parentageAccounts?.length)){
  await open(p);
  const select=page.getByRole('combobox',{name:`Parentage account for ${p.name.primary}`,exact:true});
  const accountPanel=page.locator('.lineage-account').filter({has:select});
  assert.equal(await accountPanel.count(),1,'exact account control must identify one panel');
  for(const a of p.parentageAccounts){
   await select.selectOption(a.id);
   const canvas=page.locator('.lineage-canvas');
   for(const r of a.parents)assert.ok((await canvas.innerText()).includes(people[r.personId].name.primary));
   const accountText=await accountPanel.innerText();
   for(const source of a.sources)assert.ok(accountText.includes(source.reference));
   accountCount++;
  }
 }
 console.log(`counterpart UI: ${targets.length} keyboard navigations and ${accountCount} account selections passed`);
}
module.exports={verifyCounterpartUI};
