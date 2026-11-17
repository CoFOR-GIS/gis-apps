// Offline tests for the RULES block in ../index.html (Node 18+, no packages). FAKE data only.
// Run: node PavementEstimator/tests/rules.test.js
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=html.split('/* RULES-START')[1].split('/* RULES-END */')[0].replace(/^[^\n]*\n/,'');
const R=new Function(block+';return PavRules;')();
let ok=0,bad=0;const t=(n,c)=>{if(c)ok++;else{bad++;console.log('FAIL',n)}};
const D=(y,m,d)=>Date.UTC(y,m-1,d,12);
const rows=[
 {Snapshot_ID:'S2026',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Micro Seal',Rate_Per_SY:6.77,Rate_Status:'Confirmed',OCI_From:65,OCI_Through:75,Skip_Years:2},
 {Snapshot_ID:'S2026',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Chip Seal',Rate_Per_SY:2.9,Rate_Status:'Confirmed'},
 {Snapshot_ID:'S2026',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Odd',Rate_Per_SY:0.9,Rate_Status:'Pending Legacy'},
 {Snapshot_ID:'S2026',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'Base Repair',Rate_Per_SY:103.5,Rate_Status:'Confirmed'},
 {Snapshot_ID:'S2026',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Blank',Rate_Per_SY:null,Rate_Status:'Confirmed'},
 {Snapshot_ID:'S2027',Snapshot_Date:D(2027,11,1),Effective_Date:D(2027,12,1),Activity:'FOR - Micro Seal',Rate_Per_SY:7.5,Rate_Status:'Confirmed'}];
const T=D(2026,11,17);
const s=R.currentSnapshot(rows,T);
t('snapshot in effect',s&&s.id==='S2026');
t('future snapshot after its date',R.currentSnapshot(rows,D(2027,12,1)).id==='S2027');
t('no snapshot before any date',R.currentSnapshot(rows,D(2026,1,1))===null);
t('label drops FOR prefix',R.label('FOR - Micro Seal')==='Micro Seal'&&R.label('Base Repair')==='Base Repair');
t('treatments = confirmed only, sorted by label',JSON.stringify(R.treatments(s,[],T))===JSON.stringify(['Base Repair','FOR - Chip Seal','FOR - Micro Seal']));
const ovs=[
 {OBJECTID:1,Activity:'FOR - Micro Seal',Override_Rate_Per_SY:7.25,Effective_Date:D(2026,11,1),End_Date:null,Status:'Active',Approver:'A',Reason:'bid'},
 {OBJECTID:2,Activity:'FOR - Micro Seal',Override_Rate_Per_SY:8,Effective_Date:D(2026,12,1),End_Date:null,Status:'Active',Approver:'A',Reason:'future'},
 {OBJECTID:3,Activity:'FOR - Chip Seal',Override_Rate_Per_SY:3.1,Effective_Date:D(2026,10,1),End_Date:D(2026,11,1),Status:'Active',Approver:'A',Reason:'ended'},
 {OBJECTID:4,Activity:'FOR - Chip Seal',Override_Rate_Per_SY:3.3,Effective_Date:D(2026,11,10),End_Date:null,Status:'Retired',Approver:'A',Reason:'retired'},
 {OBJECTID:5,Activity:'FOR - Odd',Override_Rate_Per_SY:1.25,Effective_Date:D(2026,11,1),End_Date:null,Status:'Active',Approver:'A',Reason:'staff'},
 {OBJECTID:6,Activity:'FOR - Micro Seal',Override_Rate_Per_SY:7.4,Effective_Date:D(2026,11,1),End_Date:null,Status:'Active',Approver:'A',Reason:'later oid'}];
t('override applies',R.rateFor('FOR - Micro Seal',s,ovs,T).source==='Override'&&R.rateFor('FOR - Micro Seal',s,ovs,T).rate===7.4);
t('same date: higher OBJECTID wins',R.activeOverride(ovs,'FOR - Micro Seal',T).OBJECTID===6);
t('future override waits',R.activeOverride(ovs,'FOR - Micro Seal',D(2026,12,1)).OBJECTID===2);
t('ended override ignored',R.rateFor('FOR - Chip Seal',s,ovs,T).source==='Snapshot');
t('retired override ignored',R.activeOverride(ovs,'FOR - Chip Seal',T)===null);
t('end date inclusive',R.activeOverride(ovs,'FOR - Chip Seal',D(2026,11,1)).OBJECTID===3);
t('override makes a pending rate offered',R.treatments(s,ovs,T).includes('FOR - Odd'));
t('missing activity has no rate',R.rateFor('X',s,[],T).rate===null);
t('roadSy cartegraph',R.roadSy({cgSy:1000,syEdit:null})===1000);
t('roadSy edited wins',R.roadSy({cgSy:1000,syEdit:'1,250'})===1250);
// several treatments per road, several roads
const roads=[{key:'101',cgSy:1000,syEdit:null,treatments:['FOR - Micro Seal','FOR - Chip Seal']},
             {key:'102',cgSy:2000,syEdit:500,treatments:['Base Repair']},
             {key:'103',cgSy:null,syEdit:null,treatments:['FOR - Chip Seal']},
             {key:'104',cgSy:300,syEdit:null,treatments:['FOR - Odd']},
             {key:'105',cgSy:300,syEdit:null,treatments:[]}];
const P=R.price(roads,s,[],T);
t('road 1 two treatments',P.roads[0].items.length===2&&P.roads[0].subtotal===9670);
t('road 2 edited SY used',P.roads[1].edited&&P.roads[1].subtotal===51750);
t('road 3 no area -> unpriced',P.roads[2].items[0].cost===null&&P.roads[2].subtotal===0);
t('road 4 pending rate -> unpriced',P.roads[3].items[0].cost===null);
t('road 5 no treatments',P.roads[4].items.length===0&&P.roads[4].subtotal===0);
t('total and counts',P.total===61420&&P.items===3&&P.missing===2);
t('rounding to cents',R.price([{key:'a',cgSy:333.333,treatments:['FOR - Chip Seal']}],s,[],T).total===966.67);
t('override priced',R.price([{key:'a',cgSy:100,treatments:['FOR - Micro Seal']}],s,ovs,T).total===740);
t('oci tip',R.ociTip(s.rates.get('FOR - Micro Seal')).includes('OCI 65–75')&&R.ociTip(s.rates.get('FOR - Chip Seal'))==='');
const acts=['FOR - Micro Seal','FOR - Chip Seal'];
const ok1=R.checkOverride({activity:'FOR - Micro Seal',rate:'$7.255',eff:'2026-11-17',end:'',approver:' Ernie ',reason:'2027 bid tab'},acts);
t('override valid',!ok1.errors.length&&ok1.value.rate===7.26&&ok1.value.eff===D(2026,11,17)&&ok1.value.end===null&&ok1.value.approver==='Ernie');
t('override needs reason',R.checkOverride({activity:'FOR - Micro Seal',rate:'7',eff:'2026-11-17',approver:'E',reason:''},acts).errors.some(e=>/Reason/.test(e)));
t('override needs approver',R.checkOverride({activity:'FOR - Micro Seal',rate:'7',eff:'2026-11-17',approver:' ',reason:'bid tab'},acts).errors.some(e=>/Approver/.test(e)));
t('override rate > 0',R.checkOverride({activity:'FOR - Micro Seal',rate:'0',eff:'2026-11-17',approver:'E',reason:'bid tab'},acts).errors.length===1);
t('override end before effective',R.checkOverride({activity:'FOR - Micro Seal',rate:'7',eff:'2026-11-17',end:'2026-11-01',approver:'E',reason:'bid tab'},acts).errors.some(e=>/before/.test(e)));
t('override unknown treatment',R.checkOverride({activity:'X',rate:'7',eff:'2026-11-17',approver:'E',reason:'bid tab'},acts).errors.length===1);
t('date round trip',R.ymd(R.fromInput('2026-03-01'))==='2026-03-01');
t('csv escapes',R.csv([['=1+1','a,b','x"y']])==="'=1+1,\"a,b\",\"x\"\"y\"\r\n");
t('money / sy format',R.money(1234.5)==='$1,234.50'&&R.sy(2853.5)==='2,854 SY'&&R.sy(null)==='—');
console.log(ok+' passed, '+bad+' failed');process.exit(bad?1:0);
