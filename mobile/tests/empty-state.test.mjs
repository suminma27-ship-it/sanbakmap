import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCatalogMessage} from '../src/empty-state.mjs';
const rows=[{category:'island',name:'검증된 장소'}];
test('empty category is not confused with a filtered search',()=>{
 assert.match(emptyCatalogMessage({records:rows,category:'valley'}),/등록된 검증된 장소/);
 assert.match(emptyCatalogMessage({records:[],category:'mountain'}),/등록된 검증된 장소/);
});
test('existing category with no matching region or search uses filtered message',()=>{
 assert.match(emptyCatalogMessage({records:rows,category:'island',region:'경기도'}),/검색 조건/);
 assert.match(emptyCatalogMessage({records:rows,category:'island',search:'없는 곳'}),/검색 조건/);
});
test('loading errors take precedence over empty records',()=>{
 assert.match(emptyCatalogMessage({loadError:'자료 로딩 실패',records:[],category:'valley'}),/불러오지 못했습니다/);
});
