import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Minimal DOM exercise of the deployed entrypoint with the real checked-in
// catalog, KNPS source line and DEM. No invented course geometry.
class Element {
 constructor(tag='div',id=''){this.tagName=tag;this.id=id;this.children=[];this.style={};this.dataset={};this.attrs={};this.hidden=false;this.textContent='';this.listeners={};this.parentNode=null}
 append(...args){for(const child of args){this.children.push(child);if(child instanceof Element)child.parentNode=this}}
 replaceChildren(...args){this.children=[];this.append(...args)}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]}
 addEventListener(k,callback){this.listeners[k]=callback}
 scrollIntoView(){}
}
const ids=['map','fallback','graph','title','via','distance','status','count','courses','tryVerified','mapState','baseStatus','gate','agree','decline'];
const elements=Object.fromEntries(ids.map(id=>[id,new Element('div',id)]));
const tabs=['대청봉','기타코스','종주코스'].map(group=>{const button=new Element('button');button.dataset.group=group;return button});
const basemaps=['normal','terrain'].map(mode=>{const button=new Element('button');button.dataset.base=mode;return button});
const document={
 body:new Element('body'),
 getElementById:id=>elements[id]||(elements[id]=new Element('div',id)),
 createElement:tag=>new Element(tag),
 createElementNS:(namespace,tag)=>new Element(tag),
 querySelectorAll:query=>query==='.tab'?tabs:query==='.basemap'?basemaps:[],
 querySelector:query=>query==='#map'?elements.map:null
};
const source=readFileSync('seorak-courses.html','utf8');
assert(source.includes('const generation=++selectionGeneration'),'선택 변경마다 세대 번호 증가');
assert(source.includes('if(selected!==route||selectionGeneration!==generation)return;'),'이전 요청의 늦은 결과 무시');
assert(source.includes('if(selected===route&&selectionGeneration===generation)'),'이전 요청 실패가 현재 코스 오류로 표시되지 않음');
const scripts=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(scripts.length,1);
const files={
 './data/seorak-predefined-routes.json':'data/seorak-predefined-routes.json',
 './data/knps-seorak-2018.geojson':'data/knps-seorak-2018.geojson',
 './data/seorak-osaek-daecheong-2018.geojson':'data/seorak-osaek-daecheong-2018.geojson',
 './data/seorak-osaek-daecheong-dem.json':'data/seorak-osaek-daecheong-dem.json'
};
const fetch=async path=>{
 if(!Object.hasOwn(files,path)&&!/^\.\/data\/seorak-[sta][0-9]+-reference(?:-dem\.json|\.geojson)$/.test(path))return {ok:false,status:404};
 return {ok:true,status:200,json:async()=>JSON.parse(readFileSync(files[path]||path.slice(2),'utf8'))};
};
new vm.Script(scripts[0],{filename:'seorak-courses:inline.js'}).runInNewContext({document,window:{L:null},fetch,console});
const settle=async()=>{for(let i=0;i<40;i++)await Promise.resolve()};
await settle();
assert.equal(basemaps[0].getAttribute('aria-pressed'),'true','일반지도 초기 선택');
basemaps[1].onclick();
assert.equal(basemaps[1].getAttribute('aria-pressed'),'true','지형지도 버튼 동작');
assert.match(elements.baseStatus.textContent,/미연결/,'Leaflet 없는 경우 안전한 안내');
basemaps[0].onclick();
const graphPaths=()=>elements.graph.children.filter(n=>n.tagName==='path').length;
assert.equal(elements.title.textContent,'오색약수 → 대청봉','준비된 코스가 첫 선택이어야 함');
assert.match(elements.catalogSummary.textContent,/23개 등록 · 경로·고도 참고자료 2[23]개/);
assert.match(elements.catalogDescription.textContent,/[01]개는 경로 또는 고도자료 미확인/);

assert.match(elements.status.textContent,/2018년 국립공원공단/);
assert.match(elements.distance.textContent,/4\.59 km/);
assert.equal(graphPaths(),1,'원본 DEM 실제 SVG 선형이 표시돼야 함');
assert.equal(elements.tryVerified.hidden,true);
assert.equal(elements.mapState.hidden,true);
assert(elements.map.children.length,'Leaflet 미연결이어도 fallback 선형 지도 렌더링');
const fallbackSvg=elements.map.children.find(node=>node.tagName==='svg');
assert(fallbackSvg,'Leaflet 미연결이면 SVG 대체 지도가 있어야 함');
const endpointLabels=fallbackSvg.children.filter(node=>node.tagName==='text').map(node=>node.textContent);
assert(endpointLabels.includes('오색'),'실제 출발점 이름을 SVG 지도에 표시');
assert(endpointLabels.includes('대청봉'),'실제 도착점 이름을 SVG 지도에 표시');

