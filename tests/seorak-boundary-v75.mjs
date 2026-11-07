// v75: National park source continuations, never fabricated connections.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('national-parks-trails.html',root),'utf8');
const embedded=html.match(/<script id="seorak-border-v75" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
assert(embedded,'Seoraksan border-source JSON missing');
const geo=JSON.parse(embedded);
assert.equal(geo.type,'FeatureCollection');
assert.equal(geo.features.length,156);
const counts={},ids=new Set();let crossing=0,points=0;
for(const f of geo.features){
 assert.equal(f.type,'Feature');
 assert.equal(f.geometry.type,'LineString');
 assert(f.geometry.coordinates.length>=2);
 assert(/^\d+$/.test(f.properties.osm_id));
 assert.equal(f.properties.field_verified,false);
 assert(['path','footway','steps','track'].includes(f.properties.highway));
 counts[f.properties.highway]=(counts[f.properties.highway]||0)+1;
 ids.add(f.properties.osm_id);
 if(f.properties.crosses_boundary)crossing++;
 for(const p of f.geometry.coordinates){
  assert(Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
  assert(p[0]>128.2&&p[0]<128.65&&p[1]>37.95&&p[1]<38.32);
  points++;
 }
}
assert.deepEqual(counts,{path:99,track:49,footway:7,steps:1});
assert.equal(ids.size,109);
assert.equal(crossing,92);
assert(points>2500);
const b64=html.match(/SANBAK_NP_OSM_B64="([^"]+)"/)?.[1];
assert(b64);
const old=JSON.parse(gunzipSync(Buffer.from(b64,'base64')).toString());
assert.equal(old.data_version,73);
assert.deepEqual([old.parks.seorak.line_count,old.parks.jiri.line_count,old.parks.bukhan.line_count],[499,824,1173]);
for(const token of ['const extra=',"const p=world(bbox)",'extraTrails','extraTracks']){
 assert(html.includes(token),'No overlay source: '+token);
}
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);for(const s of scripts)new Function(s[1]);
const sw=readFileSync(new URL('sw.js',root),'utf8');
assert(sw.includes('sanbakmap-v76-fresh-1'));
console.log('PASS: v75 156 OSM border extensions, 109 original ways, previous 3 park baselines unchanged');
