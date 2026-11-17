// Fake ArcGIS SDK used only by ui.test.js. FAKE segments, tasks and rates; no real data.
// window.MOCK_EDITOR=false (set before load) simulates a staff member who is not in the editors group.
const D=(y,m,d)=>Date.UTC(y,m-1,d,12);
window.EDITS=[];
const SVC={
 'PLAN':{0:{name:'Segments',rows:[
   {OBJECTID:1,CG_SegmentID:'101',Street:'Oak Ln',Segment_Name:'Oak Ln A',CG_SqYd_Calc:1000,CG_Length_ft:900},
   {OBJECTID:2,CG_SegmentID:'102',Street:'Elm Dr',Segment_Name:'Elm Dr B',CG_SqYd_Calc:2000,CG_Length_ft:1500},
   {OBJECTID:3,CG_SegmentID:'103',Street:'Pine Ct',Segment_Name:'Pine Ct',CG_SqYd_Calc:null,CG_Length_ft:200}]},
  1:{name:'Treatment_Events',rows:[
   {OBJECTID:1,EventID:'CG-1',CG_SegmentID:'101',CG_TaskID:'11',Street:'Oak Ln',WorkTypeRaw:'FOR - Micro Seal',TreatmentCategory:'Micro Seal',TreatYear:2026,Status:'Planned',Polygon_SqYd:800},
   {OBJECTID:2,EventID:'CG-2',CG_SegmentID:'102',CG_TaskID:'12',Street:'Elm Dr',WorkTypeRaw:'FOR - Fog Seal (In House)',TreatmentCategory:'Fog Seal',TreatYear:2026,Status:'Planned',Polygon_SqYd:null},
   {OBJECTID:3,EventID:'CG-3',CG_SegmentID:'103',CG_TaskID:'13',Street:'Pine Ct',WorkTypeRaw:'FOR - Micro Seal',TreatmentCategory:'Micro Seal',TreatYear:2027,Status:'Planned',Polygon_SqYd:null},
   {OBJECTID:4,EventID:'CG-4',CG_SegmentID:'102',CG_TaskID:'14',Street:'Elm Dr',WorkTypeRaw:'FOR - Liquid Pavement',TreatmentCategory:'Other',TreatYear:2027,Status:'Planned',Polygon_SqYd:null}]}},
 'READ':{0:{name:'Rate_Snapshots',rows:[
   {OBJECTID:1,Snapshot_ID:'FAKE-SNAP',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Micro Seal',Rate_Per_SY:6.77,Rate_Status:'Confirmed',Source_Name:'FOR 2027 PPP',OCI_From:65,OCI_Through:75,Skip_Years:2,Notes:''},
   {OBJECTID:2,Snapshot_ID:'FAKE-SNAP',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Fog Seal (In House)',Rate_Per_SY:0.85,Rate_Status:'Confirmed',Source_Name:'FOR 2027 PPP',OCI_From:75,OCI_Through:85,Skip_Years:2,Notes:''},
   {OBJECTID:3,Snapshot_ID:'FAKE-SNAP',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Liquid Pavement',Rate_Per_SY:0.9,Rate_Status:'Pending Legacy',Source_Name:'Activity library',Notes:'label'},
   {OBJECTID:4,Snapshot_ID:'FAKE-SNAP',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Chip Seal',Rate_Per_SY:2.9,Rate_Status:'Confirmed',Source_Name:'Activity library',Notes:''}]},
  1:{name:'Rate_Overrides',rows:[]}}};
SVC.EDIT={0:SVC.READ[1]};
const IDS={'7ac95a464345448aaeddb17755801920':'PLAN','4a0fbf8bca804ef1b7f6067a924c3c9d':'READ','df344bfe14084239b70fe457322bfe13':'EDIT'};
const match=(r,w)=>{if(!w||w==='1=1')return true;let m=w.match(/^Status = '(.*)'$/);if(m)return r.Status===m[1];
  m=w.match(/^CG_SegmentID IN \((.*)\)$/);if(m)return m[1].split(',').map(x=>x.replace(/'/g,'')).includes(r.CG_SegmentID);return true};
class FL{constructor(o){Object.assign(this,o);this.objectIdField='OBJECTID'}
 get _t(){return SVC[IDS[this.portalItem.id]][this.layerId]}
 async load(){const svc=IDS[this.portalItem.id];if(svc==='EDIT'&&window.MOCK_EDITOR===false)throw new Error('You do not have permissions to access this resource');
  if(!this._t)throw new Error('no layer '+this.layerId);this.sourceJSON={name:this._t.name};
  this.capabilities={operations:{supportsAdd:svc==='EDIT',supportsUpdate:svc==='EDIT',supportsDelete:false}};if(!window['__'+this._t.name+'_'+svc])window['__'+this._t.name+'_'+svc]=this}  // first instance = the one byName returns (later lookups load layer 0 again)
 async queryFeatures(q){let rows=this._t.rows;if(q.objectIds)rows=rows.filter(r=>q.objectIds.includes(r.OBJECTID));else rows=rows.filter(r=>match(r,q.where));
  rows=rows.slice(q.start||0,(q.start||0)+(q.num||1000));return{features:rows.map(r=>({attributes:{...r}})),exceededTransferLimit:false}}
 async queryObjectIds(q){return this._t.rows.filter(r=>match(r,q.where)).map(r=>r.OBJECTID)}
 async applyEdits(e){const t=this._t;window.EDITS.push(e);
  if(e.addFeatures)return{addFeatureResults:e.addFeatures.map(f=>{const id=t.rows.length+1;t.rows.push({OBJECTID:id,...f.attributes,Editor:'emartz'});return{objectId:id}})};
  return{updateFeatureResults:e.updateFeatures.map(f=>{const r=t.rows.find(x=>x.OBJECTID===f.attributes.OBJECTID);Object.assign(r,f.attributes);return{objectId:r.OBJECTID}})}}}
class MV{constructor(o){this.ui={add(){}}}on(e,f){window.__click=f}async whenLayerView(){return{highlight(ids){window.HL=ids;return{remove(){}}}}}
 async hitTest(ev){return{results:[{graphic:{layer:window.__Segments_PLAN,attributes:{OBJECTID:ev.oid}}}]}}}
const mods={'esri/identity/OAuthInfo':class{constructor(o){Object.assign(this,o)}},
 'esri/identity/IdentityManager':{registerOAuthInfos(){},checkSignInStatus:()=>Promise.resolve(),getCredential(){},destroyCredentials(){}},
 'esri/portal/Portal':class{async load(){this.user={username:'emartz',fullName:'Ernie Martz'}}},
 'esri/Map':class{},'esri/views/MapView':MV,'esri/layers/FeatureLayer':FL,'esri/widgets/BasemapToggle':class{}};
window.require=(names,cb)=>setTimeout(()=>cb(...names.map(n=>mods[n])),0);
