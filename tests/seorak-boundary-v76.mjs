// v76: new OSM border continuations are strictly source-derived, nonduplicate, and no routing.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('national-parks-trails.html',root),'utf8');
const js=readFileSync(new URL('seorak-v76-extra.js',root),'utf8');
const b64=js.match(/SANBAK_SEORAK_V76_B64='([^']+)'/)?.[1];
assert(b64,'v76 compressed OSM data missing');
const data=JSON.parse(gunzipSync(Buffer.from(b64,'base64')).toString());
assert.equal(data.v,76);
assert.equal(data.paths.length,22);
assert.equal(new Set(data.paths.map(s=>s.i)).size,20);
const types={};for(const s of data.paths)types[s.h]=(types[s.h]||0)+1;
assert.deepEqual(types,{track:19,path:3});
const previous=JSON.parse(html.match(/<script id="seorak-border-v75" type="application\/json">([\s\S]*?)<\/script>/)?.[1]);
assert.equal(previous.features.length,156);
const oldIds=new Set(previous.features.map(f=>String(f.properties.osm_id)));
const newIds=new Set(data.paths.map(p=>String(p.i)));
for(const id of newIds)assert(!oldIds.has(id),'Duplicate OSM way in old and new data '+id);
const all=JSON.parse(gunzipSync(Buffer.from(html.match(/SANBAK_NP_OSM_B64="([^"]+)"/)?.[1]||'','base64')).toString());
assert.deepEqual(Object.values(all.parks).map(p=>p.line_count).sort((a,b)=>a-b),[499,824,1173]);
let pts=0;
for(const f of data.paths){
 assert(Number.isInteger(f.d)&&f.d>=4&&f.d<=9,'New way must be beyond v75 3-hop cutoff');
 assert(['path','track'].includes(f.h));
 assert(Array.isArray(f.p)&&f.p.length>1);
 for(const p of f.p){
  assert(p.length===2&&p.every(Number.isFinite));
  assert(p[0]>128.2&&p[0]<128.65&&p[1]>37.95&&p[1]<38.32);
  pts++;
 }
}
assert(pts>=300);
assert.equal(499+previous.features.length+data.paths.length,677);
assert(html.includes('seorak-v76-extra.js'));
assert(html.includes("outerSeorak.features.push(...added)"));
assert(html.includes("v76Warning"));
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,2);for(const s of inline)new Function(s[1]);
const sw=readFileSync(new URL('sw.js',root),'utf8');
assert(sw.includes('sanbakmap-v76-fresh-1'));
assert(sw.includes('./seorak-v76-extra.js'));
const workflow=readFileSync(new URL('.github/workflows/deploy-pages.yml',root),'utf8');
assert(workflow.includes('seorak-v76-extra.js'));
console.log('PASS: v76 20 source OSM ways / 22 distinct new external lines, no fabricated joins, 677 total Seorak lines');