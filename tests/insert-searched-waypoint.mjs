// Run from repository root: node tests/insert-searched-waypoint.mjs
// v58: inserting a searched landmark anywhere must preserve every existing waypoint.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert(html.includes('산박지도 v58'));
assert(html.includes('id="poiInsertAt"')&&html.includes('id="poiInsertBar"'));
function functionSource(name){
 const a=html.indexOf('function '+name+'('),b=html.indexOf('\n}',a);
 assert(a>=0&&b>a,'Missing function: '+name);
 return html.slice(a,b+2);
}
const names=['metrics','lineSub','checkedGeoGraph','routeGraph','assembleGeoRoute','routeChoices',
 'nearest','geoPoiChoices','geoCanAdd','lineDistance','verifiedGeoSnapshot',
 'searchPoiRouteChoice','searchPoiCanAdd','syncPoiInsertionOptions','searchPoiInsertionIndex',
 'proposedSearchedInsertion','updatePoiSearchAddButton','addSearchedPoi','addWaypoint'];
const lons=[126,126.01,126.02,126.03,126.04,126.10,126.11],nodes=lons.map((lon,i)=>[lon,37,100+10*i]);
const edges=[[0,1],[1,2],[2,3],[3,4],[5,6]].map(([a,b])=>[a,b,.888,[nodes[a],nodes[b]]]);
const fixture={name:'fixture',net:{nodes,edges},courses:[],poiLabels:[
 {name:'Front',lon:126,lat:37},{name:'Start',lon:126.01,lat:37},
 {name:'Middle',lon:126.02,lat:37},{name:'End',lon:126.03,lat:37},
 {name:'Too close',lon:126.0101,lat:37},{name:'Disconnected',lon:126.10,lat:37}
]};
const code=`
 const checkedGeoGraphs=new WeakMap(),geoPoiCache=new WeakMap();
 const hav=(a,b)=>111.195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);
 function majorPoiList(p){return p.poiLabels||[]}
 const builder={choices:[],line:null,focusIndex:null,focusKm:null},view={tab:'view'};
 const button={disabled:true,title:''},bar={hidden:true};
 const select={value:'',options:[],replaceChildren(...options){this.options=[...options];this.value=options[0]?.value??''},add(option){this.options.push(option)}};
 function Option(label,value){this.text=label;this.value=value}
 const $=id=>id==='poiSearchAdd'?button:id==='poiInsertBar'?bar:id==='poiInsertAt'?select:null;
 const notes=[],edits=[],resets=[];
 let selectedSearchPoi=null;
 const park=()=>fixture,toast=s=>notes.push(s),rememberEdit=kind=>edits.push(kind),
  setTab=tab=>view.tab=tab,resetMap=(id,fit)=>resets.push([id,fit]),
  updateBuilder=()=>updatePoiSearchAddButton();
 `;
const app=new Function('fixture',code+names.map(functionSource).join('\n')+
 '\nreturn {builder,view,button,bar,select,notes,edits,resets,'+
 'choose:poi=>{selectedSearchPoi=poi;updatePoiSearchAddButton()},add:addSearchedPoi,'+
 'prepare:proposedSearchedInsertion,assemble:assembleGeoRoute};')(fixture);
const pick=name=>fixture.poiLabels.find(p=>p.name===name);
app.choose(pick('Start'));
assert.equal(app.button.disabled,false);
assert.equal(app.bar.hidden,true,'No route means no insertion slot selector');
assert.equal(app.builder.choices.length,0,'Searching must not add waypoints');
app.add();
assert.deepEqual(app.builder.choices.map(p=>p.name),['Start']);
app.choose(pick('End'));
assert.equal(app.bar.hidden,false,'Location selector should appear after first stop');
assert.equal(app.select.options.length,2);
app.add();
assert.deepEqual(app.builder.choices.map(p=>p.name),['Start','End']);
const initial=app.builder.choices;
app.choose(pick('Middle'));
assert.equal(app.select.options.length,3,'Append and 2 insertion slots');
app.select.value='1';app.choose(pick('Middle')); // emulate selection event refreshing the button
assert.equal(app.button.disabled,false,'Connected middle waypoint must be allowed');
const undoCount=app.edits.length;
app.add();
assert.deepEqual(app.builder.choices.map(p=>p.name),['Start','Middle','End']);
assert.equal(app.builder.focusIndex,1,'Inserted position must become focused');
assert.equal(app.select.value,'','Selector should default to append after successful insertion');
assert.equal(app.edits.length,undoCount+1,'Insertion should record one undo step');
assert.notStrictEqual(app.builder.choices,initial);
assert(app.builder.line?.length>=2);
assert(app.assemble(fixture.net,app.builder.choices,.05)?.stepKm.length===3);
const keep=app.builder.choices,keepLine=app.builder.line,undoNow=app.edits.length;
app.choose(pick('Disconnected'));app.select.value='1';app.choose(pick('Disconnected'));
assert.equal(app.button.disabled,true,'Disconnected branch must disable insertion');
app.add();
assert.strictEqual(app.builder.choices,keep,'Disconnected attempt must retain old route');
assert.strictEqual(app.builder.line,keepLine);
assert.equal(app.edits.length,undoNow,'Failed insertion must not add undo history');
app.choose(pick('Too close'));app.select.value='1';app.choose(pick('Too close'));
assert.equal(app.button.disabled,true,'A leg under 50m must not be inserted');
app.add();
assert.strictEqual(app.builder.choices,keep);
assert.equal(app.edits.length,undoNow);
app.choose(pick('Front'));app.select.value='0';app.choose(pick('Front'));
assert.equal(app.button.disabled,false,'Position 1 insertion must be supported');
app.add();
assert.deepEqual(app.builder.choices.map(p=>p.name),['Front','Start','Middle','End']);
assert.equal(app.builder.focusIndex,0);
assert.equal(app.view.tab,'build');
assert.equal(app.resets.at(-1).join(':'),'builderMap:route');
assert.equal(app.edits.length,undoNow+1);
assert.equal(app.prepare(fixture,pick('Disconnected'),2),null,'Graph gap must not become a straight line');
console.log('PASS: v58 insert at 1st/middle, preserve all stops, reject disconnected/too-close, update map, one undo per change');
