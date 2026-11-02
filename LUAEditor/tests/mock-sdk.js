// Fake ArcGIS SDK used only by ui.test.js. FAKE parcels; no real data.
window.STORE={1:{OBJECTID:1,ADDRESS:'123 MAIN ST',textImproved:'Improved',LUA:'FORU',Num__of_Connections_Water:1,Num__of_Connections_Sewer:0,MasterWater:null,MasterWastewater:null,Private_Well:null,Private_Well_Basis:null,PropID:'1001',Subdivision:'Oak Hills',Unit:'2',Lot:'7',COUNTY:'Kendall',Pressure_Zone:'PZ1',Lot_Acreage:110.81362584844793,LotUpdated:null,EditDate:1000,Editor:'awade'},
 2:{OBJECTID:2,ADDRESS:'125 MAIN ST',textImproved:'Vacant',LUA:'Private',Num__of_Connections_Water:0,Num__of_Connections_Sewer:0,MasterWater:2,MasterWastewater:null,Private_Well:'No',Private_Well_Basis:null,PropID:'1002',Subdivision:'Oak Hills',Unit:'2',Lot:'8',COUNTY:'Kendall',Pressure_Zone:'PZ1',Lot_Acreage:2,LotUpdated:null,EditDate:1000,Editor:'awade',ImprovedValue:'SECRET'}};
window.EDITS=[];
const F=(name,type,extra)=>Object.assign({name,type,alias:name},extra||{});
const cv=a=>({codedValues:a.map(c=>({code:c,name:c}))});
const FIELDS=[F('OBJECTID','oid'),F('ADDRESS','string',{length:40}),F('textImproved','string',{domain:cv(['Improved','Vacant'])}),F('LUA','string',{domain:cv(['FORU','Private','SAWS'])}),
 F('Num__of_Connections_Water','integer'),F('Num__of_Connections_Sewer','integer'),F('MasterWater','integer'),F('MasterWastewater','integer'),
 F('Private_Well','string',{length:3,domain:cv(['Yes','No'])}),F('Private_Well_Basis','string',{length:20}),F('PropID','string'),F('Subdivision','string'),F('Unit','string'),F('Lot','string'),
 F('COUNTY','string'),F('Pressure_Zone','string'),F('Lot_Acreage','double'),F('LotUpdated','date'),F('EditDate','date'),F('Editor','string'),F('ImprovedValue','string')];
const pick=(a,of)=>Object.fromEntries(Object.entries(a).filter(([k])=>of.includes(k)));
class FL{constructor(o){Object.assign(this,o)}
 async load(){this.objectIdField='OBJECTID';this.fields=FIELDS;this.editFieldsInfo={editDateField:'EditDate',editorField:'Editor'};this.capabilities={operations:{supportsUpdate:true,supportsAdd:false,supportsDelete:false},editing:{supportsGeometryUpdate:false}}}
 async queryFeatures(q){window.LASTQ=q;let ids=q.objectIds||Object.keys(STORE).map(Number);
  if(q.where&&!q.objectIds){const m=q.where.match(/OBJECTID = (\d+)/);if(m)ids=[+m[1]];else{const s=(q.where.match(/LIKE '%(.*?)%'/)||[])[1]||'';ids=ids.filter(i=>STORE[i].ADDRESS.includes(s))}}
  return{features:ids.filter(i=>STORE[i]).map(i=>({attributes:pick({...STORE[i]},q.outFields),geometry:{type:'polygon',extent:{width:500,clone(){return{expand(f){return{expanded:f}}}}}}}))}}
 async applyEdits(e){const r=e.updateFeatures.map(g=>{EDITS.push(g.attributes);const a=g.attributes;Object.assign(STORE[a.OBJECTID],a,{EditDate:Date.now(),Editor:'emartz'});return{objectId:a.OBJECTID}});return{updateFeatureResults:r}}}
class MV{constructor(o){this.spatialReference={wkid:3857};this.zoom=14;this.ui={add(){}};this.container=document.getElementById('map')}on(e,f){window.__click=f}
 async whenLayerView(){return{highlight(ids){window.HL=ids;return{remove(){}}}}}goTo(t){window.GOTO=t;return Promise.resolve()}async hitTest(ev){return{results:[{graphic:{layer:window.__layer,attributes:{OBJECTID:ev.oid}}}]}}}
const mods={'esri/identity/OAuthInfo':class{constructor(o){Object.assign(this,o)}},
 'esri/identity/IdentityManager':{registerOAuthInfos(){},checkSignInStatus:()=>Promise.resolve(),getCredential(){},destroyCredentials(){}},
 'esri/portal/Portal':class{async load(){this.user={username:'emartz',fullName:'Ernie Martz'}}},
 'esri/Map':class{},'esri/views/MapView':MV,'esri/layers/FeatureLayer':class extends FL{constructor(o){super(o);window.__layer=this}},
 'esri/Graphic':class{constructor(o){Object.assign(this,o)}},'esri/widgets/BasemapToggle':class{}};
window.require=(names,cb)=>setTimeout(()=>cb(...names.map(n=>mods[n])),0);
