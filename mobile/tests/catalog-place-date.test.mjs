import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecord} from '../src/catalog.mjs';
const base={id:'place-date',name:'검증 날짜 테스트',category:'island',lat:34.5,lon:126.5,source:'관리기관 원문'};
test('catalog check date never presents invalid or future dates as verified',()=>{
 for(const checkedAt of ['2026-02-30','2025-02-29','2099-01-01','2026/11/13','']) {
  assert.equal(normalizeRecord({...base,checkedAt}).checkedAt,'',checkedAt);
 }
});
test('catalog check date preserves genuine past calendar date',()=>{
 assert.equal(normalizeRecord({...base,checkedAt:'2024-02-29'}).checkedAt,'2024-02-29');
});
test('missing catalog verification date does not invent permission',()=>{
 const row=normalizeRecord({...base,category:'valley',checkedAt:'2099-01-01'});
 assert.equal(row.checkedAt,'');
 assert.ok(Object.values(row.activity).every(item=>item.status==='unknown'));
});
