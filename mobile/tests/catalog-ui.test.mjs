import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(mobile,p),'utf8');
test('catalog has five category UI, search, region and detail',async()=>{const html=await read('catalog.html');for(const part of ['CATEGORIES','id="categories"','id="region"','id="search"','id="detail"','filterRecords','normalizeCatalog','VALLEY_ACTIVITIES','./map.html'])assert.ok(html.includes(part),part)});
test('catalog contains no invented production records',async()=>assert.deepEqual(JSON.parse(await read('catalog.json')),[]));
test('gate requires consent before loading catalog',async()=>{const html=await read('entry.html');assert.ok(html.includes("transitionGate(state,'accept')"));assert.ok(html.includes("state.accepted"));assert.ok(html.includes("'./catalog.html'"));assert.ok(!html.includes('<iframe id="app" src='))});
test('mobile packager includes entry, catalog and existing map',async()=>{const code=await read('scripts/prepare-web.mjs');for(const token of ["'entry.html'","'catalog.html'","'catalog.json'","'map.html'","path.join(mobile,'src')"])assert.ok(code.includes(token),token)});
