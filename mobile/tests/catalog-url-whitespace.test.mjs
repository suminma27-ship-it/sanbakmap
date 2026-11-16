import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog,normalizeRecord} from '../src/catalog.mjs';

test('URL evidence rejects literal whitespace but accepts encoded spaces',()=>{
  for(const source of ['https://agency.go.kr/a b','https://agency.go.kr/ path','https://agency.go.kr/path\tmore','https://user@agency.go.kr/a']){
    assert.equal(hasEvidenceSource(source),false,source);
  }
  assert.equal(hasEvidenceSource('https://agency.go.kr/a%20b'),true);
  assert.equal(hasEvidenceSource('관리기관 안내문'),true);
});
test('invalid whitespace URL cannot publish a place or certify valley access',()=>{
  const row={id:'valley-source-test',name:'테스트 계곡',category:'valley',lat:37,lon:127,source:'https://agency.go.kr/a b',activity:{entry:{status:'allowed',source:'https://agency.go.kr/a b',checkedAt:'2020-01-01'}}};
  assert.equal(normalizeCatalog([row],{requireSource:true}).records.length,0);
  assert.equal(normalizeRecord(row).activity.entry.status,'unknown');
});
