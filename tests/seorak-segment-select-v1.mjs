import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('core/seorak-segment-select.js','utf8');
const page=fs.readFileSync('seorak-real-overlay.html','utf8');
assert(page.includes(source),'실제 데모에 동일한 구간 선택 엔진이 포함되어 있어야 한다');
assert(page.includes('id="undo"')&&page.includes('id="reverse"'),'코스 조작 버튼 누락');

const inlineScripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(x=>x[1]).filter(s=>s.trim());
assert.equal(inlineScripts.length,2,'등산로 엔진과 지도 UI 스크립트가 있어야 한다');
for(const [idx,script] of inlineScripts.entries()){
 assert.doesNotThrow(()=>new vm.Script(script,{filename:'seorak-real-overlay:inline-'+idx+'.js'}),
  '실제 HTML 스크립트 문법 오류');
}

assert(page.includes('profileOf(item.segment,item.reverse)'),'선택 코스 고도 연동 누락');

const ctx={};vm.runInNewContext(source,ctx);
const seg=ctx.SanbakSeorakSegments;
assert.equal(seg.version,2);

const original=JSON.parse(fs.readFileSync('data/knps-seorak-2018.geojson','utf8'));
const result=seg.build(original,{maxMeters:650,joinMeters:1});
assert.equal(result.parts.length,21,'공단 2018 원본 탐방로 부분 개수');
assert(result.segments.length>21,'긴 원본을 여러 선택 구간으로 분할해야 한다');
for(const p of result.parts){
 const chunks=result.segments.filter(x=>x.sourceId===p.sourceId);
 assert(chunks.length>=1,'원본마다 최소 하나의 선택 구간');
 const total=chunks.reduce((s,x)=>s+x.meters,0);
 assert(Math.abs(total-p.meters)<.1,'원본 길이는 분할 전후 보존');
 assert.equal(chunks[0].vertexStart,0);
 assert.equal(chunks.at(-1).vertexEnd,p.coords.length-1);
 for(let i=1;i<chunks.length;i++){
  assert.equal(chunks[i-1].vertexEnd,chunks[i].vertexStart);
  assert(seg.distance(chunks[i-1].end,chunks[i].start)<.01);
 }
}
const long=result.segments.filter(s=>s.sourceId==='knps2018:9:0');
assert(long.length>5,'13km 원본에 여러 구간이 있어야 한다');
let path=[];
path=seg.append(path,long[0],{joinMeters:1}).route;
let joined=seg.append(path,long[1],{joinMeters:1});
assert(joined.ok,'원본에서 실제 이어진 다음 구간은 선택 가능');
assert.equal(joined.route.length,2);
assert(Math.abs(seg.total(joined.route)-(long[0].meters+long[1].meters))<.01);
assert.equal(seg.append(joined.route,long[0],{joinMeters:1}).reason,'duplicate');
const reversed=seg.reverse(joined.route);
assert(seg.distance(seg.startOf(reversed[0]),seg.endOf(joined.route.at(-1)))<.01);
// Source geometry has a verified tiny seam at Biseondae:
// historic trail 4 vertex 55 vs trail 5 start vertex 0, approximately 1.35 m.
// Two independent onward choices must appear after the same preceding segment.
const before=result.segments.find(s=>s.sourceId==='knps2018:18:0'&&s.vertexEnd===55);
const straight=result.segments.find(s=>s.sourceId==='knps2018:18:0'&&s.vertexStart===55);
const toMadeung=result.segments.find(s=>s.sourceId==='knps2018:21:0'&&s.vertexStart===0);
assert(before&&straight&&toMadeung,'비선대 3방향 원본 교차점 분할 실패');
assert(seg.distance(before.end,toMadeung.start)>1&&
 seg.distance(before.end,toMadeung.start)<2,
 '원본 측량 오차 1.35m 확인');
assert(seg.canJoin(before.end,before.sourceId,toMadeung.start,toMadeung.sourceId,1),
 '비선대 공단 원본 1.35m 이격 예외 누락');
for(const candidate of [straight,toMadeung]){
 const chosen=seg.append([{segment:before,reverse:false}],candidate,{joinMeters:1});
 assert(chosen.ok,'비선대에서 두 방향 모두 선택 가능해야 함');
}
assert(!seg.canJoin(before.end,'knps2018:99:0',toMadeung.start,toMadeung.sourceId,1),
 '알려지지 않은 접합에 임의 예외 적용 금지');

const unconnected=result.segments.find(s=>s.sourceId==='knps2018:14:0');
assert.equal(seg.append(joined.route,unconnected,{joinMeters:1}).reason,'not_connected');
assert.throws(()=>seg.build(original,{maxMeters:650,joinMeters:35}),/정책/);
console.log('PASS source geometry segments:',result.parts.length,'parts /',result.segments.length,'selectable segments; connected-only selection');
