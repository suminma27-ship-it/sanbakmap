// v91: validate all 499 display->source way IDs and the 26 audited exact PBF junctions.
// This is a source-evidence consistency test, not authorization to route or hike.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const html=read('national-parks-trails.html');
const index=JSON.parse(read('audits/seorak-v91-display-way-index.json'));
const audit=JSON.parse(read('audits/seorak-v91-original-way-recovery.json'));
const v90=JSON.parse(read('audits/seorak-v90-original-node-review.json'));
const payload=html.match(/window\.SANBAK_NP_OSM_B64="([^"]+)"/)?.[1];
assert(payload,'v73 compressed park geometry missing');
const digest=createHash('sha256').update(payload).digest('hex');
assert.equal(digest,index.v73_embedded_source_sha256);
assert.equal(digest,audit.v73_embedded_gz_base64_sha256);
const data=JSON.parse(gunzipSync(Buffer.from(payload,'base64')).toString('utf8'));
const park=data.parks.seorak;
const wayIds=index.display_line_to_osm_way_id;
assert.equal(index.version,91);
assert.equal(audit.version,91);
assert.equal(data.data_version,73);
assert.equal(park.line_count,499);
assert.equal(wayIds.length,499);
assert.equal(new Set(wayIds).size,457);
assert(wayIds.every(n=>Number.isSafeInteger(n)&&n>0));
assert.equal(index.ordered_source_node_subsequence_matches,412);
assert.equal(index.unique_geometry_only_matches,87);
assert.equal(audit.mapping.ordered_source_node_subsequence,412);
assert.equal(audit.mapping.single_unique_geometric_candidate_only,87);
assert.equal(audit.mapping.ambiguous_source_ways,0);
assert.equal(audit.mapping.unmatched_display_lines,0);
assert.equal(audit.mapping.display_vertices,16830);
assert.equal(audit.mapping.display_vertices_exactly_assignable_to_unique_original_node_ID,16691);
assert.equal(audit.mapping.display_vertices_withheld_node_id_due_to_simplification_or_repeat,139);
assert.equal(audit.mapping.unique_assigned_original_node_IDs,16236);
assert.deepEqual(audit.mapping.tags_in_original_inside_lines,{path:383,footway:73,steps:22,pedestrian:2,track:19});
assert.equal(audit.mapping.geometric_max_hausdorff_m_for_non_subsequence_approx,0.755);
assert.equal(audit.v89_near_endpoint_cases.distinct_gap_candidate_pairs,42);
assert.equal(audit.v89_near_endpoint_cases.source_OSM_way_pairs_share_nearby_original_node,30);
assert.equal(audit.v89_near_endpoint_cases.among_shared_node_pairs_path_or_track_only,18);
assert.equal(audit.v89_near_endpoint_cases.among_shared_node_pairs_include_footway_or_pedestrian,12);
assert.equal(audit.v89_near_endpoint_cases.remaining_without_shared_nearby_source_node,12);
assert.equal(audit.v90_crossings.way_id_pair_consistency_with_v91_display_mapping,26);
const v75=JSON.parse(html.match(/<script id="seorak-border-v75" type="application\/json">([\s\S]*?)<\/script>/)?.[1]);
function originalWayId(id){
 const [stage,kindOrIndex,index]=id.split(':');
 if(stage==='v73'){
  const n=Number(index)+(kindOrIndex==='track'?480:0);
  assert(Number.isSafeInteger(n)&&n>=0&&n<499);
  return wayIds[n];
 }
 if(stage==='v75')return Number(v75.features[Number(kindOrIndex)].properties.osm_id);
 throw Error('Unexpected v90 line ID '+id);
}
assert.equal(v90.cases.length,26);
for(const c of v90.cases){
 const mapped=c.display_line_ids.map(originalWayId).sort((a,b)=>a-b);
 const source=[...c.pbf_osm_way_ids].sort((a,b)=>a-b);
 assert.deepEqual(mapped,source,'v90 PBF way pair must correspond to actual displayed v73/v75 lines at case '+c.number);
 assert.equal(c.allow_routing,false);
}
assert.equal(index.routing_allowed,false);
assert.equal(audit.routing_allowed,false);
assert.equal(audit.geometry_snap_joints,0);
assert.equal(audit.automatic_path_creation,0);
assert.equal(audit.facility_path_promotions,0);
assert.equal(audit.map_line_count_before,703);
assert.equal(audit.map_line_count_after,703);
assert.equal(audit.graph_components_unmodified,67);
assert(html.includes('국립공원 등산로 원본 · v91'));
assert(!html.includes('seorak-v91-extra.js'),'No new unreviewed shape layer');
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
assert(html.includes('outerSeorak.features.push(...added83)'));
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,2);
for(const item of inline)new Function(item[1]);
assert(read('README.md').includes('**현재 버전: v91**'));
assert(read('tools/seorak-recover-v91.py').includes('extract_selected_way_refs'));
assert(read('.github/workflows/deploy-pages.yml').includes('audits/seorak-v91-display-way-index.json'));
console.log('PASS v91: 499 displayed lines mapped to 457 original ways; 26 PBF node intersections exactly identified; 30 of 42 near gaps source-linked, 703 map lines unchanged');
