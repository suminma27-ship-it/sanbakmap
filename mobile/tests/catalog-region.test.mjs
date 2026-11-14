import test from 'node:test';
import assert from 'node:assert/strict';
import {filterRecords} from '../src/catalog.mjs';

const rows=[
 {id:'a',category:'mountain',name:'첫 산',region:'강원특별자치도 춘천시'},
 {id:'b',category:'mountain',name:'둘째 산',region:'강원특별자치도 원주시'},
 {id:'c',category:'island',name:'섬',region:'경기도 안산시'}
];
test('province region selects all cities within that province',()=>{
 assert.deepEqual(filterRecords(rows,{region:'강원특별자치도'}).map(r=>r.id),['a','b']);
});
test('exact full region remains supported',()=>{
 assert.deepEqual(filterRecords(rows,{region:'강원특별자치도 춘천시'}).map(r=>r.id),['a']);
});
test('region matching rejects partial names and respects category',()=>{
 assert.deepEqual(filterRecords(rows,{region:'강원'}),[]);
 assert.deepEqual(filterRecords(rows,{region:'강원특별자치도',category:'island'}),[]);
});

test('administrative region whitespace is canonicalized before filtering',async()=>{
 const {normalizeRecord}=await import('../src/catalog.mjs');
 const row={id:'spacing',category:'mountain',name:'검증용',lat:37,lon:127,region:'강원특별자치도\t 춘천시'};
 const normalized=normalizeRecord(row);
 assert.equal(normalized.region,'강원특별자치도 춘천시');
 assert.deepEqual(filterRecords([normalized],{region:'강원특별자치도'}).map(r=>r.id),['spacing']);
 assert.deepEqual(filterRecords([normalized],{region:'강원특별자치도 춘천시'}).map(r=>r.id),['spacing']);
});
