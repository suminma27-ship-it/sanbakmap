import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../catalog.html',import.meta.url),'utf8');
test('catalog remains invisible until embedded LNT gate validates',()=>{
  assert.match(html,/body\{margin:0;visibility:hidden;/);
  assert.match(html,/window\.parent\.document\.body\.classList\.contains\('unlocked'\)/);
  assert.match(html,/window\.parent\.document\.getElementById\('app'\) !== window\.frameElement/);
  assert.match(html,/\} else \{\s*document\.body\.style\.visibility = 'visible';/);
  assert.match(html,/catch \(_\) \{ window\.location\.replace\('\.\/index\.html'\); \}/);
});
