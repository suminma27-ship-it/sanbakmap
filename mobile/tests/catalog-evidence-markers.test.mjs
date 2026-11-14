import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog,normalizeRecord} from '../src/catalog.mjs';

test('punctuation and spacing cannot disguise missing provenance',()=>{
  for(const source of ['N/A.','n - a','UNKNOWN.','미 확인','확인-안됨','—',' _ / ','null.']){
    assert.equal(hasEvidenceSource(source),false,source);
  }
  for(const source of ['국립공원공단 공지','https://www.knps.or.kr','지자체 안내']){
    assert.equal(hasEvidenceSource(source),true,source);
  }
});

test('published place and valley allowance fail closed on disguised missing source',()=>{
  const row={id:'test-only',name:'테스트 전용',category:'valley',lat:37,lon:127,source:'N/A.',activity:{entry:{status:'allowed',source:'UNKNOWN.',checkedAt:'2020-01-01'}}};
  assert.equal(normalizeCatalog([row],{requireSource:true}).records.length,0);
  assert.equal(normalizeRecord(row).activity.entry.status,'unknown');
});
