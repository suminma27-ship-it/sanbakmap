import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES,normalizeRecord,filterRecords} from '../src/catalog.mjs';
const base={id:'valley-01',name:'샘플 계곡',category:'valley',lat:37.5,lon:127,region:'경기'};
test('five categories have distinct identifiers',()=>assert.deepEqual(CATEGORIES.map(c=>c.id),['mountain','island','valley','climbing','trekking']));
test('valley default is unknown for four activities',()=>assert.ok(Object.values(normalizeRecord(base).activity).every(a=>a.status==='unknown')));
test('allowance without evidence fails closed',()=>assert.equal(normalizeRecord({...base,activity:{camping:{status:'allowed'}}}).activity.camping.status,'unknown'));
test('source-and-date evidence is preserved',()=>assert.equal(normalizeRecord({...base,activity:{entry:{status:'allowed',source:'관리기관 안내',checkedAt:'2026-11-13'}}}).activity.entry.status,'allowed'));
test('invalid category, coordinates, status rejected',()=>{assert.throws(()=>normalizeRecord({...base,category:'campsite'}));assert.throws(()=>normalizeRecord({...base,lat:91}));assert.throws(()=>normalizeRecord({...base,activity:{entry:{status:'safe'}}}));});
test('common filtering',()=>{const records=[normalizeRecord(base),normalizeRecord({...base,id:'m-01',name:'다른 산',category:'mountain',region:'강원'})];assert.deepEqual(filterRecords(records,{category:'valley',region:'경기',search:'샘플'}).map(r=>r.id),['valley-01']);});

test('missing or blank coordinates cannot fabricate a Gulf of Guinea location',()=>{for(const coordinates of [{lat:null},{lon:null},{lat:''},{lon:'   '},{lat:undefined},{lon:undefined}])assert.throws(()=>normalizeRecord({...base,...coordinates}),/coordinates/);});
