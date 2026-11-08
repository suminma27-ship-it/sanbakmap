import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('nationwide-plan.html');
const rootCode=page.slice(page.lastIndexOf('<script>')+8,page.lastIndexOf('</script>'));
const elements=new Map();
class Element {
 constructor(tag='div',id=''){this.tag=tag;this.id=id;this.children=[];this.attrs={};this.value='';
  this.style={};this.disabled=false;this.hidden=false;this.open=true;this.textContent='';this.className='';}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]??null}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=[...items];this.textContent=''}
 add(child){this.children.push(child)}
 addEventListener(type,cb){this['event_'+type]=cb}
 setPointerCapture(){}
 getBoundingClientRect(){return {width:1000,height:640,left:0,top:0}}
}
for(const m of page.matchAll(/id="([^"]+)"/g))elements.set(m[1],new Element('div',m[1]));
elements.get('sourceMode').value='knps';
const doc={
 getElementById(id){return elements.get(id)||null},
 createElement(type){return new Element(type)},
 createElementNS(ns,type){return new Element(type)},
 createTextNode(v){const e=new Element('text');e.textContent=v;return e}
};
const scope={document:doc,console,Option:class{constructor(text,value){this.textContent=text;this.value=value}},
 atob,Uint8Array,DecompressionStream,Blob,Response,Map,Set,Date,Math,Number,Promise,
 SANBAK_NATIONAL_INDEX:Array.from({length:2932},(_,i)=>({
 c:i?'999'+String(i).padStart(6,'0'):'428302602',
 n:i?'실험산 '+i:'설악산'}))};
scope.window=scope;
const context=vm.createContext(scope);
for(const name of [
 'core/nationwide-topology-v102.js','core/nationwide-route-preview-v104.js',
 'core/nationwide-pois-v105.js','core/nationwide-source-loader.js',
 'core/nationwide-map-v106.js','core/nationwide-map-view-v106.js',
 'core/nationwide-elevation-v107.js','core/nationwide-elevation-chart-v107.js',
 'core/nationwide-elevation-pack-v108.js','core/nationwide-elevation-archive-v110.js'
])vm.runInContext(read(name),context,{filename:name});
const knps=JSON.parse(read('data/knps-seorak-2018.geojson'));
const graph=scope.SanbakTopologyV102.build(scope.SanbakTopologyV102.historicKnps(knps),{sourceGeometry:'original'});
const responses={
 './data/nationwide-topology/index.json':{schema:'sanbak-topology-audit-index-v102',counts:{mountains:2902},source_zip_sha256:'7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a',mountains:{}},
 './data/nationwide-pois/index.json':JSON.parse(read('data/nationwide-pois/index.json')),
 './data/nationwide-elevation/index.json':JSON.parse(read('data/nationwide-elevation/index.json')),
 './data/nationwide-elevation/online-v110.json':JSON.parse(read('data/nationwide-elevation/online-v110.json')),
 './data/knps-seorak-topology-v102.json':{mountainCode:'428302602',graph},
 './data/knps-seorak-2018.geojson':knps,
 './data/nationwide-elevation/seorak-knps-v108.json':JSON.parse(read('data/nationwide-elevation/seorak-knps-v108.json'))
};
scope.fetch=async path=>{
 if(!Object.hasOwn(responses,path))throw new Error('unexpected fetch '+path);
 return {ok:true,json:async()=>responses[path]};
};
vm.runInContext(rootCode,context,{filename:'nationwide-plan.html'});
await new Promise(r=>setTimeout(r,50));
const chart=elements.get('elevationChart'),notice=elements.get('elevationStatus');
assert.equal(elements.get('sourceMode').value,'knps');
assert.equal(elements.get('elevationDemo').disabled,false,'DEM example must be enabled when verified samples loaded');
assert(chart.children.some(x=>x.tag==='path'&&x.attrs.d?.startsWith('M')),
 'The first render must draw an actual DEM polyline without manual selection');
assert(notice.textContent.includes('원본 GIS 대응 고도 예시 표시 중'));
assert(elements.get('waypoints').children.length>=2,'auto-demo must show its selected original nodes');
elements.get('clear').onclick();
assert(!chart.children.some(x=>x.tag==='path'&&x.attrs.d?.startsWith('M')),
 'clearing waypoints must remove former DEM graph');
elements.get('elevationDemo').onclick();
assert(chart.children.some(x=>x.tag==='path'&&x.attrs.d?.startsWith('M')),
 'explicit replay button must restore the DEM graph');
console.log('PASS v108 live DOM smoke: initial Seorak loads actual DEM profile SVG, clear/replay works, no blank graph');
