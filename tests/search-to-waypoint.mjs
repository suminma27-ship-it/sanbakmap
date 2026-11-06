// Run from repository root: node tests/search-to-waypoint.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert(html.includes('산박지도 v56'));
assert(html.includes('id="poiSearchAdd"'));
function source(name){
 const a=html.indexOf('function '+name+'('),b=html.indexOf('\n}',a);
 assert(a>=0&&b>a,'Missing app function: '+name);
 return html.slice(a,b+2);
}
const functions=['metrics','lineSub','checkedGeoGraph','routeGraph','assembleGeoRoute',
 'routeChoices','nearest','geoPoiChoices','geoCanAdd','lineDistance','searchPoiRouteChoice',
 'searchPoiCanAdd','updatePoiSearchAddButton','addSearchedPoi','addWaypoint'];
const fixture={name:'fixture',net:{
 nodes:[[126,37,100],[126.01,37,200],[126.02,37,200],[126.03,37,300]],
 edges:[
  [0,1,1,[[126,37,100],[126.01,37,200]]],
  [2,3,1,[[126.02,37,200],[126.03,37,300]]]
 ]},poiLabels:[
  {name:'Start',lon:126,lat:37},
  {name:'Same route',lon:126.01,lat:37},
  {name:'Detached',lon:126.02,lat:37},
  {name:'Too close',lon:126.0001,lat:37}
 ],courses:[]};
const header=`
 const checkedGeoGraphs=new WeakMap(),geoPoiCache=new WeakMap();
 const builder={choices:[],line:null,focusIndex:null};
 const hav=(a,b)=>111.195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);
 function majorPoiList(p){return p.poiLabels||[]}
 const view={tab:'view'}, messages=[],edits=[],mapChanges=[],button={disabled:true,title:''};
 let selectedSearchPoi=null;
 const $=id=>id==='poiSearchAdd'?button:null;
 const park=()=>fixture;
 function toast(s){messages.push(s)}
 function setTab(tab){view.tab=tab}
 function resetMap(...args){mapChanges.push(args)}
 function updateBuilder(){}
 function rememberEdit(kind){edits.push(kind)}
`;
const runtime=new Function('fixture',header+functions.map(source).join('\n')+
 '\nreturn {builder,view,messages,edits,mapChanges,button,setSelected:q=>{selectedSearchPoi=q;updatePoiSearchAddButton()},addSearchedPoi};')(fixture);
const start={name:'Start',lon:126,lat:37};
const connected={name:'Same route',lon:126.01,lat:37};
const detached={name:'Detached',lon:126.02,lat:37};
const near={name:'Too close',lon:126.0001,lat:37};

runtime.setSelected(start);
assert.equal(runtime.button.disabled,false,'First waypoint must be selectable');
assert.equal(runtime.builder.choices.length,0,'Search alone must not add a waypoint');
runtime.addSearchedPoi();
assert.equal(runtime.view.tab,'build','Explicit add switches from view to editor');
assert.deepEqual(runtime.builder.choices.map(q=>q.name),['Start']);

runtime.setSelected(detached);
assert.equal(runtime.button.disabled,true,'Disconnected waypoint button must be disabled');
runtime.addSearchedPoi(); // guard must reject even if event is triggered programmatically
assert.deepEqual(runtime.builder.choices.map(q=>q.name),['Start']);
assert.equal(runtime.edits.length,1,'Rejected route must not create undo history');

runtime.setSelected(near);
assert.equal(runtime.button.disabled,true,'Less than 50m leg must be disabled');
runtime.setSelected(connected);
assert.equal(runtime.button.disabled,false,'Connected waypoint must be enabled');
runtime.addSearchedPoi();
assert.deepEqual(runtime.builder.choices.map(q=>q.name),['Start','Same route']);
assert(runtime.builder.line?.length>=2,'Route was not assembled from existing GIS edges');
assert.equal(runtime.button.disabled,true,'Same point cannot be appended twice');
assert.equal(runtime.edits.length,2,'Each successful add must create one undo history entry');
assert.deepEqual(runtime.mapChanges.at(-1),['builderMap','route']);
runtime.setSelected(null);
assert.equal(runtime.button.disabled,true,'No search result must disable button');
console.log('PASS: explicit search-to-waypoint add, disconnected/nearby guards, route integrity, editor switch');
