import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const w={};
for(const name of ['core/nationwide-topology-v102.js','core/nationwide-knps-contacts-v117.js',
 'core/nationwide-knps-nearby-v118.js','core/nationwide-knps-interior-v122.js',
 'core/nationwide-graph-normalize-v124.js','core/nationwide-route-preview-v104.js',
 'core/nationwide-map-v106.js','core/nationwide-elevation-v107.js',
 'core/nationwide-elevation-pack-v108.js','core/nationwide-elevation-partial-v119.js'])
 new Function('window',read(name))(w);
const geo=JSON.parse(read('data/knps-seorak-2018.geojson'));
const original=w.SanbakTopologyV102.build(w.SanbakTopologyV102.historicKnps(geo),
 {sourceGeometry:'original'});
const contact=w.SanbakKnpsContactsV117.enhance(original,geo);
const nearby=w.SanbakKnpsNearbyV118.enhance(contact.graph,geo,{maxGapMeters:250});
const interior=w.SanbakKnpsInteriorV122.enhance(nearby.graph,original,geo);
const sourceParts=w.SanbakGraphNormalizeV124.knpsParts(geo);
const originalPlanner=w.SanbakGeometryPlannerV104.create(interior.graph,'knps');
const before=originalPlanner.plan([27,32,12]);
assert.equal(before.status,'geometry_preview_only');
assert(before.legs[1].meters>13800&&before.legs[1].meters<13900);
assert.equal(originalPlanner.componentOf(32),originalPlanner.componentOf(12),
 'crucial: detour exists inside ONE already connected graph component');
const normalized=w.SanbakGraphNormalizeV124.enhance(interior.graph,original,sourceParts);
assert.equal(normalized.connectors.length,1,'source-feature geometry does not invent many shortcuts');
assert(normalized.connectors[0].gapMeters>27&&normalized.connectors[0].gapMeters<28);
assert.deepEqual(normalized.connectors[0].sourceIds,
 ['knps2018:10:0','knps2018:20:0']);
assert.deepEqual(normalized.graph.edges.slice(0,original.edges.length),original.edges);
assert.equal(normalized.graph.accessVerified,false);
assert.equal(normalized.graph.summary.physicalJunctionVerified,false);
assert.equal(normalized.graph.summary.currentAccessVerified,false);
const planner=w.SanbakGeometryPlannerV104.create(normalized.graph,'knps');
const after=planner.plan([27,32,12]);
assert.equal(after.status,'geometry_preview_only');
assert.equal(after.legs.length,2);
assert(Math.abs(after.legs[0].meters-before.legs[0].meters)<.01);
assert(after.legs[1].meters>2200&&after.legs[1].meters<2240,
 '32→12 now uses original trail + 27m unverified gap, instead of 13.8km loop');
assert(after.distanceMeters<before.distanceMeters*.52);
assert(after.legs[1].edgeIds.some(id=>normalized.graph.edges[id].provisionalGap&&
 normalized.graph.edges[id].length_m>27));
const strict=w.SanbakGraphNormalizeV124.enhance(interior.graph,original,sourceParts,{maxGapMeters:15});
assert.equal(strict.connectors.length,0);
assert.equal(w.SanbakGeometryPlannerV104.create(strict.graph,'knps').plan([32,12]).distanceMeters,
 originalPlanner.plan([32,12]).distanceMeters);
const map=w.SanbakLineMapV106.create(normalized.graph,'knps',{geojson:geo});
const overlay=map.overlay(after);
assert.equal(overlay.unmatchedEdges,0);
assert(overlay.provisionalPaths.length>=2);
const dem=w.SanbakElevationPackV108.expand(JSON.parse(read('data/nationwide-elevation/seorak-knps-v108.json')),original,'knps','428302602');
const h=w.SanbakElevationPartialV119.profile(after,original,normalized.graph,'knps','428302602',dem);
assert.equal(Object.keys(dem.edgeSamples).length,22,'unchanged original DEM source edges');
assert(h.coveredMeters>12000&&h.unknownMeters<30);
assert(h.estimates.length>=2);
assert(read('nationwide-plan.html').includes('SanbakGraphNormalizeV124'));
assert(read('.github/workflows/deploy-pages.yml').includes('core/nationwide-graph-normalize-v124.js site/core/'));
console.log('PASS v124: already-connected 32→12 graph reroutes 13.83km to 2.22km via one 27.29m provisional source-line contact');
