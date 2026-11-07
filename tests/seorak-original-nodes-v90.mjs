// v90 audit regression: PBF exact source-way node IDs, NOT official trail authorization.
// This CI test validates retained evidence; the independent PBF replay utility can
// verify references against the separately supplied 291 MB source archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const audit=JSON.parse(read('audits/seorak-v90-original-node-review.json'));
const old=JSON.parse(read('audits/seorak-v89-topology-audit.json'));
assert.equal(audit.version,90);
assert.equal(audit.source_pbf_sha256,'9debe407f31db923be2cb481d41c2e0100ed831555da011853eecacd44193ca8');
assert.equal(audit.source_way_node_pairs_checked,26);
assert.equal(audit.source_way_node_pairs_sharing_exact_node,26);
assert.equal(audit.source_way_reference_count,44);
assert.equal(audit.unique_shared_pbf_node_ids,26);
assert.equal(audit.cases.length,26);
assert.equal(old.geometric_2d_crossings_of_disconnected_components.examples.length,26);
assert.deepEqual(audit.category_counts,{path_path:18,track_track:2,pedestrian_or_footway:6});
assert.equal(audit.display_lines_before,703);
assert.equal(audit.display_lines_after,703);
assert.equal(audit.display_graph_components_before,67);
assert.equal(audit.display_graph_components_after,67);
assert.equal(audit.geometry_and_routes_unchanged,true);
assert.equal(audit.automatic_route_promotion,false);
assert.equal(audit.confirmed_access_decisions,0);
assert.equal(audit.not_for_navigation,true);
const ids=new Set(),nodes=new Set(),wayIds=new Set(),counts={};
const toRad=Math.PI/180;
const hav=(a,b)=>{
 const dy=(b[1]-a[1])*toRad,dx=(b[0]-a[0])*toRad;
 const h=Math.sin(dy/2)**2+Math.cos(a[1]*toRad)*Math.cos(b[1]*toRad)*Math.sin(dx/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
};
for(let i=0;i<audit.cases.length;i++){
 const c=audit.cases[i],prior=old.geometric_2d_crossings_of_disconnected_components.examples[i];
 assert.equal(c.number,i+1);
 assert.deepEqual(c.display_line_ids,[prior.line_a,prior.line_b]);
 assert.deepEqual(c.approx_display_crossing_lonlat,prior.at_lonlat);
 assert.equal(c.pbf_osm_way_ids.length,2);
 assert.equal(c.pbf_highway_tags.length,2);
 assert(c.pbf_osm_way_ids.every(n=>Number.isSafeInteger(n)&&n>0));
 assert(Number.isSafeInteger(c.pbf_shared_node_id)&&c.pbf_shared_node_id>0);
 assert(!nodes.has(c.pbf_shared_node_id),'source node evidence must be distinct across 26 candidates');
 nodes.add(c.pbf_shared_node_id);
 for(const w of c.pbf_osm_way_ids)wayIds.add(w);
 const measured=hav(c.shared_source_vertex_lonlat,c.approx_display_crossing_lonlat);
 assert(measured<.75,'exact original node located too far from v89 display intersection');
 assert(Math.abs(measured-c.offset_from_v89_display_crossing_m)<.02,
  'display/source offset does not match original evidence');
 assert.equal(c.confidence,'exact_shared_OSM_node_for_nearby_way_pair');
 assert.equal(c.confirmed_public_hiking_route,false);
 assert.equal(c.allow_auto_link,false);
 assert.equal(c.allow_routing,false);
 const [a,b]=c.pbf_highway_tags;
 const classification=a==='path'&&b==='path'?'path_path':
  a==='track'&&b==='track'?'track_track':'pedestrian_or_footway';
 assert.equal(c.classification,classification);
 counts[classification]=(counts[classification]||0)+1;
 if(classification==='pedestrian_or_footway')
  assert(c.pbf_highway_tags.some(x=>x==='footway'||x==='pedestrian'),
    'six pedestrian or facility-way cases must remain excluded');
}
assert.equal(nodes.size,26);
assert.equal(wayIds.size,44);
assert.deepEqual(counts,audit.category_counts);
const html=read('national-parks-trails.html');
assert(html.includes('국립공원 등산로 원본 · v'),'map release version marker must remain');
assert(html.includes("v77.a.filter(r=>!excludedFacilityPathIds.has(r.i))"));
assert(html.includes("v78.paths.filter(r=>r.h==='track')"));
assert(html.includes('outerSeorak.features.push(...added83)'));
assert(!html.includes('seorak-v90-extra.js'),'no new routes or hidden overlays');
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);
scripts.forEach(s=>new Function(s[1]));
const source=read('tools/verify-seorak-v90-pbf-nodes.py');
assert(source.includes('pbf_shared_node_id'));
assert(source.includes('source_pbf_sha256'));
assert(source.includes('delta_sint64'));
assert(source.includes('allow_auto_link'));
assert(source.includes('allow_routing'));
assert(read('README.md').includes('## v90 업데이트'),'v90 PBF intersection history must remain');
console.log('PASS v90: 26 exact-PBF source-node intersections (18 path-path, 2 track-track, 6 pedestrian withheld), no display/routing changes');
