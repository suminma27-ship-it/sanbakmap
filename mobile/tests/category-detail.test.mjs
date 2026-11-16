import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../catalog.html',import.meta.url),'utf8');
test('valley activity evidence appears only on valley details',()=>{
 assert.match(html,/if\(r\.category==='valley'\)\{for\(const key of VALLEY_ACTIVITIES\)/);
 assert.match(html,/const a=r\.activity\[key\]/);
 assert.doesNotMatch(html,/r\.category==='valley'\?r\.activity\[key\]/);
});
test('other categories do not claim valley-specific rules',()=>{
 assert.match(html,/else\{for\(const key of VALLEY_ACTIVITIES\)\{const note=document\.createElement\('p'\)/);
 assert.match(html,/labels\[key\]\+': 미확인 \(관리기관 확인 필요\)'/);
 assert.doesNotMatch(html,/출입·물놀이·취사·야영 이용 허용 여부: 미확인/);
});
