// v89: source-coordinate graph is a guardrail, NOT yet a safe route-planning layer.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {
 loadSeorakDisplayedLines,buildTopology,previewOnlyShortestPath,
 decodeDeltaPolyline,FOREST_ROAD_GRAPH_VERSION
} from '../tools/seorak-topology-v89.mjs';
const root=new URL('../',import.meta.url);
const read=x=>readFileSync(new URL(x,root),'utf8');
assert.equal(FOREST_ROAD_GRAPH_VERSION,89);
const f=(id,points,kind='trail',source_stage='exterior_v75')=>({
 id,points,kind,source_stage,geometry_accuracy:'source_coords_may_be_boundary_clipped'
});
const cross=buildTopology([
 f('cross-A',[[128.3,38.1],[128.3002,38.1002]]),
 f('cross-B',[[128.3,38.1002],[128.3002,38.1]],'track')
]);
assert.equal(cross.stats.connected_components,2,'planar crossing must not connect');
assert.equal(cross.stats.contacts.trail_track_vertex_nodes,0);
assert.equal(cross.stats.crossings.internal_2d_crossings_between_disconnected_components,1);
assert.equal(cross.stats.synthetic_joins_created,0);
assert.deepEqual(cross.edges.map(e=>e.display_simplified),[false,false]);
assert.deepEqual(previewOnlyShortestPath(cross,[128.3,38.1],[128.3,38.1002],
 {acknowledgeUnverifiedDisplayTopology:true}).status,'disconnected_no_synthetic_join');
assert.throws(()=>previewOnlyShortestPath(cross,[128.3,38.1],[128.3002,38.1002]),
 /not a verified routable/);

const shared=buildTopology([
 f('trail-center',[[128.4,38.1],[128.4001,38.1],[128.4002,38.1]]),
 f('forest-junction',[[128.4001,38.1],[128.4001,38.1001]],'track')
]);
assert.equal(shared.stats.connected_components,1,'exact shared interior vertex connects');
assert.equal(shared.stats.contacts.trail_track_original_only_vertex_nodes,1);
assert.equal(shared.stats.contacts.shared_original_only_vertex_nodes,1);
assert.equal(shared.stats.source_consecutive_edges,3);
const preview=previewOnlyShortestPath(shared,[128.4,38.1],[128.4001,38.1001],
 {acknowledgeUnverifiedDisplayTopology:true});
assert.equal(preview.status,'unverified_draft_preview_only');
assert.equal(preview.routing_allowed,false);
assert.equal(preview.must_not_be_used_for_navigation,true);
assert.deepEqual(preview.point_coordinates,[[128.4,38.1],[128.4001,38.1],[128.4001,38.1001]]);
assert.deepEqual(preview.source_edges.map(e=>e.line_id),['trail-center','forest-junction']);

const gap=buildTopology([
 f('gapA',[[128.55,38.2],[128.5501,38.2]]),
 f('gapB',[[128.5502,38.2],[128.5503,38.2]])
]);
assert.equal(gap.stats.connected_components,2);
assert(gap.stats.near.endpoint_pairs_5_to_15m>=1,
 'a ~9 m missing source-node gap must be detected but not joined');
assert.equal(previewOnlyShortestPath(gap,[128.55,38.2],[128.5503,38.2],
 {acknowledgeUnverifiedDisplayTopology:true}).status,'disconnected_no_synthetic_join');

const mixed=buildTopology([
 f('raw',[[128.48,38.11],[128.4801,38.11]]),
 {...f('display',[[128.4801,38.11],[128.4802,38.11]]),
 source_stage:'inside_v73',geometry_accuracy:'display_simplified_not_original_node'}
]);
assert.equal(mixed.stats.connected_components,1);
assert.equal(mixed.stats.contacts.mixed_display_and_original_vertex_nodes,1);
assert.equal(mixed.stats.contacts.shared_original_only_vertex_nodes,0);

const lines=loadSeorakDisplayedLines(new URL('../',import.meta.url).pathname);
assert.equal(lines.length,703);
const counts={};
for(const line of lines)counts[line.source_stage]=(counts[line.source_stage]||0)+1;
assert.deepEqual(counts,{
 inside_v73:499,exterior_v75:156,exterior_v76:22,
 exterior_v77:19,exterior_v78:3,exterior_v83:4
});
assert.equal(lines.filter(l=>l.kind==='trail').length,609);
assert.equal(lines.filter(l=>l.kind==='track').length,94);
assert(lines.filter(l=>l.geometry_accuracy==='display_simplified_not_original_node').length===499);
const excludedIds=new Set(['485958070','485958071','485958085','485958086',
 '1167747441','1167747442','1167747443','485958072','485958073','485958082',
 '485958095','485958098','1167747440']);
assert(lines.every(l=>!excludedIds.has(l.osm_way_id)),'v81/v82 facility walking network cannot return');

const graph=buildTopology(lines);
assert.equal(graph.stats.displayed_source_lines,703);
assert.equal(graph.lines.length,703);
assert(graph.stats.unique_stored_coordinate_nodes>0);
assert.equal(graph.stats.source_consecutive_edges,
 graph.stats.vertex_instances-703-graph.stats.zero_length_input_edges_skipped);
assert(graph.stats.connected_components>0);
assert(graph.stats.contacts.shared_original_only_vertex_nodes>=0);
assert.equal(graph.stats.synthetic_joins_created,0);
assert.equal(graph.stats.coordinate_snapping_tolerance_m,0);
assert.equal(graph.stats.routing_allowed,false);
assert.equal(graph.stats.route_planner_ready_for_public_navigation,false);
assert.equal(graph.stats.source_stage_breakdown.inside_v73.lines,499);
assert.equal(graph.stats.source_stage_breakdown.exterior_v83.track,4);
assert.equal(graph.stats.source_stage_breakdown.exterior_v78.track,3);
assert.equal(graph.stats.source_stage_breakdown.exterior_v77.trail,19);
assert.equal(graph.stats.source_stage_breakdown.exterior_v75.lines,156);
assert.equal(graph.stats.source_stage_breakdown.exterior_v76.lines,22);
assert(graph.stats.important_source_limit.includes('display geometry'));
assert.equal(graph.stats.component_stats.reduce((n,c)=>n+c.line_count,0)>=703,false);
 // top 20 components are not expected to include every displayed fragment.
const html=read('national-parks-trails.html');
assert(html.includes('국립공원 등산로 원본 · v89'));
assert(!html.includes('seorak-v89-graph.js'),'routing graph must not be silently enabled in the map');
assert(html.includes('outerSeorak.features.push(...added83)'));
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
assert(read('README.md').includes('**현재 버전: v89**'));
const workflow=read('.github/workflows/deploy-pages.yml');
assert(workflow.includes('tools/seorak-topology-v89.mjs --output-dir site'));
console.log('PASS v89: exact stored-vertex graph from all 703 displayed ways, no synthetic joins; preview non-navigational');
console.log('SANBAK_V89_TEST_STATS='+JSON.stringify({
 components:graph.stats.connected_components,
 nodes:graph.stats.unique_stored_coordinate_nodes,
 edges:graph.stats.source_consecutive_edges,
 contacts:graph.stats.contacts,
 near:graph.stats.near,
 crossings:graph.stats.crossings
}));
