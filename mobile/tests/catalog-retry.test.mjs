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
