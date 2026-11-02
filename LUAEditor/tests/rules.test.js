// Offline test of the pure rules block (RULES-START..RULES-END) in ../index.html.
// Run: node LUAEditor/tests/rules.test.js   (Node 18+; no packages)
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||require('path').join(__dirname,'..','index.html'),'utf8');
const cfgSrc=src.match(/const CONFIG = \{[\s\S]*?\n\};/)[0];
const rules=src.split('/* RULES-START')[1].split('/* RULES-END */')[0].replace(/^[^\n]*\n/,'');
const {CONFIG,LUARules:R}=new Function(cfgSrc+'\n'+rules+'\nreturn{CONFIG,LUARules};')();
let pass=0,fail=0;const t=(n,c)=>{if(c)pass++;else{fail++;console.log('FAIL',n)}};
const ctx={domains:{LUA:['FORU','Private','SAWS'],textImproved:['Improved','Vacant']},addrMax:20};
const base={OBJECTID:1,ADDRESS:'123 MAIN ST',textImproved:'Improved',LUA:'FORU',Num__of_Connections_Water:1,Num__of_Connections_Sewer:0,MasterWater:null,MasterWastewater:null,Private_Well:null,Private_Well_Basis:null,PropID:'99',EditDate:5};
const P=(b,p)=>R.plan(CONFIG,b,p,ctx);
const ks=r=>Object.keys(r.changes).sort().join(',');
// 1 NULL kept: blank inputs on null fields -> no change
t('null kept',ks(P(base,{MasterWater:'',MasterWastewater:' ',Private_Well:''}))==='');
// 2 blank != 0
t('blank not 0',P({...base,MasterWater:0},{MasterWater:''}).changes.MasterWater===null);
t('0 not blank',P(base,{MasterWater:'0'}).changes.MasterWater===0);
// Cowork fix 3: clearing a count warns (allowed), blank->blank silent
t('clear water warns',(r=>r.changes.Num__of_Connections_Water===null&&r.errors.length===0&&r.warnings.some(w=>w.k==='Num__of_Connections_Water'))(P(base,{Num__of_Connections_Water:''})));
t('clear master warns',P({...base,MasterWater:3},{MasterWater:' '}).warnings.length===1);
t('blank to blank no warning',P(base,{MasterWater:''}).warnings.length===0);
t('0 to blank warns',P({...base,Num__of_Connections_Sewer:0},{Num__of_Connections_Sewer:''}).warnings.length===1);
// 3 int validation
t('neg int',P(base,{MasterWater:'-1'}).errors.length===1);
t('decimal',P(base,{MasterWater:'1.5'}).errors.length===1);
t('text int',P(base,{MasterWater:'abc'}).errors.length===1);
t('ok int',P(base,{MasterWater:'12'}).errors.length===0);
// 4 Yes without basis
const nf={...base,LUA:'Private',Num__of_Connections_Water:0};
t('yes no basis',P(nf,{Private_Well:'Yes'}).errors.some(e=>e.k==='Private_Well_Basis'));
t('yes bad basis',P(nf,{Private_Well:'Yes',Private_Well_Basis:'Guess'}).errors.some(e=>e.k==='Private_Well_Basis'));
// 5 FORU yes + water
const fo={...base,Num__of_Connections_Water:0,Num__of_Connections_Sewer:0};
t('foru yes water blocked',P(base,{Private_Well:'Yes',Private_Well_Basis:'Meter analysis'}).errors.some(e=>/FORU/.test(e.msg)));
t('foru yes sewer blocked',P({...fo,Num__of_Connections_Sewer:2},{Private_Well:'Yes',Private_Well_Basis:'Meter analysis'}).errors.some(e=>/FORU/.test(e.msg)));
t('foru yes clean ok',P(fo,{Private_Well:'Yes',Private_Well_Basis:'Meter analysis'}).errors.length===0);
t('adding water to foru yes blocked',P({...fo,Private_Well:'Yes',Private_Well_Basis:'Meter analysis'},{Num__of_Connections_Water:'1'}).errors.length===1);
t('legacy conflict on address edit = warning',(r=>r.errors.length===0&&r.warnings.length===1)(P({...base,Private_Well:'Yes',Private_Well_Basis:'Meter analysis'},{ADDRESS:'124 MAIN ST'})));
// 6 non-FORU yes warns
t('non-foru warns',(r=>r.errors.length===0&&r.warnings.some(w=>/not FORU/.test(w.msg)))(P(nf,{Private_Well:'Yes',Private_Well_Basis:'Owner reported'})));
// 7 No clears basis
const yes={...nf,Private_Well:'Yes',Private_Well_Basis:'Meter analysis'};
t('no clears basis',(r=>r.changes.Private_Well==='No'&&r.changes.Private_Well_Basis===null&&!r.errors.length)(P(yes,{Private_Well:'No'})));
t('no ignores proposed basis',P(nf,{Private_Well:'No',Private_Well_Basis:'Meter analysis'}).changes.Private_Well_Basis===undefined);
t('basis without yes blocked',P(nf,{Private_Well_Basis:'Meter analysis'}).errors.length===1);
t('pw cannot be blanked',P(yes,{Private_Well:''}).errors.some(e=>e.k==='Private_Well'));
// domains
t('domain bad',P(base,{LUA:'XYZ'}).errors.length===1);
t('domain blank',P(base,{LUA:''}).errors.length===1);
t('domain unchanged legacy ok',ks(P({...base,LUA:'OLD'},{LUA:'OLD'}))==='');
// address
t('addr upper auto',P(base,{ADDRESS:'125 main st'}).changes.ADDRESS==='125 MAIN ST');
t('addr mixed kept',P({...base,ADDRESS:'1 Oak Ln'},{ADDRESS:'2 Oak Ln'}).changes.ADDRESS==='2 Oak Ln');
t('addr too long',P(base,{ADDRESS:'X'.repeat(21)}).errors.length===1);
t('addr trim no change',ks(P(base,{ADDRESS:' 123 MAIN ST '}))==='');
// 8 batch: per parcel; one failing parcel
const batch=[fo,base].map(b=>P(b,{Private_Well:'Yes',Private_Well_Basis:'Meter analysis'}));
t('batch partial failure detected',batch[0].errors.length===0&&batch[1].errors.length===1);
t('batch skips same values',ks(P({...base,LUA:'FORU'},{LUA:'FORU'}))==='');
// 9 LotUpdated
const d=new Date(2026,10,2,23,30);
t('lot date',R.lotValue({type:'date'},d)===Date.UTC(2026,10,2,12));
t('lot dateonly',R.lotValue({type:'date-only'},d)==='2026-11-02');
t('lot string',R.lotValue({type:'string',length:20},d)==='11/02/2026');
t('lot short string',R.lotValue({type:'string',length:5},d)===undefined);
t('lot missing',R.lotValue(null,d)===undefined);
// 10 payload allowlist
const names=new Set(Object.keys(base).concat(['LotUpdated','ImprovedValue','Num__Remaining_Water_Connection']));
const pl=R.payload(CONFIG,'OBJECTID',1,{LUA:'Private',PropID:'1',EditDate:9,ImprovedValue:'x',Num__Remaining_Water_Connection:3},names,'LotUpdated',123);
t('payload allowlist',JSON.stringify(Object.keys(pl).sort())===JSON.stringify(['LUA','LotUpdated','OBJECTID']));
// stale
t('stale editdate',R.isStale(CONFIG,base,{...base,EditDate:6},'EditDate'));
t('stale value',R.isStale(CONFIG,base,{...base,LUA:'Private'},'EditDate'));
t('not stale',!R.isStale(CONFIG,base,{...base,ADDRESS:'123 MAIN ST '},'EditDate'));
// csv
t('csv',R.csv([['a','b,c','=1','x"y',null]])==='a,"b,c",\'=1,"x""y",\r\n');
console.log(pass+' passed, '+fail+' failed');process.exit(fail?1:0);
