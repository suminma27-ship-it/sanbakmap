import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES,normalizeRecord,normalizeCatalog,filterRecords,sortRecordsByName} from '../src/catalog.mjs';
const base={id:'valley-01',name:'샘플 계곡',category:'valley',lat:37.5,lon:127,region:'경기'};
test('five categories have distinct identifiers',()=>assert.deepEqual(CATEGORIES.map(c=>c.id),['mountain','island','valley','climbing','trekking']));
test('valley default is unknown for four activities',()=>assert.ok(Object.values(normalizeRecord(base).activity).every(a=>a.status==='unknown')));
test('allowance without evidence fails closed',()=>assert.equal(normalizeRecord({...base,activity:{camping:{status:'allowed'}}}).activity.camping.status,'unknown'));
test('source-and-date evidence is preserved',()=>assert.equal(normalizeRecord({...base,activity:{entry:{status:'allowed',source:'관리기관 안내',checkedAt:'2026-11-13'}}}).activity.entry.status,'allowed'));
test('invalid category, coordinates, status rejected',()=>{assert.throws(()=>normalizeRecord({...base,category:'campsite'}));assert.throws(()=>normalizeRecord({...base,lat:91}));assert.throws(()=>normalizeRecord({...base,activity:{entry:{status:'safe'}}}));});
test('common filtering',()=>{const records=[normalizeRecord(base),normalizeRecord({...base,id:'m-01',name:'다른 산',category:'mountain',region:'강원'})];assert.deepEqual(filterRecords(records,{category:'valley',region:'경기',search:'샘플'}).map(r=>r.id),['valley-01']);});

test('missing or blank coordinates cannot fabricate a Gulf of Guinea location',()=>{for(const coordinates of [{lat:null},{lon:null},{lat:''},{lon:'   '},{lat:undefined},{lon:undefined}])assert.throws(()=>normalizeRecord({...base,...coordinates}),/coordinates/);});

test('batch catalog isolates malformed and duplicate records',()=>{
 const valid={id:'valid',name:'검증용 산',category:'mountain',lat:37,lon:127};
 const {records,rejected}=normalizeCatalog([valid,{...valid,id:'broken',lat:null},valid,{...valid,id:'second'}]);
 assert.deepEqual(records.map(r=>r.id),['valid','second']);
 assert.deepEqual(rejected.map(r=>r.index),[1,2]);
 assert.match(rejected[1].reason,/Duplicate/);
 assert.throws(()=>normalizeCatalog({}),/array/);
});

test('search and region tolerate repeated whitespace without partial-region false positives',()=>{
 const records=[
  normalizeRecord({id:'sokcho',name:'설악산 대청봉',category:'mountain',lat:38.1,lon:128.4,region:'강원특별자치도 속초시'}),
  normalizeRecord({id:'wonju',name:'백운산',category:'mountain',lat:37.3,lon:127.9,region:'강원특별자치도 원주시'})
 ];
 assert.deepEqual(filterRecords(records,{region:' 강원특별자치도  ',search:'설악산   대청봉'}).map(r=>r.id),['sokcho']);
 assert.deepEqual(filterRecords(records,{region:'강원특별자치도 속초시',search:'대청봉'}).map(r=>r.id),['sokcho']);
 assert.deepEqual(filterRecords(records,{region:'강원특별자치도 속',search:''}),[]);
});

test('catalog browsing sorts Korean names without mutating source records',()=>{
 const records=['한라산','가야산','설악산'].map((name,i)=>normalizeRecord({id:'mountain-'+i,name,category:'mountain',lat:37,lon:127}));
 assert.deepEqual(sortRecordsByName(records).map(r=>r.name),['가야산','설악산','한라산']);
 assert.deepEqual(records.map(r=>r.name),['한라산','가야산','설악산']);
});

test('published catalog rejects missing or blank place provenance without hiding sourced records',()=>{
 const row={id:'source-a',name:'테스트 산',category:'mountain',lat:37,lon:127};
 const rows=[row,{...row,id:'source-b',source:'   '},{...row,id:'source-c',source:'지자체 원문'},{...row,id:'source-d',source:'https://example.org/source'}];
 const published=normalizeCatalog(rows,{requireSource:true});
 assert.deepEqual(published.records.map(r=>r.id),['source-c','source-d']);
 assert.deepEqual(published.rejected.map(r=>r.index),[0,1]);
 assert.ok(published.rejected.every(r=>/Missing place source/.test(r.reason)));
 assert.equal(normalizeCatalog(rows).records.length,4);
});
