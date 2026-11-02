// Browser flow test against a MOCKED ArcGIS SDK (mock-sdk.js) - no network, no sign-in, fake parcels only.
// Run: node LUAEditor/tests/ui.test.js   (needs: npm i playwright  and  npx playwright install chromium)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');const D=__dirname;
const html=fs.readFileSync(path.join(D,'..','index.html'),'utf8');
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({acceptDownloads:true});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{console.log('dialog:',d.message());d.accept()});
 await ctx.route('**/*',r=>{const u=r.request().url();
  if(u.startsWith('http://test.local/LUAEditor/logo.svg'))return r.fulfill({path:path.join(D,'..','logo.svg')});
  if(u.startsWith('http://test.local/'))return r.fulfill({body:html,contentType:'text/html'});
  if(u.startsWith('https://js.arcgis.com/4.31/')&&!u.endsWith('.css'))return r.fulfill({path:path.join(D,'mock-sdk.js'),contentType:'application/javascript'});
  return r.abort()});
 await p.goto('http://test.local/LUAEditor/');await p.waitForTimeout(500);
 let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('FAIL',n))};
 t('gate hidden',await p.$eval('#gate',g=>g.style.display==='none'));
 t('who',(await p.textContent('#who'))==='Ernie Martz');
 t('no warnbar',await p.$eval('#warnbar',w=>w.style.display!=='block'));
 t('outFields exclude ImprovedValue',await p.evaluate(()=>!__layer.outFields.includes('ImprovedValue')&&__layer.outFields.includes('Private_Well')));
 // search single -> opens
 await p.fill('#q','123');await p.click('#qBtn');await p.waitForTimeout(200);
 t('panel open',await p.$eval('#panel',e=>e.classList.contains('open')));
 t('title',(await p.textContent('#pTitle'))==='123 MAIN ST');
 t('ro shows subdivision',(await p.textContent('#ro')).includes('Oak Hills'));
 t('acres 2 decimals',(await p.textContent('#ro')).includes('110.81')&&!(await p.textContent('#ro')).includes('110.8136'));
 t('zoom to padded extent',(await p.evaluate(()=>window.GOTO&&window.GOTO.expanded))===1.5);
 // Cowork fix 3: clearing water warns, Save locked until acknowledged, then nothing saved on Back
 await p.fill('#f_Num__of_Connections_Water','');await p.click('#saveBtn');await p.waitForTimeout(200);
 t('clear water warning shown',(await p.textContent('#sumBody')).includes('Water connections will be cleared'));
 t('save locked until ack',await p.$eval('#sumOk',b=>b.disabled));
 await p.check('#ackW');t('save enabled after ack',!(await p.$eval('#sumOk',b=>b.disabled)));
 await p.click('#sumCancel');await p.click('#cancelBtn');await p.waitForTimeout(100);
 t('no edit sent',(await p.evaluate(()=>EDITS.length))===0);
 t('basis hidden',await p.$eval('.f[data-k="Private_Well_Basis"]',e=>e.classList.contains('hide')));
 // FORU + water + Yes -> blocked
 await p.selectOption('#f_Private_Well','Yes');
 t('basis shown',await p.$eval('.f[data-k="Private_Well_Basis"]',e=>!e.classList.contains('hide')));
 await p.selectOption('#f_Private_Well_Basis','Meter analysis');
 await p.click('#saveBtn');await p.waitForTimeout(200);
 t('foru blocked msg',(await p.textContent('#errBox')).includes('FORU'));
 t('no edits sent',(await p.evaluate(()=>EDITS.length))===0);
 // fix: water 0 -> summary -> save
 await p.fill('#f_Num__of_Connections_Water','0');
 await p.click('#saveBtn');await p.waitForTimeout(200);
 t('summary open',await p.$eval('#sum',e=>e.style.display==='flex'));
 const sumTxt=await p.textContent('#sumBody');t('summary rows',sumTxt.includes('Water connections')&&sumTxt.includes('Meter analysis'));
 const dl=p.waitForEvent('download');await p.click('#sumOk');const d=await dl;
 const csvp=await d.path();const csv=fs.readFileSync(csvp,'utf8');
 t('csv name',/^LUAEditor_save_\d{8}-\d{6}\.csv$/.test(d.suggestedFilename()));
 t('csv rows',csv.includes('Private_Well,,Yes,saved')&&csv.includes('LotUpdated'));
 const e1=await p.evaluate(()=>EDITS[0]);
 t('payload keys',JSON.stringify(Object.keys(e1).sort())===JSON.stringify(['LotUpdated','Num__of_Connections_Water','OBJECTID','Private_Well','Private_Well_Basis']));
 await p.waitForTimeout(200);t('toast saved',(await p.textContent('#msg')).includes('1 of 1 parcel saved'));
 // stale: change server copy, then edit
 await p.fill('#f_MasterWater','3');
 await p.evaluate(()=>{STORE[1].EditDate=99999});
 await p.click('#saveBtn');await p.waitForTimeout(150);await p.click('#sumOk');await p.waitForTimeout(300);
 t('stale refused',(await p.textContent('#msg')).includes('changed since'));
 t('still 1 edit',(await p.evaluate(()=>EDITS.length))===1);
 // batch: select both via checkboxes
 await p.fill('#q','MAIN');await p.click('#qBtn');await p.waitForTimeout(200);
 for(const o of [1,2]){const l=p.locator('#list input[data-oid="'+o+'"]');if(!(await l.isChecked()))await l.check();await p.waitForTimeout(100)}
 await p.waitForTimeout(200);
 t('batch mode',(await p.textContent('#pTitle'))==='2 parcels selected');
 t('address hidden in batch',!(await p.$('#f_ADDRESS')));
 await p.check('.tick[data-k="MasterWastewater"]');await p.fill('#f_MasterWastewater','4');
 await p.click('#saveBtn');await p.waitForTimeout(200);
 const dl2=p.waitForEvent('download');await p.click('#sumOk');await dl2;await p.waitForTimeout(300);
 const last=await p.evaluate(()=>EDITS.slice(1));
 t('batch 2 edits',last.length===2&&last.every(a=>a.MasterWastewater===4&&Object.keys(a).length===3));
 // batch Yes refused when one parcel fails (parcel 1 FORU... now water 0, so make parcel 2 sewer 1 + LUA FORU)
 await p.evaluate(()=>{STORE[2].LUA='FORU';STORE[2].Num__of_Connections_Sewer=1});
 await p.fill('#q','MAIN');await p.click('#qBtn');await p.waitForTimeout(200);
 // reselect fresh copies
 await p.click('#list button[data-oid="1"]');await p.waitForTimeout(100);await p.check('#list input[data-oid="2"]');await p.waitForTimeout(100);
 await p.check('.tick[data-k="Private_Well"]');await p.selectOption('#f_Private_Well','Yes');await p.selectOption('#f_Private_Well_Basis','Billing verified');
 await p.click('#saveBtn');await p.waitForTimeout(200);
 t('batch refused',(await p.textContent('#errBox')).includes('#2')&&(await p.evaluate(()=>EDITS.length))===3);
  console.log(ok+' passed, '+bad+' failed; page errors:',errs);process.exitCode=bad||errs.length?1:0;
 await b.close();
})();
