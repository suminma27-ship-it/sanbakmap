// v73 park trail overlay only: OSM boundary intersections, no fabricated joins.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const base=new URL('../',import.meta.url);
const html=readFileSync(new URL('national-parks-trails.html',base),'utf8');
const b64=html.match(/window\.SANBAK_NP_OSM_B64="([^"]+)"/)?.[1];
assert(b64,'Embedded original park trail source is missing');
const data=JSON.parse(gunzipSync(Buffer.from(b64,'base64')).toString());
assert.equal(data.data_version,73);
assert.equal(data.license,'ODbL 1.0');
const counts={seorak:[480,19],jiri:[760,64],bukhan:[1161,12]};
for(const [name,expected] of Object.entries(counts)){
 const p=data.parks[name];assert(p,name);
 assert.deepEqual([p.counts.trail,p.counts.track],expected);
 assert.equal(p.segments.trail.length,p.counts.trail);
 assert.equal(p.segments.track.length,p.counts.track);
 assert.equal(p.line_count,expected[0]+expected[1]);
 const [minLon,minLat,maxLon,maxLat]=p.bbox;
 for(const way of p.segments.trail.concat(p.segments.track)){
  assert(way.length>=2,'OSM segment must contain a line, not a point');
  for(const [lon,lat] of way){
   assert(lon>=minLon-1e-6&&lon<=maxLon+1e-6,'long outside park envelope');
   assert(lat>=minLat-1e-6&&lat<=maxLat+1e-6,'lat outside park envelope');
  }
 }
}
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,2);
for(const s of scripts)new Function(s[1]);
for(const token of ['<svg id="parkMap"','value="seorak"','value="jiri"','value="bukhan"','국립공원 등산로 표시','OSM']){
 assert(html.includes(token),'missing UI/source '+token);
}
assert(!html.includes('window.SanbakNationalRoutes.shortest'),'No route building introduced');
const home=readFileSync(new URL('index.html',base),'utf8');
assert(home.includes('href="./national-parks-trails.html"'),'Main site must link to park source map');
const flow=readFileSync(new URL('.github/workflows/deploy-pages.yml',base),'utf8');
assert(flow.includes('national-parks-trails.html'),'New map must be packaged for Pages');
console.log('PASS: v73 3 park trail-only source maps, OSM clipped ways, no routing and deploy packaging');
