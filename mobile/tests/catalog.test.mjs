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
 assert.deepEqual(published.records.map(r=>r.id),['source-c']);
 assert.deepEqual(published.rejected.map(r=>r.index),[0,1,3]);
 assert.ok(published.rejected.every(r=>/Missing place source/.test(r.reason)));
 assert.equal(normalizeCatalog(rows).records.length,4);
});


test('place checkedAt requires both a valid past date and a nonblank source',()=>{
 const row={...base,checkedAt:'2020-01-01'};
 assert.equal(normalizeRecord(row).checkedAt,'');
 assert.equal(normalizeRecord({...row,source:'   '}).checkedAt,'');
 assert.equal(normalizeRecord({...row,source:'관리기관'}).checkedAt,'2020-01-01');
 assert.equal(normalizeRecord({...row,source:'관리기관',checkedAt:'2099-01-01'}).checkedAt,'');
});


test('Null Island sentinel is never published as a Korean place',()=>{
 for(const coordinates of [{lat:0,lon:0},{lat:'0',lon:'0'},{lat:-0,lon:0}])assert.throws(()=>normalizeRecord({...base,...coordinates}),/Null Island/);
 const rows=[{...base,id:'sentinel',lat:0,lon:0},{...base,id:'real',source:'지자체 원문'}];
 const result=normalizeCatalog(rows,{requireSource:true});
 assert.deepEqual(result.records.map(r=>r.id),['real']);
 assert.deepEqual(result.rejected.map(r=>r.index),[0]);
});

test('unverified restricted and prohibited valley claims remain unknown',()=>{
 for(const status of ['restricted','prohibited','allowed']){
  for(const item of [{status},{status,source:'TODO',checkedAt:'2026-11-14'},{status,source:'관리기관 안내',checkedAt:'2099-01-01'}]){
   assert.deepEqual(normalizeRecord({...base,activity:{entry:item}}).activity.entry,{status:'unknown',source:'',checkedAt:''});
  }
  assert.equal(normalizeRecord({...base,activity:{entry:{status,source:'관리기관 안내',checkedAt:'2026-11-14'}}}).activity.entry.status,status);
 }
});


test('search matches compatibility-equivalent names and regions',()=>{
 const records=[normalizeRecord({id:'compat-1',name:'백운산 1코스',category:'mountain',lat:37,lon:127,region:'강원특별자치도 원주시'})];
 assert.deepEqual(filterRecords(records,{search:'백운산 １코스',region:'강원특별자치도　원주시'}).map(r=>r.id),['compat-1']);
 assert.deepEqual(filterRecords(records,{search:'백운산 ２코스'}),[]);
});

test('published IDs reject case and full-width equivalent duplicates',()=>{
 const row={id:'Mountain-A',name:'검증용 산',category:'mountain',lat:37,lon:127,source:'지자체 원문'};
 const rows=[row,{...row,id:'ｍｏｕｎｔａｉｎ－ａ'},{...row,id:'mountain-a'},{...row,id:'Mountain-B'}];
 const result=normalizeCatalog(rows,{requireSource:true});
 assert.deepEqual(result.records.map(r=>r.id),['Mountain-A','Mountain-B']);
 assert.deepEqual(result.rejected.map(r=>r.index),[1,2]);
 assert.ok(result.rejected.every(r=>/Duplicate place id/.test(r.reason)));
});


test('published IDs reject whitespace and compatibility-equivalent duplicates',()=>{
 const row={id:'Route  A',name:'검증용 산',category:'mountain',lat:37,lon:127,source:'지자체 원문'};
 const result=normalizeCatalog([row,{...row,id:'route a'},{...row,id:'ＲＯＵＴＥ　Ａ'},{...row,id:'Route B'}],{requireSource:true});
 assert.deepEqual(result.records.map(r=>r.id),['Route  A','Route B']);
 assert.deepEqual(result.rejected.map(r=>r.index),[1,2]);
 assert.ok(result.rejected.every(r=>/Duplicate place id/.test(r.reason)));
});
