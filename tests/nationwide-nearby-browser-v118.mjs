import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('nationwide-plan.html');
const rootCode=page.slice(page.lastIndexOf('<script>')+8,page.lastIndexOf('</script>'));
const elements=new Map();
class Element {
 constructor(tag='div',id=''){this.tag=tag;this.id=id;this.children=[];this.attrs={};
  this.value='';this.disabled=false;this.hidden=false;this.open=true;this.style={};this.textContent='';}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]??null}
 append(...xs){this.children.push(...xs)}
 replaceChildren(...xs){this.children=xs;this.textContent=''}
 add(x){this.children.push(x)}
 addEventListener(t,fn){this['event_'+t]=fn}
 setPointerCapture(){}
 getBoundingClientRect(){return {left:0,top:0,width:1000,height:640}}
}
for(const m of page.matchAll(/id="([^"]+)"/g))elements.set(m[1],new Element('div',m[1]));
elements.get('sourceMode').value='knps';
elements.get('nearMode').value='near';
const document={getElementById:id=>elements.get(id)||null,
 createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),
 createTextNode:x=>{const e=new Element('text');e.textContent=x;return e}};
const scope={document,console,Option:class {constructor(text,value){this.textContent=text;this.value=value}},
 atob,Uint8Array,DecompressionStream,Blob,Response,Map,Set,Date,Math,Number,Promise,
 SANBAK_NATIONAL_INDEX:Array.from({length:2932},(_,i)=>({
 c:i?'999'+String(i).padStart(6,'0'):'428302602',
 n:i?'실험산 '+i:'설악산_대청봉'}))};
scope.window=scope;const context=vm.createContext(scope);
for(const f of ['core/nationwide-topology-v102.js','core/nationwide-route-preview-v104.js',
 'core/nationwide-pois-v105.js','core/nationwide-source-loader.js',
 'core/nationwide-map-v106.js','core/nationwide-map-view-v106.js',
 'core/nationwide-knps-contacts-v117.js','core/nationwide-knps-nearby-v118.js',
 'core/nationwide-elevation-v107.js','core/nationwide-elevation-chart-v107.js',
 'core/nationwide-elevation-pack-v108.js','core/nationwide-elevation-archive-v110.js'])
 vm.runInContext(read(f),context,{filename:f});
const geo=JSON.parse(read('data/knps-seorak-2018.geojson'));
const graph=scope.SanbakTopologyV102.build(scope.SanbakTopologyV102.historicKnps(geo),
 {sourceGeometry:'original'});
const planner=scope.SanbakGeometryPlannerV104.create(graph,'knps');
const view=scope.SanbakLineMapV106.create(graph,'knps',{geojson:geo});
assert.equal(planner.nodeCount,39);
assert.equal(planner.componentCount,17);
assert.notEqual(planner.componentOf(23),planner.componentOf(33),
 'Screenshot 23→33 must be a genuine historical GIS graph discontinuity');
assert(view.pickableNode(23)&&view.pickableNode(33));
const responses={
 './data/nationwide-topology/index.json':{schema:'sanbak-topology-audit-index-v102',counts:{mountains:2902},source_zip_sha256:'7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a',mountains:{}},
 './data/nationwide-pois/index.json':JSON.parse(read('data/nationwide-pois/index.json')),
 './data/nationwide-elevation/index.json':JSON.parse(read('data/nationwide-elevation/index.json')),
 './data/nationwide-elevation/online-v110.json':JSON.parse(read('data/nationwide-elevation/online-v110.json')),
 './data/knps-seorak-topology-v102.json':{mountainCode:'428302602',graph},
 './data/knps-seorak-2018.geojson':geo,
 './data/nationwide-elevation/seorak-knps-v108.json':JSON.parse(read('data/nationwide-elevation/seorak-knps-v108.json'))
};
scope.fetch=async path=>{assert(Object.hasOwn(responses,path),'unexpected '+path);
 return {ok:true,json:async()=>responses[path]}};
vm.runInContext(rootCode,context,{filename:'nationwide-plan.html'});
await new Promise(resolve=>setTimeout(resolve,75));
const el=id=>elements.get(id);
assert.equal(el('mapPickToggle').disabled,false);
assert(el('componentCount').textContent.includes('9'),
 '5m plan preview should use 9 rather than 16 separate historical components');
assert(el('source').textContent.includes('계획용 근접접합 7곳'));
const exact=scope.SanbakKnpsContactsV117.enhance(graph,geo).graph;
const nearby=scope.SanbakKnpsNearbyV118.enhance(exact,geo,{maxGapMeters:5});
assert.equal(nearby.connectors.length,7);
const exactPlan=scope.SanbakGeometryPlannerV104.create(exact,'knps');
const nearPlan=scope.SanbakGeometryPlannerV104.create(nearby.graph,'knps');
const c=nearby.connectors.find(item=>{
 const target=exact.edges[item.sourceEdge],a=exactPlan.plan([item.fromNode,target.from]);
 const b=nearPlan.plan([item.fromNode,target.from]);
 return a.status==='disconnected'&&b.status==='geometry_preview_only'&&
 b.legs[0].edgeIds.some(id=>nearby.graph.edges[id].provisionalGap);
});
assert(c,'need a real historical near-source gap to test');
const target=exact.edges[c.sourceEdge];
el('clear').onclick();
el('manualNode').value=String(c.fromNode);el('add').onclick();
el('manualNode').value=String(target.from);el('add').onclick();
assert.equal(el('waypoints').children.length,2,
 '5m preview mode must allow a graph-joined originally disconnected endpoint');
el('calculate').onclick();
assert(el('result').children[0].textContent.includes('추정 접합 포함 계획 거리'),
 'must NOT call near-source route verified/original-only');
assert(el('result').children[1].textContent.includes('주황 점선'));
assert(el('elevationStatus').textContent.includes('계획용 근접접합'),
 'unknown gap height should not become a measured DEM elevation profile');
function flatten(node){return [node,...node.children.flatMap(flatten)]}
assert(flatten(el('trailMap')).some(x=>x.tag==='path'&&x.attrs.stroke==='#e28a18'&&
 x.attrs['stroke-dasharray']==='8 5'),
 'ambiguous map connection must be visible as a separate amber dashed path');
el('nearMode').value='strict';el('nearMode').onchange();
await new Promise(resolve=>setTimeout(resolve,75));
assert(el('componentCount').textContent.includes('16'),'switch back to strict mode must restore source graph');
assert(el('source').textContent.includes('계획용 근접접합 0곳'));
console.log('PASS v118 browser: 5m plan mode creates 7 visibly dashed gaps, route labels provisional, DEM withheld, strict source mode restores 16 components');
