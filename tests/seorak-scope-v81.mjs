// v81: only OSM forest tracks from v78 can enter the ordinary map, not facility footways.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const scope=JSON.parse(read('audits/seorak-v81-map-scope.json'));
const packed=read('seorak-v78-extra.js').match(/SANBAK_SEORAK_V78_B64='([^']+)'/)?.[1];
assert(packed,'original v78 OSM sources must be retained');
const source=JSON.parse(gunzipSync(Buffer.from(packed,'base64')).toString('utf8'));
const sorted=values=>values.slice().sort((a,b)=>a-b);
assert.equal(scope.version,81);
assert.equal(scope.current_displayed_seorak_lines,707);
assert.equal(scope.previous_displayed_seorak_lines,713);
assert.equal(scope.audit_only_source_kept,true);
assert.equal(scope.routing_allowed,false);
assert.equal(source.paths.length,9,'the complete v78 audit source must be preserved');
const tracks=source.paths.filter(r=>r.h==='track').map(r=>r.i);
const walks=source.paths.filter(r=>r.h==='footway').map(r=>r.i);
assert.deepEqual(sorted(tracks),sorted(scope.retained_v78_track_ids));
assert.deepEqual(sorted(walks),sorted(scope.excluded_v78_footway_ids));
assert.equal(new Set([...walks,...tracks]).size,9);
assert.equal(tracks.length,3);
assert.equal(walks.length,6);
const html=read('national-parks-trails.html');
assert(html.includes("v78.paths.filter(r=>r.h==='track').map(r=>{"));
assert(html.includes("outerSeorak.features.push(...added78)"));
assert(html.includes("국립공원 등산로 원본 · v"),'national parks map must have a release marker');
for(const word of ['reviewToolbar','reviewToggle','reviewSpot','reviewVisible',
  'reviewMarkerLayer','seorak-v80-review','drawReviewPaths','focusReview']) {
 assert(!html.includes(word),'Facility walkway overlay still exists: '+word);
}
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(js.length,2);
for(const block of js)new Function(block[1]);
const v80=JSON.parse(read('audits/seorak-v80-five-footways.geojson'));
assert.deepEqual(sorted(v80.features.map(f=>Number(f.properties.osm_id))),
  sorted(scope.excluded_v80_audit_only_footway_ids));
assert.equal(v80.display_in_map,false);
assert.equal(v80.route_allowed,false);
assert(read('README.md').includes('## v81 업데이트'),'v81 policy history must be retained');
console.log('PASS v81: six unverified footways and five audit overlays excluded, three forest tracks retained, 707 lines');
