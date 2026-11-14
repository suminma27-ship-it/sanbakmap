import test from 'node:test';
import assert from 'node:assert/strict';
import {filterRecords,normalizeRecord} from '../src/catalog.mjs';

test('decomposed Korean search matches composed place names',()=>{
 const records=[normalizeRecord({id:'seorak',name:'설악산 대청봉',category:'mountain',lat:38.1,lon:128.4,region:'강원특별자치도 속초시'})];
 assert.deepEqual(filterRecords(records,{search:'설악산'}).map(r=>r.id),['seorak']);
 assert.deepEqual(filterRecords(records,{region:'강원특별자치도',search:'대청봉'}).map(r=>r.id),['seorak']);
 assert.deepEqual(filterRecords(records,{region:'강원특별자치도 속',search:''}),[]);
});
