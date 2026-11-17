// Fake ArcGIS SDK used only by ui.test.js. FAKE roads and rates; no real data.
// window.MOCK_EDITOR=false (set before load) simulates staff who are not in the editors group.
const D=(y,m,d)=>Date.UTC(y,m-1,d,12);
window.EDITS=[];
const geo=()=>({type:'polyline',extent:{clone(){return{expand(f){return{expanded:f}}}}}});
const SVC={
 ROADS:{0:{name:'Treatment_Area',rows:[]},1:{name:'Segments',rows:[
   {OBJECTID:11,CG_SegmentID:'101',Street:'Oak Ln',Segment_Name:'Oak Ln A',CG_SqYd_Calc:1000,CG_Length_ft:900,FunctionalClass:'Local',PavementClass:'Asphalt',Last_Treatment:'Chip Seal',Last_Treatment_Year:2019},
   {OBJECTID:12,CG_SegmentID:'102',Street:'Elm Dr',Segment_Name:'Elm Dr B',CG_SqYd_Calc:2000,CG_Length_ft:1500},
   {OBJECTID:13,CG_SegmentID:'103',Street:'Pine Ct',Segment_Name:'Pine Ct',CG_SqYd_Calc:null,CG_Length_ft:200},
   {OBJECTID:14,CG_SegmentID:'104',Street:'Elm Dr',Segment_Name:'Elm Dr A',CG_SqYd_Calc:500,CG_Length_ft:400}]}},
 READ:{0:{name:'Rate_Snapshots',rows:[
   {OBJECTID:1,Snapshot_ID:'FAKE-SNAP',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Fog Seal (In House)',Rate_Per_SY:0.85,Rate_Status:'Confirmed',OCI_From:75,OCI_Through:85,Skip_Years:2},
   {OBJECTID:2,Snapshot_ID:'FAKE-SNAP',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Rejuvenation',Rate_Per_SY:1.2,Rate_Status:'Confirmed',OCI_From:85,OCI_Through:95,Skip_Years:2},
   {OBJECTID:3,Snapshot_ID:'FAKE-SNAP',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Liquid Pavement',Rate_Per_SY:0.9,Rate_Status:'Pending Legacy'},
   {OBJECTID:4,Snapshot_ID:'FAKE-SNAP',Snapshot_Date:D(2026,11,16),Effective_Date:D(2026,11,16),Activity:'FOR - Chip Seal',Rate_Per_SY:2.9,Rate_Status:'Confirmed'}]},
  1:{name:'Rate_Overrides',rows:[]}}};
SVC.EDIT={0:SVC.READ[1]};
const IDS={'1c715100f896408697119d73def08461':'ROADS','4a0fbf8bca804ef1b7f6067a924c3c9d':'READ','df344bfe14084239b70fe457322bfe13':'EDIT'};
class FL{constructor(o){Object.assign(this,o);this.objectIdField='OBJECTID'}
 get _t(){return SVC[IDS[this.portalItem.id]][this.layerId]}
 async load(){const svc=IDS[this.portalItem.id];if(svc==='EDIT'&&window.MOCK_EDITOR===false)throw new Error('You do not have permissions to access this resource');
  if(!this._t)throw new Error('no layer '+this.layerId);this.sourceJSON={name:this._t.name};
  this.capabilities={operations:{supportsAdd:svc==='EDIT',supportsUpdate:svc==='EDIT',supportsDelete:false}};
  if(!window['__'+this._t.name+'_'+svc])window['__'+this._t.name+'_'+svc]=this}  // first instance = the one byName returns
 async queryFeatures(q){let rows=this._t.rows.slice(q.start||0,(q.start||0)+(q.num||1000));
  return{features:rows.map(r=>({attributes:{...r},geometry:q.returnGeometry?geo():null}))}}
 async applyEdits(e){const t=this._t;window.EDITS.push(e);
  if(e.addFeatures)return{addFeatureResults:e.addFeatures.map(f=>{const id=t.rows.length+1;t.rows.push({OBJECTID:id,...f.attributes});return{objectId:id}})};
  return{updateFeatureResults:e.updateFeatures.map(f=>{const r=t.rows.find(x=>x.OBJECTID===f.attributes.OBJECTID);Object.assign(r,f.attributes);return{objectId:r.OBJECTID}})}}}
class MV{constructor(o){this.ui={add(){}};this.spatialReference={wkid:3857}}on(e,f){window.__click=f}async whenLayerView(){return{highlight(ids){window.HL=ids;return{remove(){}}}}}
 goTo(t){window.GOTO=t;return Promise.resolve()}
 async hitTest(ev){return{results:[{graphic:{layer:window.__Segments_ROADS,attributes:{OBJECTID:ev.oid}}}]}}}
const mods={'esri/identity/OAuthInfo':class{constructor(o){Object.assign(this,o)}},
 'esri/identity/IdentityManager':{registerOAuthInfos(){},checkSignInStatus:()=>Promise.resolve(),getCredential(){},destroyCredentials(){}},
 'esri/portal/Portal':class{async load(){this.user={username:'emartz',fullName:'Ernie Martz'}}},
 'esri/Map':class{},'esri/views/MapView':MV,'esri/layers/FeatureLayer':FL,'esri/widgets/BasemapToggle':class{}};
window.require=(names,cb)=>setTimeout(()=>cb(...names.map(n=>mods[n])),0);
