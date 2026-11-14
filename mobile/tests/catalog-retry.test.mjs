import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../catalog.html',import.meta.url),'utf8');
test('failed catalog load exposes a retry action',()=>{
  assert.match(html,/id="retry" hidden/);
  assert.match(html,/\$\('retry'\)\.hidden=!loadError/);
  assert.match(html,/\$\('retry'\)\.onclick=loadCatalog/);
  assert.match(html,/async function loadCatalog\(\)/);
});
test('successful retry clears error and rebuilds regions without stale options',()=>{
  assert.match(html,/loadError='';/);
  assert.match(html,/region\.replaceChildren\(new Option\('전국',''\)\)/);
  assert.match(html,/region\.value=previous/);
  assert.match(html,/await loadCatalog\(\)/);
});

test('failed retry clears previously loaded places instead of showing stale records',()=>{
  assert.match(html,/catch\(error\)\{console\.warn\('Catalog load failed',error\);records=\[\];rejectedCount=0;loadError='자료 로딩 실패'/);
  assert.match(html,/loadError\?'장소 자료를 불러오지 못했습니다/);
});
