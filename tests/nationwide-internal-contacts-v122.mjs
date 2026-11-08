import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const scope={};
for(const file of ['core/nationwide-topology-v102.js','core/nationwide-knps-contacts-v117.js',
 'core/nationwide-knps-nearby-v118.js','core/nationwide-knps-interior-v122.js',
 'core/nationwide-route-preview-v104.js','core/nationwide-elevation-v107.js',
 'core/nationwide-elevation-pack-v108.js','core/nationwide-elevation-partial-v119.js',
 'core/nationwide-map-v106.js'])new Function('window',read(file))(scope);
const raw=JSON.parse(read('data/knps-seorak-2018.geojson'));
const base=scope.SanbakTopologyV102.build(scope.SanbakTopologyV102.historicKnps(raw),{sourceGeometry:'original'});
const exact=scope.SanbakKnpsContactsV117.enhance(base,raw);
const approx=scope.SanbakKnpsNearbyV118.enhance(exact.graph,raw,{maxGapMeters:250});
const before=scope.SanbakGeometryPlannerV104.create(approx.graph,'knps').plan([32,28]);
assert.equal(before.status,'geometry_preview_only');
assert(before.distanceMeters>19500&&before.distanceMeters<19600,'old graph made a 19.5km detour');
const result=scope.SanbakKnpsInteriorV122.enhance(approx.graph,base,raw);
assert.equal(result.contacts.length,31);
assert.equal(result.addedEdges,70);
assert.deepEqual(result.graph.edges.slice(0,base.edges.length),base.edges,'original geometry remains untouched');
assert.equal(result.graph.summary.currentAccessVerified,false);
assert.equal(result.graph.summary.physicalJunctionVerified,false);
const after=scope.SanbakGeometryPlannerV104.create(result.graph,'knps').plan([32,28]);
assert.equal(after.status,'geometry_preview_only');
assert(after.distanceMeters>2650&&after.distanceMeters<2700,'exact vertex contacts must remove 19.5km detour');
assert(after.distanceMeters<before.distanceMeters/6);
assert(after.legs[0].edgeIds.some(id=>result.graph.edges[id]?.geometricContactOnly),
 'short route uses exact shared interior source vertices');
assert(after.legs[0].edgeIds.every(id=>!result.graph.edges[id]?.provisionalGap||
 result.graph.edges[id].length_m<10),'short route must not invent a long straight connection');
const dem=scope.SanbakElevationPackV108.expand(JSON.parse(read('data/nationwide-elevation/seorak-knps-v108.json')),base,'knps','428302602');
const altitude=scope.SanbakElevationPartialV119.profile(after,base,result.graph,'knps','428302602',dem);
assert.equal(Object.keys(dem.edgeSamples).length,22);
assert.equal(altitude.status,'partial');
assert(altitude.coveredMeters>2670&&altitude.unknownMeters<2,'split original DEM needs to be preserved');
const view=scope.SanbakLineMapV106.create(result.graph,'knps',{geojson:raw});
const render=view.overlay(after);
assert.equal(render.unmatchedEdges,0,'new source subedges must remain mapped to original source geometry');
assert(render.paths.length>0&&render.provisionalPaths.length>0);
assert(read('nationwide-plan.html').includes('SanbakKnpsInteriorV122'));
assert(read('.github/workflows/deploy-pages.yml').includes('cp core/nationwide-knps-interior-v122.js core/nationwide-graph-normalize-v124.js site/core/'));
assert(read('sw.js').includes('./core/nationwide-knps-interior-v122.js'));
console.log('PASS v122: KNPS exact shared interior coordinates give 2.68km instead of 19.53km, source DEM/visual map preserved');
