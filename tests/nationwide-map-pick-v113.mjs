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
 getBoundingClientRect(){return this.rect||{left:0,top:0,width:1000,height:640}}
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
tap(180,180);
assert.equal(picked.length,0,'map remains unselected until mode enabled');
assert(notices.some(x=>x.includes('길 위 노드 선택: 끔')),
 'disabled map tap must explain how to enable node selection');
assert.equal(canvas.setTrailPickEnabled(true),true);
const initial=marker();
assert.equal(mapped.pickableNode(initial.id),true);
tap(initial.x,initial.y);
assert.deepEqual(picked,[initial.id],'map tap must select exactly one original graph node');
// Real SVG viewBox is letterboxed by the default xMidYMid/meet rule.
// On wide desktop the graphic is horizontally centered, not stretched to
// the bounding box. On mobile it is vertically centered instead.
const original=picked.length;
svg.rect={left:81,top:42,width:950,height:390};
let markerWide=marker();
let q=Math.min(svg.rect.width/1000,svg.rect.height/640);
let x=svg.rect.left+(svg.rect.width-1000*q)/2+markerWide.x*q;
let y=svg.rect.top+(svg.rect.height-640*q)/2+markerWide.y*q;
tap(x,y,{pointerType:'mouse'});
assert.equal(picked.length,original+1,'desktop landscape letterbox click must select');
assert.equal(picked.at(-1),markerWide.id);
svg.rect={left:11,top:79,width:368,height:300};
let markerMobile=marker();
q=Math.min(svg.rect.width/1000,svg.rect.height/640);
x=svg.rect.left+(svg.rect.width-1000*q)/2+markerMobile.x*q;
y=svg.rect.top+(svg.rect.height-640*q)/2+markerMobile.y*q;
tap(x,y,{pointerType:'touch'});
assert.equal(picked.length,original+2,'portrait mobile letterbox tap must select');
assert.equal(picked.at(-1),markerMobile.id);
canvas.zoom(1.5);
let markerZoom=marker();
const z=1.5;
x=svg.rect.left+(svg.rect.width-1000*q)/2+
  (500+(markerZoom.x-500)*z)*q;
y=svg.rect.top+(svg.rect.height-640*q)/2+
  (320+(markerZoom.y-320)*z)*q;
tap(x,y,{pointerType:'touch'});
assert.equal(picked.length,original+3,'zoomed mobile node tap must select');
assert.equal(picked.at(-1),markerZoom.id);
// A drag should pan by CSS pixels / actual SVG meet-scale, and a subsequent
// tap at the moved marker must still resolve to the same source node.
canvas.fit();
const beforeDrag=marker();
const cx=svg.rect.left+(svg.rect.width-1000*q)/2+beforeDrag.x*q;
const cy=svg.rect.top+(svg.rect.height-640*q)/2+beforeDrag.y*q;
svg.fire('pointerdown',{clientX:180,clientY:180,pointerType:'touch'});
svg.fire('pointermove',{clientX:218,clientY:204,pointerType:'touch'});
svg.fire('pointerup',{clientX:218,clientY:204,pointerType:'touch'});
tap(cx+38,cy+24,{pointerType:'touch'});
assert.equal(picked.length,original+4,'panned mobile node must follow true SVG meet-scale');
assert.equal(picked.at(-1),beforeDrag.id);
canvas.fit();svg.rect=null;
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
assert(html.includes('산박지도 v120 | 경로 거리 제한 해제'));
assert(html.includes('id="mapPickToggle"'));
assert(html.includes('onTrailNodeClick:addMapWaypoint'));
assert(html.includes('mapCanvas.setSource(view);setMapPick(false)'));
assert(html.includes('mapCanvas.setSource(null);setMapPick(false)'));
new Function(html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>')));
console.log('PASS v115: SVG letterboxing on desktop/mobile, 1.5x zoom hit test, original KNPS endpoints, no invented nodes, pan/cancel/reset');
