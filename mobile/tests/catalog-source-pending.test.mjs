import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog,normalizeRecord} from '../src/catalog.mjs';
const row={id:'test-place',name:'테스트 장소',category:'valley',lat:37,lon:127};
test('pending verification labels cannot be published as provenance',()=>{
  for(const source of ['T.B.D.','TO-DO','pending','추후 확인','확인 예정','출처 없음','UNVERIFIED']){
    assert.equal(hasEvidenceSource(source),false,source);
    assert.equal(normalizeCatalog([{...row,source}],{requireSource:true}).records.length,0,source);
    assert.equal(normalizeRecord({...row,activity:{entry:{status:'allowed',source,checkedAt:'2020-01-01'}}}).activity.entry.status,'unknown',source);
  }
});
test('specific evidence labels are not mistakenly treated as placeholders',()=>{
  assert.equal(hasEvidenceSource('국립공원공단 공고 2026-01'),true);
  assert.equal(hasEvidenceSource('https://www.knps.or.kr'),true);
});
