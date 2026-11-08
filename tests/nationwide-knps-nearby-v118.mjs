import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const win={};
for(const path of ['core/nationwide-topology-v102.js',
 'core/nationwide-knps-contacts-v117.js','core/nationwide-knps-nearby-v118.js',
 'core/nationwide-map-v106.js','core/nationwide-route-preview-v104.js'])
 new Function('window',read(path))(win);
const source=JSON.parse(read('data/knps-seorak-2018.geojson'));
const raw=win.SanbakTopologyV102.build(
 win.SanbakTopologyV102.historicKnps(source),{sourceGeometry:'original'});
const exact=win.SanbakKnpsContactsV117.enhance(raw,source).graph;
const strict=win.SanbakGeometryPlannerV104.create(exact,'knps');
const plan=win.SanbakKnpsNearbyV118.enhance(exact,source,{maxGapMeters:5});
const graph=plan.graph;
assert.equal(raw.summary.geometricComponents,17);
assert.equal(exact.summary.geometricComponents,16);
assert(plan.connectors.length>=3,'need several independently plausible nearby candidates');
assert(graph.summary.geometricComponents<16,'strict geometry must miss near endpoint contacts');
assert(graph.summary.proximityEdgesCreated===plan.connectors.length);
assert.equal(graph.originalNodeCount,exact.nodes.length);
assert.deepEqual(graph.edges.slice(0,exact.edges.length),exact.edges,
 'all original 22 IDs and precise 2 split edges must remain unchanged');
assert.deepEqual(graph.nodes.slice(0,exact.nodes.length),exact.nodes);
for(const c of plan.connectors){
 assert(c.gapMeters>.01&&c.gapMeters<=5);
 assert(c.mode.includes('PLAN_ONLY'));
 const e=graph.edges[c.edgeId];
 assert(e.provisionalGap&&e.accessVerified===false&&e.routable===false);
 assert.equal(e.from,c.fromNode);assert.equal(e.to,c.toNode);
 assert(Array.isArray(e.previewPolyline)&&e.previewPolyline.length===2);
}
const planner=win.SanbakGeometryPlannerV104.create(graph,'knps');
assert.equal(planner.componentCount,graph.summary.geometricComponents);
const display=win.SanbakLineMapV106.create(graph,'knps',{geojson:source});
assert.equal(display.pickableNode(exact.nodes.length),false,
 'derived projection point must NOT masquerade as a user-entered original node');
let selected=null;
for(const c of plan.connectors){
 const target=exact.edges[c.sourceEdge];
 const a=strict.plan([c.fromNode,target.from]);
 const b=planner.plan([c.fromNode,target.from]);
 if(a.status==='disconnected'&&b.status==='geometry_preview_only'){
  selected={c,a,b};break;
 }
}
assert(selected,'a newly bridged original endpoint-to-trail route must exist');
assert(selected.b.legs[0].edgeIds.some(eid=>graph.edges[eid].provisionalGap),
 'shortest route must disclose at least one provisional gap');
const shown=display.overlay(selected.b);
assert(shown.provisionalPaths.length>=1,'approximate gap must draw as amber-dashed path');
assert(shown.unmatchedEdges===0,'nearby connector must not become an invisible fake straight line');
assert.equal(planner.plan([23,33]).status,'disconnected',
 'do not connect long-distance source gaps or guarantee unrelated trails');
console.log('PASS v118: source-locked near-line 5m preview; joins '+plan.connectors.length+
 ' gaps, '+graph.summary.geometricComponents+' remaining components, no invented source/DEM IDs, amber gap route rendered, original nodes only');
