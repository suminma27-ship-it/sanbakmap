import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog} from '../src/catalog.mjs';

test('punctuation-wrapped placeholders are not source evidence',()=>{
  for(const source of ['TODO:','(미확인)','[pending]','출처 없음?','UNKNOWN!','N/A:','확인 예정:','TBD ()']){
    assert.equal(hasEvidenceSource(source),false,source);
    const {records,rejected}=normalizeCatalog([{id:'v1',name:'테스트',category:'valley',lat:37,lon:127,source}],{requireSource:true});
    assert.equal(records.length,0,source);
    assert.equal(rejected.length,1,source);
  }
});
test('genuine non-placeholder source strings remain accepted',()=>{
  assert.equal(hasEvidenceSource('국립공원공단 공지 2026-01-01'),true);
  assert.equal(hasEvidenceSource('https://www.forest.go.kr/'),true);
});
