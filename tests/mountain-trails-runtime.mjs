import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const page=fs.readFileSync('mountain-trails.html','utf8');
assert(!page.includes('<script src="./national_data.js"'),
 'Empty legacy national_data.js must not be a dependency');
assert(page.includes("Object.entries(state.index.mountains)"),
 'Published mountain catalog must initialize from actual 2,902 mountain index');
assert(page.includes('function drawFallback()'),'No-CDN trail fallback missing');
const source=fs.readFileSync('core/nationwide-source-loader.js','utf8');
const elev=fs.readFileSync('core/mountain-line-profile.js','utf8');
const script=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(x=>x[1]).filter(x=>x.trim());
assert.equal(script.length,1,'Expected one inline app script');

class FakeNode {
 constructor(tag='div') {
  this.tag=tag;this.children=[];this.attributes={};this.style={};this.dataset={};
  this.value='';this.disabled=false;this.hidden=false;this.textContent='';
 }
 append(...nodes){for(const n of nodes){if(n.parentNode){const i=n.parentNode.children.indexOf(n);if(i>=0)n.parentNode.children.splice(i,1)}n.parentNode=this;this.children.push(n)}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 cloneNode(){const copy=new FakeNode(this.tag);copy.attributes={...this.attributes};copy.style={...this.style};return copy}
 removeAttribute(name){delete this.attributes[name]}
 setAttribute(name,value){this.attributes[name]=String(value)}
 getAttribute(name){return this.attributes[name]}
 addEventListener(name,callback){(this.listeners??={})[name]=callback}
 get options(){return this.children}
 get layers(){return this.children}
}
function makeDom(){
 const ids=new Map();
 return {
  getElementById:id=>{if(!ids.has(id))ids.set(id,new FakeNode(id));return ids.get(id)},
  createElement:tag=>new FakeNode(tag),
  createElementNS:(ns,tag)=>new FakeNode(tag)
 };
}
function fakeLeaflet(){
 const group={parts:[],addTo(){return this},clearLayers(){this.parts=[]},
 getLayers(){return this.parts},getBounds(){return [[38.0,128.1],[38.3,128.6]]}};
 const obj=()=>({addTo(){return this},setView(){return this},fitBounds(){return this},
  on(name,callback){(this.listeners??={})[name]=callback;return this}});
 const stub={
  map:()=>obj(),tileLayer:()=>obj(),featureGroup:()=>group,
  control:{layers:()=>obj()},
  polyline:(coords,style)=>({coords,style,
   getBounds(){return {isValid:()=>true}},
   on(name,callback){this[name]=callback;return this},
   bindTooltip(){return this},
   setStyle(style){this.style=style;return this},
   bringToFront(){return this},
   addTo(){group.parts.push(this);return this}})
 };
 return {stub,group};
}
async function scenario(withLeaflet){
 const document=makeDom(),L=withLeaflet?fakeLeaflet():null;
 const window={atob};
 if(L)window.L=L.stub;
 const fetch=async path=>{
  const relative=path.split('?')[0].replace(/^\.\//,'');
  if(!/^data\/[a-z0-9-/]+\.(json|geojson)$/.test(relative))throw Error('Unknown source '+path);
  const data=JSON.parse(fs.readFileSync(relative,'utf8'));
  return {ok:true,json:async()=>data};
 };
 const context=vm.createContext({window,document,fetch,console,atob,
  AbortController,setTimeout,clearTimeout,
  L:L?.stub,Option:class extends FakeNode{constructor(t,v){super('option');this.textContent=t;this.value=v}}});
 vm.runInContext(source,context,{filename:'nationwide-source-loader.js'});
 vm.runInContext(elev,context,{filename:'mountain-line-profile.js'});
 vm.runInContext(script[0],context,{filename:'mountain-trails:runtime.js'});
 let actual;
 for(let i=0;i<150;i++){
  await new Promise(resolve=>setTimeout(resolve,10));
  actual=document.getElementById('lineCount').textContent;
  if(actual==='원본 선형 21개')break;
  const status=document.getElementById('status').textContent;
  if(status.includes('실패')||status.includes('오류'))throw Error(status);
 }
 assert.equal(actual,'원본 선형 21개', 'Actual Seorak source trails must render');
 assert.equal(document.getElementById('elevCount').textContent,'원본 DEM 표본 확보');
 const svg=document.getElementById('profile');
 assert(svg.children.some(x=>x.tag==='path'),
  'First selected KNPS line must render DEM profile path');
 assert.match(document.getElementById('distance').textContent,/거리 \d/);
 assert.equal(document.getElementById('registeredCoursesLink').getAttribute('href'),'./courses-20261127-r10.html?mountain=428302602','선택 산에 대응하는 공통 코스 링크');
 if(withLeaflet){
  assert.equal(L.group.parts.length,42,'21 visible source lines and 21 touch targets should be layered');
  assert.equal(L.group.parts.filter(x=>x.style?.weight===22).length,21,
   'Every real line must have a 22px mobile touch target');
  assert(L.group.parts.some(x=>x.style?.color==='#145d3e'),
   'Exactly selected path should have strong color');
 }else{
  const overlay=document.getElementById('map').children.find(x=>x.tag==='svg');
  assert(overlay,'No-CDN fallback should show source geometry');
  assert.equal(overlay.children.filter(x=>x.tag==='path').length,42,
   'All 21 source polylines and 21 fallback touch targets must render');
  assert.equal(overlay.children.filter(x=>x.tag==='path'&&x.attributes['stroke-width']==='22').length,21,
   'SVG fallback must keep one 22px touch target per source line');
 }
 return withLeaflet?'Leaflet + real KNPS':'Native SVG fallback + real KNPS';
}
for(const mode of [false,true]){
 console.log('PASS mountain map runtime',await scenario(mode));
}
