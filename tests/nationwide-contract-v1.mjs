// Shared nationwide contract smoke test: one rule set, no new route claims.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../core/nationwide-data-contract.js',import.meta.url),'utf8');
const fake={};
new Function('window',src)(fake);
const m=fake.SanbakNationwideContract;
assert(m&&m.version===1);
const base={type:'Feature',properties:{highway:'path'},geometry:{type:'LineString',coordinates:[[128.42,38.1],[128.43,38.11]]}};
function ingest(properties,id='1'){
 return m.normalizeLine({...base,properties},{dataset:'osm-2026',sourceID:id,mountainCode:'428302602'});
}
for(const [properties,category] of [
 [{highway:'path'},'trail'],
 [{highway:'steps'},'trail'],
 [{highway:'track'},'forest_road'],
 [{highway:'footway'},'uncertain_footway'],
 [{highway:'pedestrian'},'uncertain_footway'],
 [{highway:'footway',footway:'sidewalk'},'excluded'],
 [{highway:'path',access:'no'},'excluded'],
 [{source_kind:'national_trail'},'trail'],
 [{source_kind:'national_forest_road'},'forest_road'],
 [{highway:'residential'},'review']
]){
 const r=ingest(properties);assert(r.ok);
 assert.equal(r.line.display_category,category);
 assert.equal(r.line.routing_allowed,false);
 assert.equal(r.line.synthetic_connection,false);
 assert.equal(r.line.current_access_verified,false);
 assert.equal(r.line.source_node_identity_verified,false);
 assert.equal(m.statusOf(r.line).route,'not_verified');
}
const line=ingest({highway:'path'}).line;
assert.deepEqual(line.geometry.coordinates,base.geometry.coordinates);
line.geometry.coordinates[0][0]+=0.01;
assert.notDeepEqual(line.geometry.coordinates,base.geometry.coordinates,'Source coords must not be mutated');
assert.equal(ingest({highway:'footway'},'2').line.id,'osm-2026:2');
assert.equal(m.normalizeLine({...base,geometry:{type:'Point',coordinates:[128,38]}},{dataset:'x',sourceID:'1',mountainCode:'428302602'}).ok,false);
assert.equal(m.normalizeLine({...base,geometry:{type:'LineString',coordinates:[[127,37],[180,90]]}},{dataset:'x',sourceID:'1',mountainCode:'428302602'}).ok,false);
assert.equal(m.normalizeLine(base,{dataset:'',sourceID:'1',mountainCode:'428302602'}).ok,false);
assert.equal(m.normalizeLine(base,{dataset:'osm',sourceID:'1',mountainCode:'invalid'}).ok,false);
const catalog=[{c:'428302602',n:'설악산'},{c:'411101010',n:'테스트산'}];
assert.deepEqual(m.validateMountainIndex(catalog,2),{ok:true,count:2,unique_codes:2});
assert.equal(m.validateMountainIndex(catalog).ok,false,'Full nationwide target is 2,932 mountain codes');
assert.equal(m.validateMountainIndex([catalog[0],catalog[0]],2).reason,'duplicate_mountain_code');
assert.equal(m.validateMountainIndex([{c:'invalid',n:'산'}],1).ok,false);
assert.equal(m.validateMountainIndex([],null).ok,true);
const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
assert(readme.includes('## 전국 공통 개발 전환'));
const product=readFileSync(new URL('../docs/NATIONWIDE-MVP.md',import.meta.url),'utf8');
assert(product.includes('## 완료 판정'));
assert(product.includes('ZIP 파일 없이'));
assert(product.includes('검증되지 않은 구간'));
const workflow=readFileSync(new URL('../.github/workflows/deploy-pages.yml',import.meta.url),'utf8');
assert(workflow.includes('for file in tests/*.mjs; do'));
console.log('PASS nationwide contract v1: 2,932 catalog target, path/forest road class, exclusion, no invented routes');
