import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog,normalizeRecord} from '../src/catalog.mjs';
const base={id:'test-place',name:'검증용 장소',category:'valley',lat:37.5,lon:127.1,region:'경기도'};
test('hostless or credential-bearing HTTP URLs are not provenance',()=>{
 for(const source of ['https://','https://?q=x','http://','https://user:pass@agency.go.kr/path']){
  assert.equal(hasEvidenceSource(source),false,source);
  assert.equal(normalizeCatalog([{...base,source}],{requireSource:true}).records.length,0);
  assert.equal(normalizeRecord({...base,activity:{entry:{status:'allowed',source,checkedAt:'2020-01-01'}}}).activity.entry.status,'unknown');
 }
});
test('normal HTTPS and agency document citations retain previous behavior',()=>{
 assert.equal(hasEvidenceSource('https://agency.go.kr/notice'),true);
 assert.equal(hasEvidenceSource('관리기관 고시문'),true);
 assert.equal(hasEvidenceSource('https://example.org/source'),false);
});
