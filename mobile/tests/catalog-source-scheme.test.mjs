import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog,normalizeRecord} from '../src/catalog.mjs';

test('unsafe URI schemes cannot establish published place provenance',()=>{
 for(const source of ['javascript:alert(1)','data:text/html,hello','file:///etc/passwd','blob:https://site.test/id','about:blank']){
  assert.equal(hasEvidenceSource(source),false,source);
  const row={id:'m-1',name:'검증용 산',category:'mountain',lat:37,lon:127,source};
  assert.equal(normalizeCatalog([row],{requireSource:true}).records.length,0,source);
 }
});

test('unsafe URI schemes cannot authorize valley activities',()=>{
 for(const source of ['javascript:alert(1)','data:text/plain,allowed','file:///tmp/notice']){
  const row={id:'v-1',name:'검증용 계곡',category:'valley',lat:37,lon:127,activity:{camping:{status:'allowed',source,checkedAt:'2020-01-01'}}};
  assert.deepEqual(normalizeRecord(row).activity.camping,{status:'unknown',source:'',checkedAt:''});
 }
});

test('legitimate descriptive and HTTPS sources remain eligible',()=>{
 assert.equal(hasEvidenceSource('국립공원공단 공지'),true);
 assert.equal(hasEvidenceSource('https://parks.example.kr/notice'),true);
});
