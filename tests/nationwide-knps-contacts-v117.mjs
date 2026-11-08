import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const win={};
for(const file of ['core/nationwide-topology-v102.js',
 'core/nationwide-knps-contacts-v117.js','core/nationwide-map-v106.js',
 'core/nationwide-route-preview-v104.js','core/nationwide-elevation-v107.js',
 'core/nationwide-elevation-pack-v108.js'])
 new Function('window',read(file))(win);
const source=JSON.parse(read('data/knps-seorak-2018.geojson'));
const base=win.SanbakTopologyV102.build(
 win.SanbakTopologyV102.historicKnps(source),{sourceGeometry:'original'});
assert.equal(base.nodes.length,39);assert.equal(base.edges.length,22);
assert.equal(base.summary.geometricComponents,17);
const expanded=win.SanbakKnpsContactsV117.enhance(base,source);
const graph=expanded.graph;
assert.equal(expanded.originalEdgeCount,22);
assert.equal(expanded.contacts.length,1,
 'Only exact endpoint-on-segment contacts, not ambiguous crossings or 20cm near gaps');
assert.equal(graph.nodes.length,39);
assert.equal(graph.edges.length,24);
assert.equal(graph.summary.geometricComponents,16);
assert.equal(graph.summary.proximityEdgesCreated,0);
assert.equal(graph.summary.physicalJunctionVerified,false);
assert.equal(graph.summary.currentAccessVerified,false);
assert.deepEqual(graph.edges.slice(0,base.edges.length),base.edges,
 'Original source edge ID and original vertices must be preserved');
const contact=expanded.contacts[0];
assert.equal(contact.fromNode,16);
assert.equal(base.edges[contact.sourceOriginalEdgeId].sourceId,'knps2018:17:0');
assert(contact.distanceM<.01);
assert.deepEqual(contact.appendedEdgeIds,[22,23]);
const [halfA,halfB]=contact.appendedEdgeIds.map(i=>graph.edges[i]);
assert.equal(halfA.from,base.edges[contact.sourceOriginalEdgeId].from);
assert.equal(halfA.to,16);
assert.equal(halfB.from,16);
assert.equal(halfB.to,base.edges[contact.sourceOriginalEdgeId].to);
assert(Math.abs(halfA.length_m+halfB.length_m-
 base.edges[contact.sourceOriginalEdgeId].length_m)<.011);
for(const e of [halfA,halfB]){
 assert(e.geometricContactOnly&&e.accessVerified===false&&e.routable===false);
 assert.equal(e.sourceOriginalEdgeId,contact.sourceOriginalEdgeId);
}
const oldPlan=win.SanbakGeometryPlannerV104.create(base,'knps');
const newPlan=win.SanbakGeometryPlannerV104.create(graph,'knps');
const branch=base.edges[contact.sourceOriginalEdgeId];
assert.equal(oldPlan.plan([16,branch.from]).status,'disconnected');
assert.equal(newPlan.plan([16,branch.from]).status,'geometry_preview_only');
assert.equal(newPlan.plan([16,branch.to]).status,'geometry_preview_only');
assert.equal(newPlan.plan([23,33]).status,'disconnected',
 'A distant unknown passage must never be fabricated');
const shape=win.SanbakLineMapV106.create(graph,'knps',{geojson:source});
const mapped=shape.overlay(newPlan.plan([16,branch.from,branch.to]));
assert(mapped.paths.length>=1,'Exact on-segment route must render source geometry');
assert.equal(mapped.unmatchedEdges,0);
const pack=JSON.parse(read('data/nationwide-elevation/seorak-knps-v108.json'));
const dem=win.SanbakElevationPackV108.expand(pack,base,'knps','428302602');
win.SanbakElevationV107.checkDataset(dem,base,'knps','428302602');
const oldRoute=oldPlan.plan([12,11,33]),newRoute=newPlan.plan([12,11,33]);
assert.equal(oldRoute.status,'geometry_preview_only');
assert.equal(newRoute.status,'geometry_preview_only');
assert.deepEqual(newRoute.legs.map(x=>x.edgeIds),oldRoute.legs.map(x=>x.edgeIds),
 'Old route IDs must remain usable for unchanged DEM');
assert.equal(win.SanbakElevationV107.profile(newRoute,base,'knps','428302602',dem).status,'ready');
console.log('PASS v117: 1 exact endpoint-on-segment contact, 39 nodes / 24 edges / 16 geometric components, no 0.2m snap, old KNPS 22-edge DEM preserved');
