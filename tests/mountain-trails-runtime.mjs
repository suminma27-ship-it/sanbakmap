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
 append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n)}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
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
 const obj=()=>({addTo(){return this},setView(){return this},fitBounds(){return this}});
 const stub={
  map:()=>obj(),tileLayer:()=>obj(),featureGroup:()=>group,
  control:{layers:()=>obj()},
  polyline:(coords,style)=>({coords,style,
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
  const relative=path.replace(/^\.\//,'');
  if(!/^data\/[a-z0-9-/]+\.(json|geojson)$/.test(relative))throw Error('Unknown source '+path);
  const data=JSON.parse(fs.readFileSync(relative,'utf8'));
  return {ok:true,json:async()=>data};
 };
 const context=vm.createContext({window,document,fetch,console,atob,
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
 assert.equal(document.getElementById('courseExamples').children.length,5,
  'All five user-supplied Seorak plans must show');
 if(withLeaflet){
  assert.equal(L.group.parts.length,21,'21 real lines should be layered over map');
  assert(L.group.parts.some(x=>x.style?.color==='#145d3e'),
   'Exactly selected path should have strong color');
 }else{
  const overlay=document.getElementById('map').children.find(x=>x.tag==='svg');
  assert(overlay,'No-CDN fallback should show source geometry');
  assert(overlay.children.filter(x=>x.tag==='path').length===21,
   'All 21 source polylines should remain selectable without Leaflet');
 }
 // Choosing an unverified route cannot invent a whole-course altitude profile.
 const plan1=document.getElementById('courseExamples').children[0];
 plan1.onclick();
 assert.match(document.getElementById('profileMessage').textContent,/미검증/);
 assert.match(document.getElementById('distance').textContent,/—/);
 assert(!document.getElementById('profile').children.some(x=>x.tag==='path'),
  'Unverified 5-course plan must not render made-up profile');
 return withLeaflet?'Leaflet + real KNPS':'Native SVG fallback + real KNPS';
}
for(const mode of [false,true]){
 console.log('PASS mountain map runtime',await scenario(mode));
}
