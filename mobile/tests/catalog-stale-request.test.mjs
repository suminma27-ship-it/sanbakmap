import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../catalog.html',import.meta.url),'utf8');
test('catalog retry ignores obsolete successful and failed requests',()=>{
  assert.match(html,/loadSequence=0/);
  assert.match(html,/async function loadCatalog\(\)\{const request=\+\+loadSequence;try\{/);
  assert.match(html,/const data=await response\.json\(\);if\(request!==loadSequence\)return;/);
  assert.match(html,/catch\(error\)\{if\(request!==loadSequence\)return;/);
});
