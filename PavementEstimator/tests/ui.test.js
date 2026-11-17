// Browser flow test against a MOCKED ArcGIS SDK (mock-sdk.js) - no network, no sign-in, fake data only.
// Run: node PavementEstimator/tests/ui.test.js   (needs: npm i playwright and npx playwright install chromium)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),os=require('os');const D=__dirname;
const html=fs.readFileSync(path.join(D,'..','index.html'),'utf8');
async function open(b,editor,width){
 const ctx=await b.newContext({acceptDownloads:true,viewport:{width:width||1400,height:860}});const p=await ctx.newPage();
 p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
 await ctx.route('**/*',r=>{const u=r.request().url();
  if(u.endsWith('/logo.svg'))return r.fulfill({path:path.join(D,'..','logo.svg')});
  if(u.startsWith('http://test.local/'))return r.fulfill({body:html.replace('<script src="https://js.arcgis.com/4.31/"></script>','<script>window.MOCK_EDITOR='+editor+'</script><script src="https://js.arcgis.com/4.31/"></script>'),contentType:'text/html'});
  if(u.startsWith('https://js.arcgis.com/4.31/')&&!u.endsWith('.css'))return r.fulfill({path:path.join(D,'mock-sdk.js'),contentType:'application/javascript'});
  return r.abort()});
 await p.goto('http://test.local/PavementEstimator/');await p.waitForTimeout(600);return p}
