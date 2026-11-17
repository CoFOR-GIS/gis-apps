// Browser flow test against a MOCKED ArcGIS SDK (mock-sdk.js) - no network, no sign-in, fake data only.
// Run: node PavementEstimator/tests/ui.test.js   (needs: npm i playwright and npx playwright install chromium)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),os=require('os');const D=__dirname;
const html=fs.readFileSync(path.join(D,'..','index.html'),'utf8');
async function open(b,{editor=true,width=1400,tourSeen=true}={}){
 const ctx=await b.newContext({acceptDownloads:true,viewport:{width,height:860}});const p=await ctx.newPage();
 p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
 const pre='<script>window.MOCK_EDITOR='+editor+';'+(tourSeen?"try{localStorage.setItem('cofor-pavest-tour-v1','seen')}catch(e){}":'')+'</script>';
 await ctx.route('**/*',r=>{const u=r.request().url();
  if(u.endsWith('/logo.svg'))return r.fulfill({path:path.join(D,'..','logo.svg')});
  if(u.startsWith('http://test.local/'))return r.fulfill({body:html.replace('<script src="https://js.arcgis.com/4.31/"></script>',pre+'<script src="https://js.arcgis.com/4.31/"></script>'),contentType:'text/html'});
  if(u.startsWith('https://js.arcgis.com/4.31/')&&!u.endsWith('.css'))return r.fulfill({path:path.join(D,'mock-sdk.js'),contentType:'application/javascript'});
  return r.abort()});
 await p.goto('http://test.local/PavementEstimator/');await p.waitForTimeout(800);return p}
