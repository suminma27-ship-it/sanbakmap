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
const document={getElementById:id=>elements.get(id)||null,
 createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),
 createTextNode:x=>{const e=new Element('text');e.textContent=x;return e}};
const scope={document,console,Option:class {constructor(text,value){this.textContent=text;this.value=value}},
 atob,Uint8Array,DecompressionStream,Blob,Response,Map,Set,Date,Math,Number,Promise,
 SANBAK_NATIONAL_INDEX:[{c:'428302602',n:'설악산_대청봉'}]};
scope.window=scope;const context=vm.createContext(scope);
for(const f of ['core/nationwide-topology-v102.js','core/nationwide-route-preview-v104.js',
 'core/nationwide-pois-v105.js','core/nationwide-source-loader.js',
 'core/nationwide-map-v106.js','core/nationwide-map-view-v106.js',
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
assert.equal(el('mapPickToggle').disabled,false,'real map source must be loaded');
el('clear').onclick();
assert.equal(el('waypoints').children.length,1,'after clearing: placeholder only');
el('manualNode').value='23';el('add').onclick();
assert.equal(el('waypoints').children.length,1);
console.log('V116_DIAG',JSON.stringify({waypoints:el('waypoints').children.map(x=>({tag:x.tag,text:x.textContent,children:x.children.length})),result:el('result').children.map(x=>x.textContent),status:el('status').textContent,selected:el('source').textContent,degree:planner.degreeOf(23),component23:planner.componentOf(23),component33:planner.componentOf(33)}));
assert(el('waypoints').children[0].children[0].textContent.includes('노드 23'));
el('mapPickToggle').onclick();
assert.equal(el('mapPickToggle').attrs['aria-pressed'],'true');
const flatten=n=>[n,...n.children.flatMap(flatten)];
const dots=flatten(el('trailMap'));
assert(dots.some(x=>x.attrs['data-unconnected-node']==='33'),
 'node 33 must become visibly grey when waypoint 23 is first');
const note=el('mapPickHint').textContent;
assert(note.includes('초록색')&&note.includes('회색'));
el('manualNode').value='33';el('add').onclick();
assert.equal(el('waypoints').children.length,1,
 'manual entry must NOT add a disconnected waypoint after first selection');
assert(el('result').children[0].textContent.includes('원본 GIS에서 연결되어 있지 않아'));
const grey=dots.find(x=>x.attrs['data-unconnected-node']==='33');
assert(grey);
const svg=el('trailMap');
function tap(x,y){
 const ev={pointerId:1,pointerType:'mouse',clientX:Number(x),clientY:Number(y),target:svg};
 svg.event_pointerdown(ev);svg.event_pointerup(ev);
}
tap(grey.attrs.cx,grey.attrs.cy);
assert.equal(el('waypoints').children.length,1,'disconnected map tap must be rejected');
assert(el('mapStatus').textContent.includes('다른 원본 연결망')||
 el('result').children[0].textContent.includes('원본 GIS에서 연결되어 있지 않아'));
const any=graph.edges.filter(e=>e.from===23||e.to===23).find(e=>
 e.from!==e.to&&planner.degreeOf(e.from)>0&&planner.degreeOf(e.to)>0);
assert(any,'source 23 should have a true source-connected neighboring node');
const connected=any.from===23?any.to:any.from;
assert.equal(planner.componentOf(23),planner.componentOf(connected));
el('manualNode').value=String(connected);el('add').onclick();
assert.equal(el('waypoints').children.length,2);
el('calculate').onclick();
assert(el('result').children[0].textContent.includes('원본 기하학적 거리'),
 'same-component route must calculate without inventing links');
const reverse=planner.plan([connected,23]);
assert.equal(reverse.status,'geometry_preview_only');
console.log('PASS v116 screenshot regression: KNPS nodes 23 and 33 separate, grey node map tap and manual entry rejected, reachable node calculated');
