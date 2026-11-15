import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog} from '../src/catalog.mjs';

test('placeholder-prefixed provenance cannot publish a place',()=>{
 for(const source of ['TODO: 관리기관 확인','검토 중 - 출처 추가','확인 예정: 국립공원','pending - source','미확인: 담당자 문의','출처 미상']){
  assert.equal(hasEvidenceSource(source),false,source);
  const row={id:'p',name:'검증용 장소',category:'mountain',lat:37,lon:127,source};
  assert.equal(normalizeCatalog([row],{requireSource:true}).records.length,0,source);
 }
});
test('substantive sources still pass the syntax gate',()=>{
 for(const source of ['국립공원공단 탐방안내 2026-11-01','https://www.knps.or.kr','지자체 고시 제2026-12호'])assert.equal(hasEvidenceSource(source),true,source);
});

test('missing-source prefix with explanation is still not provenance',()=>{
 for(const source of ['자료 없음: 담당자 확인','출처 없음 - 보류','미정: 확인 예정','자료없음: 추후 입력','출처 미상: 미검증']){
  assert.equal(hasEvidenceSource(source),false,source);
  const row={id:'p',name:'검증용 장소',category:'mountain',lat:37,lon:127,source};
  assert.equal(normalizeCatalog([row],{requireSource:true}).records.length,0,source);
 }
});
