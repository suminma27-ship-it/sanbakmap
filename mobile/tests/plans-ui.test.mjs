import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
test('saved plan screen is reachable, packaged and LNT gated',async()=>{
 const [catalog,plans,build]=await Promise.all([read('../catalog.html'),read('../plans.html'),read('../scripts/prepare-web.mjs')]);
 assert.match(catalog,/id="open-plans"/);
 assert.match(catalog,/\.\/plans\.html/);
 assert.match(plans,/parent\.document\.body\.classList\.contains\('unlocked'\)/);
 assert.match(plans,/importPlans\(localStorage/);
 assert.match(plans,/exportPlans\(localStorage/);
 assert.match(plans,/deletePlan\(localStorage,index\)/);
 assert.match(plans,/경로 미검증/);
 assert.match(build,/mobileAssets = \['entry\.html','catalog\.html','plans\.html'\]/);
 assert.match(build,/target,'plans\.html'/);
});
