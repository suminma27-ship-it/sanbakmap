import test from 'node:test';
import assert from 'node:assert/strict';
import {regionOptions,filterRecords} from '../src/catalog.mjs';
test('province and municipality options are distinct and deduplicated',()=>{
 const records=[{region:'강원특별자치도 춘천시'},{region:'강원특별자치도 원주시'},{region:'강원특별자치도 춘천시'}];
 assert.deepEqual(regionOptions(records),['강원특별자치도','강원특별자치도 원주시','강원특별자치도 춘천시']);
});
test('blank region excluded and whitespace normalized',()=>{
 assert.deepEqual(regionOptions([{region:'  '},{region:'서울특별시\\t종로구'.replace('\\t','\t')},{region:''}]),['서울특별시','서울특별시 종로구']);
});
test('province includes cities but full municipality selects only its city',()=>{
 const records=[{id:'a',category:'mountain',region:'강원특별자치도 춘천시',name:'A'},{id:'b',category:'mountain',region:'강원특별자치도 원주시',name:'B'}];
 assert.equal(filterRecords(records,{region:'강원특별자치도'}).length,2);
 assert.deepEqual(filterRecords(records,{region:'강원특별자치도 춘천시'}).map(r=>r.id),['a']);
});
