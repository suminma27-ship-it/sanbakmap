// v79: 224 held OSM source ways are audit metadata only, never promoted to drawn/routable trails.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const base=new URL('../',import.meta.url);
const source=filename=>readFileSync(new URL(filename,base),'utf8');
const audit=JSON.parse(source('audits/seorak-v79-held-candidates.json'));
const expected={
 footway_unspecified:31,
 pedestrian_facility:17,
 steps_unconfirmed:12,
 track_paved_or_grade1:129,
 track_surface_unknown_or_unpaved:35
};
assert.equal(audit.version,79);
assert.equal(audit.source,'Geofabrik South Korea OSM 2026-11-05');
assert.equal(audit.boundary_relation,'17335482');
assert.equal(audit.exterior_buffer_m,1500);
assert.equal(audit.candidate_count_before_v78,233);
assert.equal(audit.added_by_v78,9);
assert.equal(audit.held_total,224);
assert.equal(audit.previous_displayed_lines,713);
assert.equal(audit.all_field_verified,false);
assert.equal(audit.routing_allowed,false);
assert.deepEqual(audit.category_counts,expected);
const grouped=audit.original_way_ids_by_class;
assert.deepEqual(Object.keys(grouped).sort(),Object.keys(expected).sort());
const all=[];
for(const [category,ids] of Object.entries(grouped)){
 assert.equal(ids.length,expected[category],category+' count');
 for(const id of ids)assert(Number.isSafeInteger(id)&&id>0,'OSM ID must be valid');
 all.push(...ids);
}
assert.equal(all.length,224);
assert.equal(new Set(all).size,224,'held way IDs must be unique');
const held=new Set(all);
const lengthTotal=Object.values(audit.category_distances_km).reduce((a,b)=>a+b,0);
assert(Math.abs(lengthTotal-53.624)<.001,'class length total should remain fixed');
const connected=audit.shared_vertex_held_way_ids;
assert.equal(connected.length,7);
assert.equal(audit.exact_shared_vertex_to_shown_lines,7);
assert.equal(new Set(connected).size,7);
for(const id of connected)assert(held.has(id),'shared-node way must be held, not auto-promoted');
assert.equal(audit.linked_to_other_held_candidates,177);
assert.equal(audit.candidate_components,80);
const raw=source('seorak-v78-extra.js').split("='")[1]?.split("'")[0];
assert(raw,'v78 raw data unavailable');
const v78=JSON.parse(gunzipSync(Buffer.from(raw,'base64')).toString('utf8'));
assert.equal(v78.paths.length,9);
for(const row of v78.paths)assert(!held.has(row.i),'v78 displayed way must not be in held review');
const readme=source('README.md');
assert(readme.includes('## v79 업데이트'),'v79 audit changelog must remain available after later releases');
assert(readme.includes('보류 후보 224개'));
const html=source('national-parks-trails.html');
assert(html.includes('seorak-v78-extra.js'));
assert(!html.includes('seorak-v79-extra.js'),'v79 must not draw unverified ways');
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
console.log('PASS v79: 224 distinct held OSM ways, 5 source-tag groups, 7 identified exact-node candidates; no new routing or rendered trails');