const firstList=elements.courses.children;
assert.equal(firstList.length,6);
assert(firstList[2].dataset.ready==='true','오색 코스 준비 마크');
firstList[0].onclick();
await settle();
assert.equal(graphPaths(),1,'천불동계곡 기존 DEM 그래프 표시');
assert.match(elements.distance.textContent,/자료 제공 구간 거리/);
firstList[4].onclick();
await settle();
assert.equal(graphPaths(),1,'백담사 원본 DEM 그래프 표시');
assert.match(elements.distance.textContent,/12\.13 km/);
for(const i of [1,3,5]){
 elements.courses.children[i].onclick();
 await settle();
 assert.equal(graphPaths(),1,'신규 대청봉 코스 그래프 표시');
 assert.equal(elements.mapState.hidden,true);
}
tabs[2].onclick();
await settle();
for(const i of [0,1,2,3,4,5,6,7]){
 elements.courses.children[i].onclick();
 await settle();
 assert.equal(graphPaths(),1,'신규 종주 코스 그래프 표시');
}
tabs[1].onclick();
await settle();
for(const i of [0,1,2,3,4,5,6,7]){
 elements.courses.children[i].onclick();
 await settle();
 assert.equal(graphPaths(),1,'기타코스 DEM 그래프 표시');
}
elements.courses.children[8].onclick();
await settle();
const roadReady=JSON.parse(readFileSync('data/seorak-predefined-routes.json','utf8')).routes.find(r=>r.id==='a9').profileFile;
assert.equal(graphPaths(),roadReady?1:0,'백담사 진입도로 DEM 준비 상태에 따른 출력');
assert.equal(elements.mapState.hidden,true,'고도자료와 지도 독립 표시');
elements.courses.children[5].onclick();
await settle();
assert.equal(graphPaths(),1,'대승폭포 고도그래프 표시');
assert.match(elements.distance.textContent,/0\.90 km/);
elements.tryVerified.listeners.click();
await settle();
assert.equal(elements.title.textContent,'오색약수 → 대청봉');
assert.equal(graphPaths(),1,'오색 코스 복귀 시 그래프 재표시');
assert.equal(elements.mapState.hidden,true,'그래프 표시 완료 후 지도 로딩 안내 숨김');
// Regression: reference GeoJSON may arrive after the verified route and must not
// replace its fallback SVG with the pale 21-piece background.
let releaseReference;
const delayedReference=new Promise(resolve=>{releaseReference=resolve});
const raceElements=Object.fromEntries(ids.map(id=>[id,new Element('div',id)]));
const raceTabs=['대청봉','기타코스','종주코스'].map(group=>{const button=new Element('button');button.dataset.group=group;return button});
const raceDoc={
 body:new Element('body'),
 getElementById:id=>raceElements[id]||(raceElements[id]=new Element('div',id)),
 createElement:tag=>new Element(tag),
 createElementNS:(namespace,tag)=>new Element(tag),
 querySelectorAll:query=>query==='.tab'?raceTabs:[],
 querySelector:query=>query==='#map'?raceElements.map:null
};
const delayedFetch=async path=>path==='./data/knps-seorak-2018.geojson'
 ? delayedReference
 : fetch(path);
new vm.Script(scripts[0],{filename:'seorak-courses:race.js'}).runInNewContext({document:raceDoc,window:{L:null},fetch:delayedFetch,console});
await settle();
assert.match(raceElements.status.textContent,/2018년 국립공원공단/);
const before=raceElements.map.children[0];
assert(before&&before.children.some(n=>n.tagName==='path'&&n.attrs.stroke==='#146b3e'));
releaseReference(await fetch('./data/knps-seorak-2018.geojson'));
await settle();
assert.equal(raceElements.map.children[0],before,'늦은 참고선형이 선택된 완성 코스 지도를 덮으면 안 됨');
assert.equal(raceElements.graph.children.filter(n=>n.tagName==='path').length,1);
console.log('PASS Seoraksan route UI: real Osaek distance+DEM, unverified Kongryong warning, one-click return, SVG fallback');
