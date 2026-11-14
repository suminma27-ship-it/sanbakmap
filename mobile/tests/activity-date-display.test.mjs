import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecord} from '../src/catalog.mjs';

const base={id:'date-check',name:'테스트 전용 계곡',category:'valley',lat:37,lon:127};
function activity(status,checkedAt,source='관리기관 안내'){
  return normalizeRecord({...base,activity:{entry:{status,checkedAt,source}}}).activity.entry;
}
test('invalid calendar date is not displayed as verified for prohibited status',()=>{
  assert.deepEqual(activity('prohibited','2026-02-30'),{status:'prohibited',source:'관리기관 안내',checkedAt:''});
});
test('future restricted date is unverified but restriction remains',()=>{
  assert.deepEqual(activity('restricted','2099-01-01'),{status:'restricted',source:'관리기관 안내',checkedAt:''});
});
test('valid historical prohibited date is retained',()=>{
  assert.equal(activity('prohibited','2020-01-01').checkedAt,'2020-01-01');
});
test('allowed with future evidence remains unknown',()=>{
  assert.equal(activity('allowed','2099-01-01').status,'unknown');
});
