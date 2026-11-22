import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const catalog=JSON.parse(readFileSync('data/seorak-predefined-routes.json','utf8'));
assert.equal(catalog.schema,'sanbak-predefined-route-catalog-v1');
const counts=Object.fromEntries(['대표','추가','종주'].map(k=>[k,catalog.routes.filter(r=>r.group===k).length]));
assert.deepEqual(counts,{'대표':6,'추가':9,'종주':8});
const required=[
'소공원 → 비선대 → 희운각 → 대청봉',
'소공원 → 비선대 → 마등령 → 공룡능선 → 대청봉',
'오색약수 → 대청봉',
'십이선녀탕 → 귀때기청봉 → 대청봉',
'백담계곡 → 대청봉',
'한계령 → 대청봉'
];
assert.deepEqual(catalog.routes.filter(r=>r.group==='대표').map(r=>r.name),required);
const ids=new Set();
for(const route of catalog.routes){
 assert(!ids.has(route.id));ids.add(route.id);
 assert(Array.isArray(route.via)&&route.via.length>=2);
 assert.equal(route.geometryStatus,'unverified','가짜 완성경로 금지');
 assert.equal(route.profileStatus,'unverified','가짜 전체 고도그래프 금지');
 assert.equal(route.geometryFile,null);
 assert.equal(route.profileFile,null);
}
const page=readFileSync('seorak-courses.html','utf8');
for(const str of ['./data/seorak-predefined-routes.json','./data/knps-seorak-2018.geojson','id="gate"','LNT','loadReference()','id="graph"'])assert(page.includes(str),'설악산 샘플 기능 누락: '+str);
const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert.equal(scripts.length,1);
new vm.Script(scripts[0],{filename:'seorak-courses:inline.js'});
const deploy=readFileSync('.github/workflows/deploy-pages.yml','utf8');
assert(deploy.includes('cp index.html mountain-trails.html seorak-isolated-test.html seorak-courses.html site/'));
assert(deploy.includes('cp data/knps-seorak-2018.geojson data/seorak-predefined-routes.json site/data/'));
console.log('PASS Seoraksan predefined catalog',counts,'no fabricated route shape or profile');
