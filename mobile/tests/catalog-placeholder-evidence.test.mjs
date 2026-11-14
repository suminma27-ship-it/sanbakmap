import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEvidenceSource,normalizeCatalog,normalizeRecord} from '../src/catalog.mjs';
const base={id:'v',name:'검증용 계곡',category:'valley',lat:37,lon:127,source:'지자체 원문'};
test('placeholder provenance never approves access',()=>{
 for(const source of ['미확인','  확 인 안 됨  ','UNKNOWN','N/A','없음','-','Ｎ／Ａ']){
  const status=normalizeRecord({...base,activity:{camping:{status:'allowed',source,checkedAt:'2026-01-01'}}}).activity.camping.status;
  assert.equal(status,'unknown',source);
 }
});
test('published catalog excludes placeholder source',()=>{
 const rows=['미확인','unknown','관리기관 안내'].map((source,i)=>({...base,id:'v'+i,source}));
 assert.deepEqual(normalizeCatalog(rows,{requireSource:true}).records.map(r=>r.id),['v2']);
});
test('genuine source still preserves evidence and prohibitions',()=>{
 assert.equal(hasEvidenceSource('  지자체 안내  '),true);
 const r=normalizeRecord({...base,activity:{entry:{status:'allowed',source:'지자체 안내',checkedAt:'2026-01-01'},camping:{status:'prohibited',source:'미확인'}}});
 assert.equal(r.activity.entry.status,'allowed');
 assert.equal(r.activity.camping.status,'prohibited');
});
