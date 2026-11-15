import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecord} from '../src/catalog.mjs';

const base={id:'fixture-valley',name:'테스트 계곡',category:'valley',lat:37.5,lon:127.1};
test('unknown activity never presents evidence as a completed permission check',()=>{
  const record=normalizeRecord({...base,activity:{entry:{status:'unknown',source:'관리기관 안내',checkedAt:'2020-01-01'}}});
  assert.deepEqual(record.activity.entry,{status:'unknown',source:'',checkedAt:''});
});
test('valid confirmed restriction retains evidence while unverified permission fails closed',()=>{
  const record=normalizeRecord({...base,activity:{
    camping:{status:'prohibited',source:'관리기관 안내',checkedAt:'2020-01-01'},
    cooking:{status:'allowed',source:'',checkedAt:'2020-01-01'}
  }});
  assert.deepEqual(record.activity.camping,{status:'prohibited',source:'관리기관 안내',checkedAt:'2020-01-01'});
  assert.deepEqual(record.activity.cooking,{status:'unknown',source:'',checkedAt:''});
});
