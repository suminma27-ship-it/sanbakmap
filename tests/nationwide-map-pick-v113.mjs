import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scope={};
for(const f of ['core/nationwide-map-v106.js','core/nationwide-topology-v102.js',
 'core/nationwide-route-preview-v104.js'])
 new Function('window',read(f))(scope);
const knps=JSON.parse(read('data/knps-seorak-2018.geojson'));
const graph=scope.SanbakTopologyV102.build(
 scope.SanbakTopologyV102.historicKnps(knps),{sourceGeometry:'original'});
const mapped=scope.SanbakLineMapV106.create(graph,'knps',{geojson:knps});
assert.equal(mapped.nodesXY.length,39);
assert(mapped.nodesXY.some((_,i)=>mapped.pickableNode(i)));
assert(!mapped.pickableNode(-1));
assert(!mapped.pickableNode(39));
assert(!mapped.pickableNode('0'));
class Element{
 constructor(tag='svg'){this.tag=tag;this.attrs={};this.children=[];this.listeners={};
  this.style={};this.textContent='';}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]??null}
 append(node){this.children.push(node)}
 replaceChildren(...nodes){this.children=[...nodes]}
 addEventListener(name,fn){this.listeners[name]=fn}
 getBoundingClientRect(){return {left:0,top:0,width:1000,height:640}}
 setPointerCapture(){}
 fire(name,obj={}){this.listeners[name]?.({target:this,pointerId:1,
  pointerType:'mouse',clientX:0,clientY:0,...obj})}
}
const document={createElementNS(ns,name){return new Element(name)}};
const root={document};root.window=root;
new Function('window','document',read('core/nationwide-map-view-v106.js'))(root,document);
let picked=[],notices=[];
const svg=new Element();
const canvas=root.SanbakTrailCanvasV106.create(svg,{
 onTrailNodeClick:id=>picked.push(id),onPickNotice:s=>notices.push(s)
});
function flatten(n){return [n,...n.children.flatMap(flatten)]}
function marker(){
 const m=flatten(svg).find(x=>x.tag==='circle'&&x.attrs['data-trail-node']!==undefined);
 assert(m,'original GIS endpoints must be visibly distinguishable');
 return {id:Number(m.attrs['data-trail-node']),x:Number(m.attrs.cx),y:Number(m.attrs.cy)};
}
function tap(x,y,extra={}){
 svg.fire('pointerdown',{clientX:x,clientY:y,...extra});
 svg.fire('pointerup',{clientX:x,clientY:y,...extra});
}
canvas.setSource(mapped);
assert.equal(canvas.getState().trailPickEnabled,false);
assert.equal(canvas.setTrailPickEnabled(true),true);
const initial=marker();
assert.equal(mapped.pickableNode(initial.id),true);
tap(initial.x,initial.y);
assert.deepEqual(picked,[initial.id],'map tap must select exactly one original graph node');
const count=picked.length;
svg.fire('pointerdown',{clientX:initial.x,clientY:initial.y});
svg.fire('pointermove',{clientX:initial.x+35,clientY:initial.y+10});
svg.fire('pointerup',{clientX:initial.x+35,clientY:initial.y+10});
assert.equal(picked.length,count,'panning must not select extra waypoints');
canvas.fit();
tap(-500,-500);
assert.equal(picked.length,count,'far clicks must never invent nodes');
assert(notices.some(x=>x.includes('임의 노드')));
canvas.setTrailPickEnabled(false);
const again=marker;
// With mode disabled no guide dots or click-selection.
assert(!flatten(svg).some(x=>x.attrs['data-trail-node']!==undefined));
tap(initial.x,initial.y);
assert.equal(picked.length,count,'disabled selection mode must not add nodes');
canvas.setSource(mapped);
assert.equal(canvas.getState().trailPickEnabled,false,'source swap must clear selection mode');
canvas.setTrailPickEnabled(true);
const after=marker();
svg.fire('pointerdown',{clientX:after.x,clientY:after.y});
svg.fire('pointercancel',{clientX:after.x,clientY:after.y});
svg.fire('pointerup',{clientX:after.x,clientY:after.y});
assert.equal(picked.length,count,'cancelled touch must not select');
const unmatched={
 kind:'forest',historical:true,navigable:false,paths:[[[0,0],[100,0]]],
 nodesXY:[[0,0],[100,0]],
 overlay:()=>({paths:[],unmatchedEdges:0}),
 pickableNode:()=>false
};
canvas.setSource(unmatched);
canvas.setTrailPickEnabled(true);
assert(!flatten(svg).some(x=>x.attrs['data-trail-node']!==undefined));
tap(33,320);
assert.equal(picked.length,count,'unproven source lines must fail closed');
canvas.setSource(null);
assert.equal(canvas.getState().trailPickEnabled,false);
const html=read('nationwide-plan.html');
assert(html.includes('산박지도 v114 | 지도 로딩·캐시 호환성 개선'));
assert(html.includes('id="mapPickToggle"'));
assert(html.includes('onTrailNodeClick:addMapWaypoint'));
assert(html.includes('mapCanvas.setSource(view);setMapPick(false)'));
assert(html.includes('mapCanvas.setSource(null);setMapPick(false)'));
new Function(html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>')));
console.log('PASS v113: original KNPS edge endpoints selectable, no invented nodes, drag/cancel/disabled guarded, source reset, UI wiring');
