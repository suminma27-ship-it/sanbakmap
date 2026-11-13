import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecord,normalizeCatalog} from '../src/catalog.mjs';
const base={id:'place-1',name:'검증 장소',category:'mountain',lat:37.5,lon:127.1};
test('coercible non-coordinate types never become geographic points',()=>{
 for(const axis of ['lat','lon'])for(const value of [true,false,[],[37],{},null]){
  assert.throws(()=>normalizeRecord({...base,[axis]:value}),/coordinates|coordinate type/);
 }
});
test('numeric coordinate strings remain supported',()=>{
 const r=normalizeRecord({...base,lat:'37.5',lon:'127.1'});
 assert.equal(r.lat,37.5);assert.equal(r.lon,127.1);
});
test('bad coordinate rows are isolated, not rendered',()=>{
 const result=normalizeCatalog([base,{...base,id:'bad',lat:true}]);
 assert.equal(result.records.length,1);assert.equal(result.rejected.length,1);
});
