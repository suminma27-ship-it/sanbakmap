import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecord,normalizeCatalog} from '../src/catalog.mjs';

const base={id:'decimal-test',name:'좌표 검증',category:'mountain',lat:37.5,lon:127.1};
test('decimal degree strings remain supported',()=>{
  for(const value of ['37.5',' 37.5 ','+37.5','37.','.5']) {
    const r=normalizeRecord({...base,lat:value});
    assert.equal(Number.isFinite(r.lat),true);
  }
});
test('nondecimal strings never become map points',()=>{
  for(const axis of ['lat','lon'])for(const value of ['0x7f','0b101','1e2','Infinity','NaN','1 2']) {
    assert.throws(()=>normalizeRecord({...base,[axis]:value}),/coordinate/);
  }
});
test('malformed numeric strings are isolated from valid catalog records',()=>{
  const {records,rejected}=normalizeCatalog([base,{...base,id:'hex',lon:'0x7f'}]);
  assert.equal(records.length,1);
  assert.equal(rejected.length,1);
});
