import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCatalog} from '../src/catalog.mjs';

const base={id:'mountain-01',name:'검증용 산',category:'mountain',lat:37.5,lon:127.1,source:'검증용 출처'};

test('compatibility-equivalent catalog IDs cannot publish duplicate places',()=>{
  const rows=[base,{...base,id:'ｍｏｕｎｔａｉｎ－０１'},{...base,id:'mountain-02'}];
  const {records,rejected}=normalizeCatalog(rows,{requireSource:true});
  assert.deepEqual(records.map(r=>r.id),['mountain-01','mountain-02']);
  assert.deepEqual(rejected.map(r=>r.index),[1]);
  assert.match(rejected[0].reason,/Duplicate place id/);
});

test('canonically equivalent composed and decomposed IDs are duplicates',()=>{
  const {records,rejected}=normalizeCatalog([{...base,id:'café'},{...base,id:'cafe\u0301'}]);
  assert.equal(records.length,1);
  assert.deepEqual(rejected.map(r=>r.index),[1]);
});
