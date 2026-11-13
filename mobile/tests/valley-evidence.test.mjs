import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecord} from '../src/catalog.mjs';
const base={id:'v1',name:'검증용',category:'valley',lat:37.5,lon:127};
test('allowed requires nonblank source',()=>{for(const source of ['', '  ',null,0])assert.equal(normalizeRecord({...base,activity:{entry:{status:'allowed',source,checkedAt:'2026-11-14'}}}).activity.entry.status,'unknown')});
test('allowed requires actual ISO calendar date',()=>{for(const checkedAt of ['', '2026-02-30','2026-11-14junk','2026-1-4',' '])assert.equal(normalizeRecord({...base,activity:{entry:{status:'allowed',source:'관리기관',checkedAt}}}).activity.entry.status,'unknown')});
test('valid allowed evidence preserved and trimmed',()=>assert.deepEqual(normalizeRecord({...base,activity:{entry:{status:'allowed',source:' 관리기관 ',checkedAt:'2026-11-14'}}}).activity.entry,{status:'allowed',source:'관리기관',checkedAt:'2026-11-14'}));
test('missing evidence does not rewrite prohibition',()=>assert.equal(normalizeRecord({...base,activity:{entry:{status:'prohibited'}}}).activity.entry.status,'prohibited'));
