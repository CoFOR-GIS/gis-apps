// Start-screen smoke test at 1280 px and 390 px (real page, real CDN if reachable).
// Run: node LUAEditor/tests/smoke.test.js   (needs playwright as for ui.test.js)
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();
 for(const w of [1280,390]){
  const p=await b.newPage({viewport:{width:w,height:800}});const errs=[];
  p.on('pageerror',e=>errs.push('pageerror '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
  await p.goto('file://'+require('path').join(__dirname,'..','index.html'),{waitUntil:'load',timeout:60000}).catch(e=>errs.push('goto '+e.message));
  await p.waitForTimeout(1500);
  console.log(w,'gate:',await p.textContent('#gateMsg'));
  console.log(w,'favicon:',await p.$eval('link[rel=icon]',l=>l.href),'logo loaded:',await p.$eval('.gate img',i=>i.naturalWidth>0));
  console.log(w,'hscroll:',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    console.log(w,'errors:',errs.filter(e=>!/fonts|js.arcgis/.test(e)));
 }
 await b.close();
})();