(async()=>{
 const b=await chromium.launch();let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('FAIL',n))};
 const p=await open(b,true);
 t('gate hidden',await p.$eval('#gate',g=>g.style.display==='none'));
 t('who',(await p.textContent('#who'))==='Ernie Martz');
 t('snapshot meta',(await p.textContent('#snapMeta')).includes('FAKE-SNAP'));
 t('4 planned tasks listed',(await p.$$('#list input[data-k]')).length===4);
 await p.selectOption('#fYear','2026');t('year filter',(await p.$$('#list input[data-k]')).length===2);
 await p.selectOption('#fYear','');await p.fill('#fText','elm');t('text filter',(await p.$$('#list input[data-k]')).length===2);
 await p.fill('#fText','');
 // add Oak Ln micro seal: 1000 SY x 6.77
 await p.check('#list input[data-k="CG-1"]');await p.waitForTimeout(100);
 t('line added',(await p.$$('#lines .ln')).length===1);
 t('total 6770',(await p.textContent('#total'))==='$6,770.00');
 t('snapshot tag',(await p.textContent('#lines')).includes('snapshot'));
 t('OCI guidance',(await p.textContent('#lines')).includes('Protocol trigger OCI 65–75'));
 // polygon basis
 await p.selectOption('select[data-basis="CG-1"]','polygon');await p.waitForTimeout(50);
 t('polygon total 5416',(await p.textContent('#total'))==='$5,416.00');
 // Elm Dr: no polygon option; Pine Ct: no Cartegraph SY -> unpriced; Liquid Pavement pending -> unpriced
 await p.click('#addShown');await p.waitForTimeout(100);
 t('4 lines',(await p.$$('#lines .ln')).length===4);
 t('no polygon option without polygon',(await p.$$('select[data-basis="CG-2"] option')).length===1);
 const txt=await p.textContent('#lines');
 t('pine unpriced reason',txt.includes('No Cartegraph square yards'));
 t('pending rate reason',txt.includes('Rate is Pending Legacy'));
 t('total = 5416 + 2000*0.85',(await p.textContent('#total'))==='$7,116.00');
 t('note counts unpriced',(await p.textContent('#totNote')).includes('2 unpriced'));
 // change activity on Elm fog seal -> chip seal 2000*2.9
 await p.selectOption('select[data-act="CG-2"]','FOR - Chip Seal');await p.waitForTimeout(50);
 t('activity change reprices',(await p.textContent('#total'))==='$11,216.00');
 t('planned-as note',(await p.textContent('#lines')).includes('planned as FOR - Fog Seal (In House)'));
 // map click on segment 103 removes its task
 await p.evaluate(()=>__click({oid:3}));await p.waitForTimeout(150);
 t('map click toggles segment tasks',(await p.$$('#lines .ln')).length===3);
 // rates modal + override
 await p.click('#ratesBtn');
 t('rates modal',await p.$eval('#rates',e=>e.style.display==='flex'));
 t('editor form shown',await p.$eval('#ovrForm',e=>e.style.display!=='none'));
 t('approver default',(await p.inputValue('#oAppr'))==='Ernie Martz');
 await p.selectOption('#oAct','FOR - Micro Seal');await p.fill('#oRate','7.10');await p.fill('#oWhy','');
 await p.click('#oSave');await p.waitForTimeout(100);
 t('reason required',(await p.textContent('#oErr')).includes('Reason'));
 t('nothing sent',(await p.evaluate(()=>EDITS.length))===0);
 await p.fill('#oWhy','2027 bid tab, Micro Seal unit price');await p.click('#oSave');await p.waitForTimeout(300);
 const ed=await p.evaluate(()=>EDITS[0]);const a=ed&&ed.addFeatures&&ed.addFeatures[0].attributes;
 t('override add payload',a&&a.Activity==='FOR - Micro Seal'&&a.Override_Rate_Per_SY===7.1&&a.Base_Rate_Per_SY===6.77&&a.Base_Snapshot_ID==='FAKE-SNAP'&&a.Status==='Active'&&a.Approver==='Ernie Martz'&&a.End_Date===null&&typeof a.Effective_Date==='number');
 t('no delete ever',(await p.evaluate(()=>EDITS.every(e=>!e.deleteFeatures))));
 t('override shown in table',(await p.textContent('#ratesTable')).includes('$7.10'));
 await p.click('#ratesClose');
 t('estimate repriced with override 800*7.10',(await p.textContent('#total'))==='$11,480.00');
 t('override tag on line',(await p.textContent('#lines')).includes('override'));
 // export
 const dl=p.waitForEvent('download');await p.click('#exportBtn');const d=await dl;
 const csv=fs.readFileSync(await d.path(),'utf8');
 t('csv name',/^PavementEstimate_\d{8}-\d{6}\.csv$/.test(d.suggestedFilename()));
 t('csv snapshot',csv.includes('FAKE-SNAP'));
 t('csv override traced',csv.includes('Override,FAKE-SNAP,6.77,1,Ernie Martz,"2027 bid tab, Micro Seal unit price"'));
 t('csv unpriced note',csv.includes('Rate is Pending Legacy - left out of the total'));
 t('csv total',csv.includes(',11480,'));
 // retire
 await p.click('#ratesBtn');await p.click('[data-retire="1"]');await p.waitForTimeout(300);
 const up=await p.evaluate(()=>EDITS[1]&&EDITS[1].updateFeatures&&EDITS[1].updateFeatures[0].attributes);
 t('retire payload',up&&up.OBJECTID===1&&up.Status==='Retired'&&typeof up.End_Date==='number'&&Object.keys(up).length===3);
 await p.click('#ratesClose');
 t('back to snapshot after retire',(await p.textContent('#total'))==='$11,216.00');
 t('no page errors (editor)',p.errs.length===0);if(p.errs.length)console.log(p.errs);
 // non-editor
 const q=await open(b,false);
 t('non-editor loads',await q.$eval('#gate',g=>g.style.display==='none'));
 await q.click('#ratesBtn');
 t('non-editor: no override form',await q.$eval('#ovrForm',e=>e.style.display==='none'));
 t('non-editor: read only text',(await q.textContent('#ratesMeta')).includes('Read only'));
 t('non-editor: no retire buttons',(await q.$$('[data-retire]')).length===0);
 t('no page errors (reader)',q.errs.length===0);if(q.errs.length)console.log(q.errs);
 // phone width
 const m=await open(b,true,390);await m.check('#list input[data-k="CG-1"]');
 await m.screenshot({path:path.join(os.tmpdir(),'PavementEstimator_390.png'),fullPage:true});
 t('phone: no horizontal overflow',await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 await p.screenshot({path:path.join(os.tmpdir(),'PavementEstimator_1400.png')});
 await b.close();console.log(ok+' passed, '+bad+' failed');process.exit(bad?1:0)})();
