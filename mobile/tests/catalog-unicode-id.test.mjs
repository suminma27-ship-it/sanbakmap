import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCatalog} from '../src/catalog.mjs';

test('canonically equivalent Unicode IDs cannot duplicate a published place',()=>{
  const base={name:'검증용 장소',category:'mountain',lat:37,lon:127,source:'검증용 출처'};
  const {records,rejected}=normalizeCatalog([
    {...base,id:'place-가'},
    {...base,id:'place-가'},
    {...base,id:'place-other'}
  ],{requireSource:true});
  assert.deepEqual(records.map(r=>r.id),['place-가','place-other']);
  assert.deepEqual(rejected.map(r=>r.index),[1]);
  assert.match(rejected[0].reason,/Duplicate place id/);
});
