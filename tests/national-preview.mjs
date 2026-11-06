// Run: node tests/national-preview.mjs
// This is *not* a routing network; it is a lightweight, source-derived map preview.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const code=readFileSync(new URL('../national_data.js',import.meta.url),'utf8');
const catalog=new Function('const window={};\n'+code+'\nreturn {index:window.SANBAK_NATIONAL_INDEX,compressed:window.SANBAK_NATIONAL_SVG_GZIP_BASE64};')();
assert.equal(catalog.index.length,2932,'Nationwide search count mismatch');
assert.equal(new Set(catalog.index.map(x=>x.c)).size,2932,'Duplicate mountain codes');
for(const mountain of catalog.index){
 assert(/^\d{9}$/.test(mountain.c));
 assert(typeof mountain.n==='string'&&mountain.n.trim());
 assert(Number.isFinite(mountain.s)&&Number.isFinite(mountain.p));
}
const paths=JSON.parse(gunzipSync(Buffer.from(catalog.compressed,'base64')).toString('utf8'));
assert.equal(Object.keys(paths).length,2932,'Preview geometry count mismatch');
for(const x of catalog.index){
 assert(typeof paths[x.c]==='string'&&paths[x.c].startsWith('M'),x.c+' has no source trail preview');
}
const html=readFileSync(new URL('../national.html',import.meta.url),'utf8');
assert(html.includes('national_data.js'),'Viewer must load published catalog automatically');
assert(html.includes('initNationwide();'),'Automatic initialization absent');
assert(html.includes('displayMode'),'Full resolution ZIP mode must be separate from preview');
assert(html.includes("readEntry(archive.file"),'Detailed ZIP loader removed');
console.log('PASS: v61 2,932 automatic mountain search entries and 2,932 real simplified path previews');
