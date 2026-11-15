import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {normalizeCatalog} from '../src/catalog.mjs';

const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('shipped catalog is valid JSON with no rejected or unsourced rows',async()=>{
  const rows=JSON.parse(await readFile(path.join(mobile,'catalog.json'),'utf8'));
  const {records,rejected}=normalizeCatalog(rows,{requireSource:true});
  assert.equal(rejected.length,0,JSON.stringify(rejected));
  assert.equal(records.length,rows.length);
});

test('packaging gate rejects unsourced, malformed and duplicate entries',()=>{
  const valid={id:'test-a',name:'테스트',category:'mountain',lat:37,lon:127,source:'관리기관 원문'};
  const rows=[valid,{...valid,id:'test-b',source:'미확인'},{...valid,id:'test-c',lat:null},valid];
  const {records,rejected}=normalizeCatalog(rows,{requireSource:true});
  assert.equal(records.length,1);
  assert.deepEqual(rejected.map(r=>r.index),[1,2,3]);
});
