const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {accountSelectionReady:ready}=require('../scripts/verify-counterpart-ui.cjs');
const expected={label:'Parentage account for N0',accountId:'A1',parents:['N1'],sources:['Source 1']};
function document(){return new JSDOM(`<div class="lineage-account"><select aria-label="Parentage account for N0"><option value="A0">Default</option><option value="A1">Variant</option></select><p>Source 1</p></div><div class="lineage-canvas"><div class="lineage-card-name">N1</div></div>`).window.document;}
test('account probe waits for the selected value, exact parent cards and local citations together',()=>{
 const d=document();assert.equal(ready(expected,d),false);
 d.querySelector('select').value='A1';assert.equal(ready(expected,d),true);
 d.querySelector('.lineage-card-name').textContent='N10';assert.equal(ready(expected,d),false);
 d.querySelector('.lineage-card-name').textContent='N1';d.querySelector('p').remove();
 d.body.insertAdjacentHTML('beforeend','<p>Source 1</p>');assert.equal(ready(expected,d),false);
});
test('account probe preserves parentless accounts and rejects duplicate or detached controls',()=>{
 const d=document();d.querySelector('select').value='A1';
 const e={...expected,parents:[]};assert.equal(ready(e,d),true);
 d.body.append(d.querySelector('select').cloneNode(true));assert.equal(ready(e,d),false);
 d.querySelector('.lineage-account').remove();assert.equal(ready(e,d),false);
});
