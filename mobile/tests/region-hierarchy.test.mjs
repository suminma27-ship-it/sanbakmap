import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecord,regionOptions,filterRecords} from '../src/catalog.mjs';

const place=normalizeRecord({id:'verified-fixture',name:'검증용 장소',category:'mountain',lat:35.2,lon:128.7,region:'경상남도 창원시 성산구'});
test('province, municipality, and district prefixes are selectable',()=>{
  assert.deepEqual(regionOptions([place]),['경상남도','경상남도 창원시','경상남도 창원시 성산구']);
});
test('each administrative prefix matches the full place region',()=>{
  for(const region of regionOptions([place]))assert.deepEqual(filterRecords([place],{region}).map(p=>p.id),['verified-fixture']);
});
test('a partial city name does not match',()=>{
  assert.deepEqual(filterRecords([place],{region:'경상남도 창원'}),[]);
});
