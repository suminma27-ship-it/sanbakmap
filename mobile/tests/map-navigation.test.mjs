import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../catalog.html',import.meta.url),'utf8');
const guard=await readFile(new URL('../src/map-guard.mjs',import.meta.url),'utf8');

test('mountain map button uses the consented parent iframe, not direct navigation',()=>{
  assert.match(html,/<button type="button" id="open-map">기존 산 지도 열기<\/button>/);
  assert.doesNotMatch(html,/<a\s+href=["']\.\/map\.html["']/);
  assert.match(html,/\$\('open-map'\)\.onclick=\(\)=>\{[\s\S]*?window\.parent\.document\.getElementById\('app'\)\.src='\.\/map\.html';/);
});
test('map guard continues to reject direct navigation and require accepted parent',()=>{
  assert.match(guard,/window\.parent === window/);
  assert.match(guard,/classList\.contains\('unlocked'\)/);
  assert.match(guard,/window\.parent\.document\.getElementById\('app'\) !== window\.frameElement/);
});
