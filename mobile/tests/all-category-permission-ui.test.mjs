import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATEGORIES,VALLEY_ACTIVITIES,normalizeRecord} from '../src/catalog.mjs';

const html=readFileSync(new URL('../catalog.html',import.meta.url),'utf8');

test('detail renders all four permission states for all five categories',()=>{
  assert.equal(CATEGORIES.length,5);
  assert.deepEqual(VALLEY_ACTIVITIES,['entry','swimming','cooking','camping']);
  assert.match(html,/for\(const key of VALLEY_ACTIVITIES\)/);
  assert.match(html,/r\.category==='valley'\?r\.activity\[key\]:\{status:'unknown',source:'',checkedAt:''\}/);
  for(const category of CATEGORIES){
    const r=normalizeRecord({id:category.id,name:'검증용',category:category.id,lat:37,lon:127});
    if(category.id==='valley')assert.ok(VALLEY_ACTIVITIES.every(k=>r.activity[k].status==='unknown'));
    else assert.equal(r.activity,undefined);
  }
});