const tot=p=>p.textContent('#total');
(async()=>{
 const b=await chromium.launch();let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('FAIL',n))};
 // first visit: guide opens by itself; walk all steps
 const g=await open(b,{tourSeen:false});
 t('guide opens on first visit',await g.$eval('#tourVeil',e=>e.style.display==='block'));
 t('guide step 1',(await g.textContent('#tourN'))==='1 of 7');
 for(let i=0;i<6;i++)await g.click('#tourNext');
 t('guide last step is Rates',(await g.textContent('#tourT'))==='Rates'&&(await g.textContent('#tourNext'))==='Done');
 await g.click('#tourNext');t('guide closes',await g.$eval('#tourVeil',e=>e.style.display==='none'));
 t('guide remembered',await g.evaluate(()=>localStorage.getItem('cofor-pavest-tour-v1')==='seen'));
 await g.click('#tourBtn');t('How it works reopens guide',await g.$eval('#tourVeil',e=>e.style.display==='block'));
 await g.keyboard.press('Escape');t('Escape closes guide',await g.$eval('#tourVeil',e=>e.style.display==='none'));
 // main flow
 const p=await open(b);
 t('guide not shown when seen',await p.$eval('#tourVeil',e=>e.style.display!=='block'));
 t('gate hidden',await p.$eval('#gate',x=>x.style.display==='none'));
 t('4 roads listed, sorted by street',JSON.stringify(await p.$$eval('#list .nm',n=>n.map(x=>x.textContent)))===JSON.stringify(['Elm Dr','Elm Dr','Oak Ln','Pine Ct']));
 t('list shows name + SY only',(await p.textContent('#list .row'))==='Elm Dr2,000 SY');
 t('no year groups in list',!(await p.textContent('#list')).match(/20\d\d/));
 await p.fill('#q','oak');t('search',(await p.$$('#list input[data-k]')).length===1);await p.fill('#q','');
 await p.check('#list input[data-k="101"]');await p.check('#list input[data-k="102"]');await p.waitForTimeout(50);
 t('2 cards',(await p.$$('#lines .card')).length===2);
 t('title count',(await p.textContent('#estTitle'))==='2 roads selected');
 t('highlight 2 roads',(await p.evaluate(()=>HL.slice().sort().join(',')))==='11,12');
 t('pending rate not offered',!(await p.$$eval('#bulkSel option',o=>o.map(x=>x.value))).includes('FOR - Liquid Pavement'));
 t('labels drop FOR prefix',(await p.$$eval('#bulkSel option',o=>o.map(x=>x.textContent))).includes('Fog Seal (In House)'));
 await p.selectOption('#bulkSel','FOR - Fog Seal (In House)');await p.click('#bulkBtn');await p.waitForTimeout(50);
 t('bulk add: 1000*0.85 + 2000*0.85',(await tot(p))==='$2,550.00');
 await p.selectOption('select[data-add="101"]','FOR - Rejuvenation');await p.waitForTimeout(50);
 t('second treatment on one road',(await p.$$('.card[data-k="101"] .tr')).length===2&&(await tot(p))==='$3,750.00');
 t('road subtotal',(await p.textContent('.card[data-k="101"] .sub'))==='Road subtotal$2,050.00');
 t('added treatment no longer offered on that road',!(await p.$$eval('select[data-add="101"] option',o=>o.map(x=>x.value))).includes('FOR - Rejuvenation'));
 t('OCI hover tip',(await p.getAttribute('.card[data-k="101"] .tr .n span','title')).includes('OCI 75–85'));
 // edit SY
 await p.fill('input[data-sy="102"]','1500');await p.press('input[data-sy="102"]','Tab');await p.waitForTimeout(50);
 t('edited SY marked',(await p.textContent('.card[data-k="102"]')).includes('edited'));
 t('edited SY priced',(await tot(p))==='$3,325.00');
 await p.click('[data-rs="102"]');await p.waitForTimeout(50);
 t('reset to Cartegraph',(await tot(p))==='$3,750.00'&&!(await p.textContent('.card[data-k="102"]')).includes('edited'));
 await p.fill('input[data-sy="102"]','abc');await p.press('input[data-sy="102"]','Tab');await p.waitForTimeout(50);
 t('bad SY refused',(await tot(p))==='$3,750.00');
 // remove a treatment
 await p.click('[data-rt="101|FOR - Rejuvenation"]');await p.waitForTimeout(50);
 t('remove treatment',(await tot(p))==='$2,550.00');
 // details hold the metadata
 t('details hold metadata',(await p.textContent('.card[data-k="101"] details')).includes('Last treatment: Chip Seal (2019)'));
 // Pine Ct has no Cartegraph SY: unpriced until an area is typed
 await p.evaluate(()=>__click({oid:13}));await p.waitForTimeout(80);
 await p.selectOption('select[data-add="103"]','FOR - Chip Seal');await p.waitForTimeout(50);
 t('no area -> left out',(await p.textContent('#totNote')).includes('1 without an area or rate left out')&&(await tot(p))==='$2,550.00');
 await p.fill('input[data-sy="103"]','100');await p.press('input[data-sy="103"]','Tab');await p.waitForTimeout(50);
 t('typed area prices it',(await tot(p))==='$2,840.00');
 await p.evaluate(()=>__click({oid:13}));await p.waitForTimeout(80);
 t('map click removes road',(await p.$$('#lines .card')).length===2&&(await tot(p))==='$2,550.00');
 await p.click('#list .nm[data-z="104"]');t('name click zooms',(await p.evaluate(()=>window.GOTO&&window.GOTO.expanded))===2);
 // rates: simple table, no status column
 await p.click('#ratesBtn');
 const head=await p.$$eval('#ratesTable th',h=>h.map(x=>x.textContent));
 t('rates columns simple',JSON.stringify(head)===JSON.stringify(['Treatment','$ per SY','']));
 t('rates omit pending',!(await p.textContent('#ratesTable')).includes('Liquid'));
 t('editor form',await p.$eval('#ovrForm',e=>e.style.display!=='none'));
 await p.selectOption('#oAct','FOR - Fog Seal (In House)');await p.fill('#oRate','0.95');await p.fill('#oWhy','');await p.click('#oSave');await p.waitForTimeout(80);
 t('reason required',(await p.textContent('#oErr')).includes('Reason')&&(await p.evaluate(()=>EDITS.length))===0);
 await p.fill('#oWhy','2027 bid, fog seal unit price');await p.click('#oSave');await p.waitForTimeout(300);
 const a=await p.evaluate(()=>EDITS[0].addFeatures[0].attributes);
 t('override payload',a.Activity==='FOR - Fog Seal (In House)'&&a.Override_Rate_Per_SY===0.95&&a.Base_Rate_Per_SY===0.85&&a.Base_Snapshot_ID==='FAKE-SNAP'&&a.Status==='Active'&&a.Approver==='Ernie Martz'&&a.End_Date===null);
 t('override shown',(await p.textContent('#ratesTable')).includes('override'));
 await p.click('#ratesClose');
 t('estimate repriced: 3000*0.95',(await tot(p))==='$2,850.00'&&(await p.textContent('#lines')).includes('override'));
 // export
 const dl=p.waitForEvent('download');await p.click('#exportBtn');const d=await dl;const csv=fs.readFileSync(await d.path(),'utf8');
 t('csv name',/^PavementEstimate_\d{8}-\d{6}\.csv$/.test(d.suggestedFilename()));
 t('csv full activity + override',csv.includes('Oak Ln,Oak Ln A,101,1000,Cartegraph calculated,1000,FOR - Fog Seal (In House),0.95,Override,FAKE-SNAP,0.85,1,Ernie Martz,"2027 bid, fog seal unit price"'));
 t('csv total',csv.includes('Total,,,,,,,,,,,,,,,2850'));
 // retire
 await p.click('#ratesBtn');await p.click('[data-retire="1"]');await p.waitForTimeout(300);
 const up=await p.evaluate(()=>EDITS[1].updateFeatures[0].attributes);
 t('retire payload',up.OBJECTID===1&&up.Status==='Retired'&&typeof up.End_Date==='number'&&Object.keys(up).length===3);
 await p.click('#ratesClose');t('back to Cartegraph rate',(await tot(p))==='$2,550.00');
 t('never deletes',await p.evaluate(()=>EDITS.every(e=>!e.deleteFeatures)));
 t('no page errors',p.errs.length===0);if(p.errs.length)console.log(p.errs);
 // non-editor
 const q=await open(b,{editor:false});await q.click('#ratesBtn');
 t('reader: no form',await q.$eval('#ovrForm',e=>e.style.display==='none'));
 t('reader: no retire',(await q.$$('[data-retire]')).length===0);
 t('reader: no errors',q.errs.length===0);
 // phone
 const m=await open(b,{width:390});await m.check('#list input[data-k="101"]');
 t('phone: no horizontal overflow',await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 await m.click('#tourBtn');await m.click('#tourNext');await m.waitForTimeout(350);
 t('phone: guide popover on screen',await m.$eval('#tourPop',e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}));
 await m.screenshot({path:path.join(os.tmpdir(),'PavementEstimator_390.png')});
 await p.screenshot({path:path.join(os.tmpdir(),'PavementEstimator_1400.png')});
 await g.click('#tourBtn');await g.click('#tourNext');await g.waitForTimeout(350);await g.screenshot({path:path.join(os.tmpdir(),'PavementEstimator_tour.png')});
 await b.close();console.log(ok+' passed, '+bad+' failed');process.exit(bad?1:0)})();
