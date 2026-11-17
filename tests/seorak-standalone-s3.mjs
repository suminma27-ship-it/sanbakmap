import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('seorak-standalone-s3.html','utf8');
assert(html.includes('새 테스트 페이지 S3 · 11/18'));
assert(html.includes('실제 설악산 등산로 지도'));
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(x=>x[1]).filter(Boolean);
assert.equal(scripts.length,2);
for(const script of scripts)new vm.Script(script);
const match=scripts[1].match(/const DATA=([^\n]+);/);
assert(match,'Embedded real data JSON missing');
const data=JSON.parse(match[1]);
assert.equal(data.lines.length,21);
const geo=JSON.parse(fs.readFileSync('data/knps-seorak-2018.geojson','utf8'));
const dem=JSON.parse(fs.readFileSync('data/nationwide-elevation/seorak-knps-v108.json','utf8'));
assert.deepEqual(data.dem,dem,'Embedded DEM differs from committed source');
let sourceLines=[];
geo.features.forEach((f,i)=>{
 if(f.properties?.facility_type!=='탐방로')return;
 const parts=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
 parts.forEach((coords,j)=>sourceLines.push({id:'knps2018:'+i+':'+j,coords}));
});
assert.equal(sourceLines.length,21);
for(const [i,line] of data.lines.entries()){
 assert.equal(line.id,sourceLines[i].id);
 assert.deepEqual(line.coords,sourceLines[i].coords,
  'Embedded source geometry must be unchanged');
}

class N {
 constructor(tag='div') {
  this.tag=tag;this.children=[];this.attrs={};this.style={};this.dataset={};
  this.active=new Set();this.classList={
   toggle:(x,on)=>{if(on)this.active.add(x);else this.active.delete(x)},
   remove:x=>this.active.delete(x)
  };
  this.textContent='';this.value='';
 }
 append(...items){
  for(const item of items){
   if(item.parentNode){const i=item.parentNode.children.indexOf(item);
     if(i!==-1)item.parentNode.children.splice(i,1);}
   item.parentNode=this;this.children.push(item);
  }
 }
 replaceChildren(...items){this.children=[];this.append(...items)}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]}
 addEventListener(kind,fn){(this.listeners??={})[kind]=fn}
}
const nodes=new Map();
const get=id=>{if(!nodes.has(id))nodes.set(id,new N(id));return nodes.get(id)};
const document={
 getElementById:get,
 createElement:t=>new N(t),
 createElementNS:(ns,t)=>new N(t),
 querySelectorAll:q=>{
  if(q==='#sourceLines button')return get('sourceLines').children;
  if(q==='#plans button')return get('plans').children;
  throw Error('Unsupported query selector '+q);
 }
};
const context=vm.createContext({window:{atob},document,atob,console});
vm.runInContext(scripts[0],context);
vm.runInContext(scripts[1],context);
assert.match(get('loadStatus').textContent,/S3 정상/,'Standalone should initialize');
assert.equal(get('plans').children.length,5);
assert.equal(get('sourceLines').children.length,21);
const svg=get('map').children.find(x=>x.tag==='svg');
assert(svg,'Fallback coordinate map not rendered');
assert.equal(svg.children.filter(x=>x.tag==='path').length,21);
assert(get('profile').children.some(x=>x.tag==='path'),
 'First DEM profile should render without external network dependencies');
assert.match(get('distance').textContent,/거리 \d/);
get('plans').children[0].onclick();
assert(!get('profile').children.some(x=>x.tag==='path'),
 'Do not fake full-course DEM graphs for five named plans');
get('sourceLines').children[5].onclick();
assert(get('profile').children.some(x=>x.tag==='path'),
 'A raw source trail should restore its verified DEM graph');
console.log('PASS S3 standalone: 21 real source lines, matching 2018 KNPS geometry, matching DEM, clickable SVG, route plans cannot invent profiles');
