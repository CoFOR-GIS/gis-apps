// Offline tests for the RULES block in ../index.html (Node 18+, no packages). FAKE data only.
// Run: node PavementEstimator/tests/rules.test.js
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=html.split('/* RULES-START')[1].split('/* RULES-END */')[0].replace(/^[^\n]*\n/,'');
const R=new Function(block+';return PavRules;')();
let ok=0,bad=0;const t=(n,c)=>{if(c)ok++;else{bad++;console.log('FAIL',n)}};
const D=(y,m,d)=>Date.UTC(y,m-1,d,12);
const rows=[
 {Snapshot_ID:'S2026',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'Micro',Rate_Per_SY:6.77,Rate_Status:'Confirmed',OCI_From:65,OCI_Through:75,Skip_Years:2},
 {Snapshot_ID:'S2026',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'Chip',Rate_Per_SY:2.9,Rate_Status:'Confirmed'},
 {Snapshot_ID:'S2026',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'Odd',Rate_Per_SY:0.9,Rate_Status:'Pending Legacy'},
 {Snapshot_ID:'S2026',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'Blank',Rate_Per_SY:null,Rate_Status:'Confirmed'},
 {Snapshot_ID:'S2027',Snapshot_Date:D(2027,11,1),Effective_Date:D(2027,12,1),Activity:'Micro',Rate_Per_SY:7.5,Rate_Status:'Confirmed'}];
const T=D(2026,11,17);
const s=R.currentSnapshot(rows,T);
t('snapshot picks in-effect one',s&&s.id==='S2026');
t('future snapshot ignored until effective',R.currentSnapshot(rows,D(2027,12,1)).id==='S2027');
t('no snapshot before any effective date',R.currentSnapshot(rows,D(2026,1,1))===null);
t('snapshot rate',R.rateFor('Micro',s,[],T).rate===6.77&&R.rateFor('Micro',s,[],T).source==='Snapshot');
t('pending rate unavailable',R.rateFor('Odd',s,[],T).rate===null&&/Pending Legacy/.test(R.rateFor('Odd',s,[],T).why));
t('null rate unavailable',R.rateFor('Blank',s,[],T).rate===null);
t('missing activity unavailable',/Not in snapshot/.test(R.rateFor('Nope',s,[],T).why));
const ovs=[
 {OBJECTID:1,Activity:'Micro',Override_Rate_Per_SY:7.25,Effective_Date:D(2026,11,1),End_Date:null,Status:'Active',Approver:'A',Reason:'bid'},
 {OBJECTID:2,Activity:'Micro',Override_Rate_Per_SY:8,Effective_Date:D(2026,12,1),End_Date:null,Status:'Active',Approver:'A',Reason:'future'},
 {OBJECTID:3,Activity:'Chip',Override_Rate_Per_SY:3.1,Effective_Date:D(2026,10,1),End_Date:D(2026,11,1),Status:'Active',Approver:'A',Reason:'ended'},
 {OBJECTID:4,Activity:'Chip',Override_Rate_Per_SY:3.3,Effective_Date:D(2026,11,10),End_Date:null,Status:'Retired',Approver:'A',Reason:'retired'},
 {OBJECTID:5,Activity:'Odd',Override_Rate_Per_SY:1.25,Effective_Date:D(2026,11,1),End_Date:null,Status:'Active',Approver:'A',Reason:'staff'},
 {OBJECTID:6,Activity:'Micro',Override_Rate_Per_SY:7.4,Effective_Date:D(2026,11,1),End_Date:null,Status:'Active',Approver:'A',Reason:'same day later oid'}];
t('override applies',R.rateFor('Micro',s,ovs,T).source==='Override');
t('same effective date: higher OBJECTID wins',R.activeOverride(ovs,'Micro',T).OBJECTID===6);
t('future override not yet',R.activeOverride(ovs,'Micro',D(2026,11,30)).OBJECTID===6&&R.activeOverride(ovs,'Micro',D(2026,12,1)).OBJECTID===2);
t('ended override ignored',R.rateFor('Chip',s,ovs,T).source==='Snapshot');
t('retired override ignored',R.activeOverride(ovs,'Chip',T)===null);
t('override end date inclusive',R.activeOverride(ovs,'Chip',D(2026,11,1)).OBJECTID===3);
t('override prices an unavailable snapshot rate',R.rateFor('Odd',s,ovs,T).rate===1.25);
const L=(a,b,cg,poly)=>R.priceLine({activity:a,basis:b,cgSqYd:cg,polySqYd:poly},s,[],T);
t('cost cartegraph',L('Micro','cartegraph',1000,null).cost===6770);
t('cost polygon',L('Micro','polygon',1000,500).cost===3385);
t('polygon missing -> unpriced',L('Micro','polygon',1000,null).cost===null&&/polygon/.test(L('Micro','polygon',1000,null).why));
t('cartegraph missing -> unpriced',L('Micro','cartegraph',null,10).cost===null);
t('zero area -> unpriced',L('Micro','cartegraph',0,null).cost===null);
t('rounding to cents',L('Chip','cartegraph',333.333,null).cost===966.67);
t('unavailable rate -> unpriced',L('Odd','cartegraph',100,null).cost===null);
const tt=R.totals([{cost:10.1},{cost:null},{cost:5.2}]);
t('totals',tt.total===15.3&&tt.priced===2&&tt.unpriced===1);
const acts=['Micro','Chip'];
const ok1=R.checkOverride({activity:'Micro',rate:'$7.255',eff:'2026-11-17',end:'',approver:' Ernie ',reason:'2027 bid tab'},acts);
t('override valid',!ok1.errors.length&&ok1.value.rate===7.26&&ok1.value.eff===D(2026,11,17)&&ok1.value.end===null&&ok1.value.approver==='Ernie');
t('override needs reason',R.checkOverride({activity:'Micro',rate:'7',eff:'2026-11-17',approver:'E',reason:''},acts).errors.some(e=>/Reason/.test(e)));
t('override needs approver',R.checkOverride({activity:'Micro',rate:'7',eff:'2026-11-17',approver:' ',reason:'bid tab'},acts).errors.some(e=>/Approver/.test(e)));
t('override rate > 0',R.checkOverride({activity:'Micro',rate:'0',eff:'2026-11-17',approver:'E',reason:'bid tab'},acts).errors.length===1);
t('override rate text rejected',R.checkOverride({activity:'Micro',rate:'abc',eff:'2026-11-17',approver:'E',reason:'bid tab'},acts).errors.length===1);
t('override end before effective',R.checkOverride({activity:'Micro',rate:'7',eff:'2026-11-17',end:'2026-11-01',approver:'E',reason:'bid tab'},acts).errors.some(e=>/before/.test(e)));
t('override unknown activity',R.checkOverride({activity:'X',rate:'7',eff:'2026-11-17',approver:'E',reason:'bid tab'},acts).errors.length===1);
t('date round trip',R.ymd(R.fromInput('2026-03-01'))==='2026-03-01');
t('csv escapes formulas and quotes',R.csv([['=1+1','a,b','x"y']])==="'=1+1,\"a,b\",\"x\"\"y\"\r\n");
t('money',R.money(1234.5)==='$1,234.50'&&R.money(null)==='');
console.log(ok+' passed, '+bad+' failed');process.exit(bad?1:0);
