import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
const root={atob};const ctx={window:root};
const source=readFileSync('core/mountain-line-profile.js','utf8');
const agency=readFileSync('core/nationwide-source-loader.js','utf8');
new vm.Script(source,{filename:'mountain-line-profile.js'}).runInNewContext(ctx);
new vm.Script(agency,{filename:'nationwide-source-loader.js'}).runInNewContext(ctx);
const e=root.SanbakMountainProfiles,a=root.SanbakNationwideAgency;
assert.equal(e.version,1);
const page=readFileSync('mountain-trails.html','utf8');
assert(page.includes('./core/mountain-line-profile.js'));
assert(page.includes("forestDEM(code,entry.bucket)"));
assert(!page.includes('SanbakSeorakSegments'),'신규 화면은 구간 연결 엔진을 불러오지 않음');

assert(page.includes('id="seorakCourses"')&&page.includes('id="registeredCoursesLink"'),'코스 목록 UI 누락');
const catalog=JSON.parse(readFileSync('data/seorak-predefined-routes.json','utf8'));
assert.equal(catalog.routes.length,23);
assert(page.includes('./courses-20261127-r17.html?mountain='));
assert(page.includes("layer.setStyle(selected?{color:'#145d3e'"),
 '단일 선택 원본만 진한 녹색으로 강조해야 함');
assert(page.includes("{color:'#9aac9d',weight:3,opacity:.67}"),
 '선택되지 않은 원본 등산로는 연하게 표시해야 함');

const isolated=readFileSync('seorak-isolated-test.html','utf8');
assert(isolated.includes('./core/mountain-line-profile.js'),'독립 테스트의 고도 엔진 누락');
assert(isolated.includes('./data/nationwide-elevation/seorak-knps-v108.json'),'독립 테스트의 DEM 자료 연결 누락');
assert(isolated.includes('prof.parkLines(park,CODE)')&&isolated.includes('prof.profile(line,packed)'),'원본 선형과 검증된 DEM 연결 누락');
const isolatedScripts=[...isolated.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert.equal(isolatedScripts.length,1,'독립 테스트 스크립트 구조 오류');
for(const script of isolatedScripts)new vm.Script(script,{filename:'seorak-isolated-test:inline.js'});
const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert.equal(scripts.length,1);
for(const s of scripts)new vm.Script(s,{filename:'mountain-trails:inline.js'});
const index=JSON.parse(readFileSync('data/nationwide/index.json','utf8'));
const park=JSON.parse(readFileSync('data/knps-seorak-2018.geojson','utf8'));
const parkDEM=JSON.parse(readFileSync('data/nationwide-elevation/seorak-knps-v108.json','utf8'));
const parkLines=e.parkLines(park,'428302602');
assert.equal(parkLines.length,21,'기존 공단 선형 부분 21개만 원본 그대로 표시');
const parkProfiles=parkLines.map(l=>e.profile(l,parkDEM));
const parkReady=parkProfiles.filter(x=>x.status==='ready');
assert(parkReady.length>=15, '설악산 원본 고도자료를 실제로 표시할 수 있어야 함');
for(const p of parkReady){
 assert(p.points.length>=2&&p.distanceMeters>0);
 assert(Math.abs(p.points[0].distanceMeters)<.01);
 assert(Math.abs(p.points.at(-1).distanceMeters-p.distanceMeters)<.1);
}
const original=parkLines[0];
assert.equal(e.profile(original,null).status,'unavailable','고도 없는 산에서 그래프 생성 금지');
assert.equal(e.profile({...original,sourceId:'knps2018:999:0'},parkDEM).status,'unavailable','없는 원본 ID의 가짜 고도 금지');
assert.equal(e.profile({...original,sourceKind:'forest'},parkDEM).status,'unavailable','타 원본 기관 고도 섞지 않음');
const fragments=[];
for(let i=0;i<11;i++){
 const src=readFileSync('data/nationwide-full/part-'+String(i).padStart(2,'0')+'.js','utf8');
 const match=src.match(/\)\[(\d+)\]=/);
 assert(match&&Number(match[1])===i);
 fragments.push(JSON.parse(src.slice(match.index+match[0].length).trim().replace(/;$/,'')));
}
const bundled=JSON.parse(fragments.join(''));
for(const code of ['428302602','421504602','483100401']){
 const bucket=index.mountains[code].bucket;
 const raw=JSON.parse(gunzipSync(Buffer.from(bundled[bucket],'base64')).toString('utf8'));
 const path=code==='428302602'?'seorak-forest-v109.json':code==='421504602'?'odae-forest-v109.json':'gyeryong-forest-v109.json';
 const dem=JSON.parse(readFileSync('data/nationwide-elevation/'+path,'utf8'));
 const lines=e.forestLines(raw,code,a.decodeLine);
 const checked=lines.map(line=>e.profile(line,dem));
 const supported=checked.filter(x=>x.status==='ready');
 assert(supported.length>0,code+' 기존 등록 산림청 DEM 선형 중 하나도 그래프가 안 나옴: '+JSON.stringify(checked.slice(0,5).map(p=>p.note)));
 for(const p of supported){
  assert(p.distanceMeters>0);
  assert(p.points.every(v=>Number.isFinite(v.distanceMeters)&&Number.isFinite(v.elevationMeters)));
 }
 console.log('PASS',code,'source forest lines',lines.length,'source matched DEM graph lines',supported.length);
}
console.log('PASS Seoraksan KNPS full-source profile count',parkReady.length,'of',parkLines.length);
