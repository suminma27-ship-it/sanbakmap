import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog,normalizeRecord} from '../src/catalog.mjs';

test('documentation placeholder domains are not real place sources',()=>{
  for(const source of ['https://example.org/source','http://example.com','www.example.net/path','localhost:3000']){
    assert.equal(hasEvidenceSource(source),false,source);
  }
  for(const source of ['https://www.knps.or.kr','지자체 원문','관리기관 안내']){
    assert.equal(hasEvidenceSource(source),true,source);
  }
});

test('placeholder place source is excluded from published catalog',()=>{
  const row={id:'demo',name:'검증용 장소',category:'mountain',lat:37.5,lon:127};
  const result=normalizeCatalog([{...row,source:'https://example.org/source'},{...row,id:'verified',source:'관리기관 원문'}],{requireSource:true});
  assert.deepEqual(result.records.map(r=>r.id),['verified']);
  assert.deepEqual(result.rejected.map(r=>r.index),[0]);
});

test('placeholder valley permission cannot be displayed as allowed',()=>{
  const record=normalizeRecord({id:'valley-test',name:'검증용 계곡',category:'valley',lat:37.5,lon:127,activity:{camping:{status:'allowed',source:'https://example.com/rules',checkedAt:'2026-11-14'}}});
  assert.deepEqual(record.activity.camping,{status:'unknown',source:'',checkedAt:''});
});
