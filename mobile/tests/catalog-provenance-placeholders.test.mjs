import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog} from '../src/catalog.mjs';

const base={id:'place',name:'검증용 장소',category:'mountain',lat:37.5,lon:127.1};
test('pending provenance labels are not sources',()=>{
  for(const source of ['확인 중','검토 중','조사중','자료 없음','출처 미상','미정','TODO:','[pending]']){
    assert.equal(hasEvidenceSource(source),false,source);
    const {records,rejected}=normalizeCatalog([{...base,source}],{requireSource:true});
    assert.equal(records.length,0,source);
    assert.equal(rejected.length,1,source);
  }
});
test('non-placeholder citations remain eligible for subsequent manual verification',()=>{
  for(const source of ['국립공원공단 고시 2025-01','https://www.forest.go.kr','지자체 공고문']){
    assert.equal(hasEvidenceSource(source),true,source);
    assert.equal(normalizeCatalog([{...base,source}],{requireSource:true}).records.length,1,source);
  }
});
