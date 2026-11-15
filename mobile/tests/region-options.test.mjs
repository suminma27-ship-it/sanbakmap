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

test('region options normalize compatibility characters consistently with filtering',()=>{
 const records=[{id:'a',category:'mountain',name:'A',region:'강원특별자치도　원주시'},{id:'b',category:'mountain',name:'B',region:'강원특별자치도 원주시'}];
 assert.deepEqual(regionOptions(records),['강원특별자치도','강원특별자치도 원주시']);
 assert.deepEqual(filterRecords(records,{region:'강원특별자치도 원주시'}).map(r=>r.id),['a','b']);
});

import {categoryRegionOptions} from '../src/catalog.mjs';
test('category region options never expose regions from another category',()=>{
 const rows=[{category:'mountain',region:'강원특별자치도 춘천시'},{category:'island',region:'전라남도 신안군'},{category:'valley',region:'강원특별자치도 원주시'}];
 assert.deepEqual(categoryRegionOptions(rows,'mountain'),['강원특별자치도','강원특별자치도 춘천시']);
 assert.deepEqual(categoryRegionOptions(rows,'island'),['전라남도','전라남도 신안군']);
 assert.deepEqual(categoryRegionOptions(rows,'climbing'),[]);
});
