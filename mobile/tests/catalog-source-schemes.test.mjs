import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog,normalizeRecord} from '../src/catalog.mjs';

test('unsupported URI schemes cannot prove a place exists',()=>{
  for(const source of ['ftp://files.example.kr/trail','vbscript:msgbox(1)','chrome://settings','custom+app:record','javascript:alert(1)','data:text/plain,yes']){
    assert.equal(hasEvidenceSource(source),false,source);
    const result=normalizeCatalog([{id:'p',name:'검증 대상',category:'trekking',lat:37.5,lon:127.1,source}],{requireSource:true});
    assert.equal(result.records.length,0,source);
  }
});
test('unsupported URI schemes cannot prove valley activity permission',()=>{
  const base={id:'v',name:'검증 대상',category:'valley',lat:37.5,lon:127.1};
  for(const source of ['ftp://files.example.kr/rules','custom:allowed']){
    const result=normalizeRecord({...base,activity:{camping:{status:'allowed',source,checkedAt:'2026-11-13'}}});
    assert.equal(result.activity.camping.status,'unknown');
  }
});
test('ordinary HTTPS links and named agency documents remain eligible as source labels',()=>{
  for(const source of ['https://www.knps.or.kr','http://www.visitkorea.or.kr','국립공원공단 공지']){
    assert.equal(hasEvidenceSource(source),true,source);
  }
});
