// Run from repo root: node tests/load-registered-course.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=name=>{
 const begin=html.indexOf('function '+name+'(');
 const end=html.indexOf('\n}',begin);
 assert(begin>=0&&end>begin,'Missing function '+name);
 return html.slice(begin,end+2);
};
assert(html.includes('산박지도 v57'));
assert(html.includes('id="loadGeoCourse"'));
assert(html.includes("$('loadGeoCourse').onclick=loadSelectedGeoCourse;"));
const parks=JSON.parse(html.match(/<script id="parkData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const names=['metrics','lineSub','checkedGeoGraph','routeGraph','assembleGeoRoute',
 'nearest','lineDistance','verifiedGeoSnapshot','geoPoiChoices','nearestPoiOnLine',
 'sampleCourseLine','proposedGeoCourse','loadSelectedGeoCourse'];
let active=parks.find(p=>p.id==='seorak'),approve=true;
const builder={choices:[],line:null,focusIndex:null,focusKm:null};
const notes=[],history=[],draws=[];
const header=`
const hav=(a,b)=>111.195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);
const checkedGeoGraphs=new WeakMap(),geoPoiCache=new WeakMap();
function majorPoiList(p){return p.poiLabels||[]}
const view={course:0},builder=state,park=()=>current(),toast=s=>notes.push(s),
 confirm=()=>mayReplace(),rememberEdit=kind=>history.push(kind),
 updateBuilder=()=>draws.push('update'),resetMap=(id,fit)=>draws.push(id+':'+fit);
`;
const api=new Function('current','mayReplace','state','notes','history','draws',
 header+names.map(source).join('\n')+'\nreturn {view,builder,proposedGeoCourse,loadSelectedGeoCourse};')(
 ()=>active,()=>approve,builder,notes,history,draws);
assert(active?.net,'Missing Seorak GIS data');
const roundTrip=active.courses.find(c=>c.name.includes('오색')&&c.name.includes('왕복'));
assert(roundTrip,'Missing round-trip test');
const preview=api.proposedGeoCourse(active,roundTrip);
assert(preview?.choices.length===5,'Round trip must preserve intermediate stop');
assert.equal(preview.choices[0].name,preview.choices.at(-1).name,'Round trip endpoints differ');
assert(preview.measured>5,'Round trip accidentally reduced to direct one-way route');
assert(Math.abs(preview.measured-preview.rawKm)<preview.rawKm*.22);
api.view.course=active.courses.indexOf(roundTrip);
assert.equal(api.loadSelectedGeoCourse(),true);
assert.equal(builder.choices.length,5);
assert.equal(history.length,1,'Import must have a single undo entry');
assert.deepEqual(draws,['update','builderMap:route']);
const prior=builder.choices,priorLine=builder.line;
approve=false;api.view.course=0;
assert.equal(api.loadSelectedGeoCourse(),false,'Cancel must abort import');
assert.strictEqual(builder.choices,prior);
assert.strictEqual(builder.line,priorLine);
assert.equal(history.length,1);
approve=true;
active={...active,courses:[{name:'broken',line:[[0,0,1],[1,1,1]],start_name:'A',end_name:'B'}]};
api.view.course=0;
assert.equal(api.loadSelectedGeoCourse(),false,'Unconnected geometry must be blocked');
assert.strictEqual(builder.choices,prior);
assert.equal(history.length,1);
assert.equal(api.proposedGeoCourse(active,null),null);
assert.equal(api.proposedGeoCourse(active,{schematic:true,line:[[0,0,1],[1,1,1]]}),null);
const validParks=parks.filter(p=>p.net);
const results=validParks.map(p=>({name:p.name,success:p.courses.filter(c=>api.proposedGeoCourse(p,c)).length,total:p.courses.length}));
assert(results.some(p=>p.name==='북한산'&&p.success>=1));
assert(results.some(p=>p.name==='설악산'&&p.success>=3));
console.log('PASS: v57 import, round-trip preservation, cancel/invalid guards, GIS course checks');
