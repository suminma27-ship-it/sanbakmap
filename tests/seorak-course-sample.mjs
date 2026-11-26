import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const catalog=JSON.parse(readFileSync('data/seorak-predefined-routes.json','utf8'));
assert.equal(catalog.schema,'sanbak-predefined-route-catalog-v1');
const counts=Object.fromEntries(['대청봉','기타코스','종주코스'].map(k=>[k,catalog.routes.filter(r=>r.group===k).length]));
assert.deepEqual(counts,{'대청봉':6,'기타코스':9,'종주코스':8});
const required=[
'소공원 → 비선대 → 희운각 → 대청봉',
'소공원 → 비선대 → 마등령 → 공룡능선 → 대청봉',
'오색약수 → 대청봉',
'십이선녀탕 → 귀때기청봉 → 대청봉',
'백담계곡 → 대청봉',
'한계령 → 대청봉'
];
assert.deepEqual(catalog.routes.filter(r=>r.group==='대청봉').map(r=>r.name),required);
const ids=new Set();
const ready=[];
for(const route of catalog.routes){
 assert(!ids.has(route.id));ids.add(route.id);
 assert(Array.isArray(route.via)&&route.via.length>=2);
 const complete=['verified','reference'].includes(route.geometryStatus)&&['verified','reference'].includes(route.profileStatus);
 if(complete){
  assert(route.geometryFile&&route.profileFile,'검증된 코스는 실제 파일 필수');
  assert(route.geometryFile.startsWith('./data/')&&route.profileFile.startsWith('./data/'));
  const geometry=JSON.parse(readFileSync(route.geometryFile.slice(2),'utf8'));
  const profile=JSON.parse(readFileSync(route.profileFile.slice(2),'utf8'));
  assert.equal(geometry.type,'Feature');
  assert.equal(geometry.geometry?.type,'LineString');
  assert.equal(geometry.properties?.routeId,route.id);
  assert.equal(profile.routeId,route.id);
  assert.equal(profile.sourceId,geometry.properties?.sourceId);
  assert.equal(profile.schema,'sanbak-predefined-dem-profile-v1');
  assert.equal(geometry.properties?.currentAccessVerified,false);
  assert.equal(profile.currentAccessVerified,false);
  const coords=geometry.geometry.coordinates;
  assert(coords.length>1&&coords.every(p=>p.length>=2&&p.slice(0,2).every(Number.isFinite)));
  const rad=Math.PI/180,R=6371008.8;
  let metres=0,maxStep=0;
  for(let i=1;i<coords.length;i++){
   const a=coords[i-1],b=coords[i],dLat=(b[1]-a[1])*rad,dLon=(b[0]-a[0])*rad;
   const h=Math.sin(dLat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dLon/2)**2;
   const step=2*R*Math.asin(Math.min(1,Math.sqrt(h)));
   metres+=step;maxStep=Math.max(maxStep,step);
  }
  assert(maxStep<=500,'좌표 사이 500m 초과 공백: 실제 연속 코스가 아닐 수 있음');
  assert(Math.abs(profile.totalMeters-metres)<Math.max(30,metres*.02),'실제 선형과 DEM 거리 일치');
  assert(Array.isArray(profile.points)&&profile.points.length>=2);
  assert(profile.points.every((p,i)=>Number.isFinite(p.distanceMeters)&&Number.isFinite(p.elevationMeters)&&p.distanceMeters>=0&&(!i||p.distanceMeters>=profile.points[i-1].distanceMeters)));
  assert(Math.abs(profile.points.at(-1).distanceMeters-metres)<Math.max(30,metres*.02),'고도표본 전체 코스 커버');
  ready.push(route.id);
 }else{
  assert.equal(route.geometryStatus,'unverified','부분 완료를 검증 완료로 표기 금지');
  assert.equal(route.profileStatus,'unverified','부분 완료를 검증 완료로 표기 금지');
  assert.equal(route.geometryFile,null,'미검증 코스 가짜 선형 금지');
  assert.equal(route.profileFile,null,'미검증 코스 가짜 고도 금지');
 }
}
assert(ready.includes('s1')&&ready.includes('s5'),'새 참고 코스 등록');
assert(ready.includes('s3'),'2018 오색 원본 회귀 테스트 보존');
const geo=JSON.parse(readFileSync('data/seorak-osaek-daecheong-2018.geojson','utf8'));
const dem=JSON.parse(readFileSync('data/seorak-osaek-daecheong-dem.json','utf8'));
const source=JSON.parse(readFileSync('data/knps-seorak-2018.geojson','utf8'));
const sourceLine=source.features[23].geometry.coordinates;
assert.deepEqual(geo.geometry.coordinates,sourceLine,'원본 탐방로를 임의 수정/연결하지 않음');
assert.equal(geo.properties?.routeId,'s3');
assert.equal(geo.properties?.sourceId,'knps2018:23:0');
assert.equal(geo.properties?.currentAccessVerified,false);
assert.equal(dem.routeId,'s3');
assert.equal(dem.sourceId,'knps2018:23:0');
assert.equal(dem.currentAccessVerified,false);
assert(dem.points.length>=50);
// DEM must cover the entire route at a useful resolution, not just two endpoints.
const profileGaps=dem.points.slice(1).map((p,i)=>p.distanceMeters-dem.points[i].distanceMeters);
assert(Math.max(...profileGaps)<=250,'오색 코스 DEM 표본 간격 250m 이내');
const pageSource=readFileSync('seorak-courses.html','utf8');
assert(pageSource.includes('p.distanceMeters-pts[i-1].distanceMeters<=250'),'고도표본 공백은 선을 끊어 표시');
assert(dem.points.every((p,i)=>Number.isFinite(p.distanceMeters)&&Number.isFinite(p.elevationMeters)&&(!i||p.distanceMeters>dem.points[i-1].distanceMeters)));
const R=6371008.8,radian=Math.PI/180;
let distance=0;
for(let i=1;i<sourceLine.length;i++){const a=sourceLine[i-1],b=sourceLine[i],dLat=(b[1]-a[1])*radian,dLon=(b[0]-a[0])*radian,h=Math.sin(dLat/2)**2+Math.cos(a[1]*radian)*Math.cos(b[1]*radian)*Math.sin(dLon/2)**2;distance+=2*R*Math.asin(Math.min(1,Math.sqrt(h)))}
assert(Math.abs(dem.totalMeters-distance)<1);
assert(Math.abs(dem.points.at(-1).distanceMeters-distance)<1);
const page=readFileSync('seorak-courses.html','utf8');
for(const str of ['./data/seorak-predefined-routes.json','./data/knps-seorak-2018.geojson','id="gate"','LNT','loadReference()','id="graph"'])assert(page.includes(str),'설악산 샘플 기능 누락: '+str);
// Route labels must follow selected catalog metadata, not stay hard-coded to Osaek.
assert(page.includes("const startLabel=geometry.properties.startLabel||route.via[0],endLabel=route.via.at(-1)"));
assert(page.includes("bindTooltip(startLabel+' (원본 출발점)'"));
assert(page.includes("bindTooltip(endLabel+' (원본 종점)'"));
assert(page.includes("[[a,startLabel,17],[b,endLabel,-12]]"));
const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert.equal(scripts.length,1);
new vm.Script(scripts[0],{filename:'seorak-courses:inline.js'});
const deploy=readFileSync('.github/workflows/deploy-pages.yml','utf8');
assert(deploy.includes('cp index.html mountain-trails.html seorak-isolated-test.html seorak-courses.html site/'));
assert(deploy.includes('data/knps-seorak-2018.geojson data/seorak-predefined-routes.json') && deploy.includes('site/data/'),'배포 패키지에 설악산 원본 및 코스 목록 포함');
console.log('PASS Seoraksan predefined catalog',counts,ready.length+' validated routes, '+(catalog.routes.length-ready.length)+' unverified');
