// Run from the repository root: node tests/route-consistency.mjs
// All assertions use the exact bundled park data and the app's pure routing functions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(join(root,'index.html'),'utf8');
const match=html.match(/<script id="parkData" type="application\/json">([\s\S]*?)<\/script>/);
assert(match,'Bundled park dataset missing');
const parks=JSON.parse(match[1]);
assert.equal(parks.length,24,'Park data count changed unexpectedly');

const names=['metrics','lineSub','checkedGeoGraph','routeGraph','assembleGeoRoute',
 'routeChoices','geoStepDistances','lineDistance','coordOnRoute','verifiedGeoSnapshot',
 'reorderChoiceList','planAdj','planPath','verifiedPlanSnapshot','planComputeFor',
 'planStepDistances','checkedPlanRoute'];
function functionSource(name){
 const start=html.indexOf('function '+name+'(');
 const end=html.indexOf('\n}',start);
 assert(start>=0&&end>start,'Unable to locate routing function: '+name);
 return html.slice(start,end+2);
}
const header=`const checkedGeoGraphs=new WeakMap();
const hav=(a,b)=>111.195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);`;
const api=new Function(header+'\n'+names.map(functionSource).join('\n')+
 '\nreturn {'+names.join(',')+'};')();
const hav=(a,b)=>111.195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);
const tol=1e-6;
let geo=0,moved=0,removed=0,schematic=0,blocked=0;
function close(a,b,label){assert(Math.abs(a-b)<tol,label+': '+a+' vs '+b)}
function checkGeo(net,choices,label){
 const assembled=api.assembleGeoRoute(net,choices,.05);
 const verified=api.verifiedGeoSnapshot(net,choices);
 assert(assembled&&verified,label+': disconnected or invalid');
 const metric=api.metrics(assembled.line),stops=assembled.stepKm;
 assert.equal(stops.length,choices.length,label+': missing waypoint');
 close(stops.at(-1),metric.km,label+' map vs total distance');
 close(metric.profile.at(-1)[0],metric.km,label+' chart vs total distance');
 for(let i=1;i<stops.length;i++)assert(stops[i]>stops[i-1],label+': nonincreasing distance');
 for(let i=0;i<choices.length;i++){
  const selected=api.lineSub(net.edges[choices[i].edge],choices[i].t,choices[i].t)[0];
  const mapped=api.coordOnRoute(assembled.line,stops[i]);
  assert(hav(selected,mapped)<.015,label+': waypoint is not on drawn line');
 }
 geo++;return metric;
}
for(const p of parks.filter(p=>p.net)){
 const net=p.net,g=api.checkedGeoGraph(net);
 const edges=net.edges.map((_,i)=>i).filter(i=>g.valid[i]&&api.lineDistance(net.edges[i][3])>.12);
 for(const edge of edges){
  const forward=[{edge,t:.2},{edge,t:.8}];
  const a=checkGeo(net,forward,p.name+' edge '+edge);
  const b=checkGeo(net,forward.slice().reverse(),p.name+' reverse '+edge);
  close(a.km,b.km,p.name+' reverse total');
 }
 for(const edge of edges.filter(i=>api.lineDistance(net.edges[i][3])>.7).slice(0,18)){
  const original=[{edge,t:.1},{edge,t:.35},{edge,t:.65},{edge,t:.9}];
  checkGeo(net,original,p.name+' four points');
  for(let target=0;target<3;target++){
   const reordered=api.reorderChoiceList(original,3,target);
   assert(reordered&&reordered.length===4&&new Set(reordered).size===4,p.name+': waypoint lost');
   checkGeo(net,reordered,p.name+' move fourth to '+(target+1));moved++;
  }
  checkGeo(net,[original[0],original[2],original[3]],p.name+' delete middle');
  removed++;
 }
 if(edges.length>1){
  const first=edges[0],last=edges.at(-1);
  if(g.components[net.edges[first][0]]!==g.components[net.edges[last][0]]){
   assert.equal(api.assembleGeoRoute(net,[{edge:first,t:.5},{edge:last,t:.5}]),null);
   blocked++;
  }
 }
 for(let edge=0;edge<net.edges.length;edge++)if(!g.valid[edge]){
  assert.equal(api.assembleGeoRoute(net,[{edge,t:.2},{edge,t:.8}]),null);
 }
}
for(const p of parks.filter(p=>p.plan_graph)){
 const net=p.plan_graph;
 for(const [courseId,course] of Object.entries(net.courses)){
  for(const order of [course.nodes,course.nodes.slice().reverse()]){
   const state=api.checkedPlanRoute(net,order,courseId);
   assert(state?.result?.official,p.name+': official route missing');
   close(state.stepKm.at(-1),state.result.km,p.name+' official cumulative');
   close(state.result.profile.at(-1)[0],state.result.km,p.name+' official chart');
   schematic++;
  }
  if(course.nodes.length<3)continue;
  for(let from=0;from<course.nodes.length;from++)for(let to=0;to<course.nodes.length;to++){
   if(from===to)continue;
   const moved=api.reorderChoiceList(course.nodes,from,to);
   assert.equal(moved.length,course.nodes.length,p.name+': moved waypoint lost');
   const verified=api.verifiedPlanSnapshot(net,moved,null);
   if(!verified)continue;
   const state=api.checkedPlanRoute(net,verified.choices,null);
   assert(state,p.name+': failed planned route');
   close(state.stepKm.at(-1),state.result.km,p.name+' edited cumulative');
   close(state.result.profile.at(-1)[0],state.result.km,p.name+' edited chart');
   schematic++;
  }
 }
}
const invalid={nodes:[[0,0,100],[.002,0,100]],
 edges:[[0,1,.22,[[.001,0,100],[.002,0,100]]]]};
assert.equal(api.checkedGeoGraph(invalid).valid[0],0,'Endpoint gap accepted');
assert.equal(api.routeGraph(invalid,{edge:0,t:.2},{edge:0,t:.8}),null);
const split={nodes:[[0,0,100],[.001,0,100],[.001,0,100],[.002,0,100]],
 edges:[[0,1,.111,[[0,0,100],[.001,0,100]]],[2,3,.111,[[.001,0,100],[.002,0,100]]]]};
assert.equal(api.checkedGeoGraph(split).componentCount,1,'Identical endpoint coordinates should be joined');
assert.equal(api.checkedGeoGraph(split).stitches.length,1,'Duplicate-node repair absent');
assert(api.routeGraph(split,{edge:0,t:.9},{edge:1,t:.1}),'Duplicate endpoints not routable');
const separated={nodes:[[0,0,100],[.001,0,100],[.00105,0,100],[.002,0,100]],
 edges:[[0,1,.111,[[0,0,100],[.001,0,100]]],[2,3,.106,[[.00105,0,100],[.002,0,100]]]]};
assert.equal(api.checkedGeoGraph(separated).componentCount,2,'Several-meter gap incorrectly joined');
assert.equal(api.routeGraph(separated,{edge:0,t:.9},{edge:1,t:.1}),null);
console.log(`PASS: GIS ${geo}, waypoint moves ${moved}, removals ${removed}, schematic ${schematic}, disconnected ${blocked}`);
