import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const win={};
for(const file of ['core/nationwide-map-v106.js','core/nationwide-source-loader.js',
 'core/nationwide-topology-v102.js','core/nationwide-route-preview-v104.js'])
 new Function('window',read(file))(win);
const map=win.SanbakLineMapV106,core=win.SanbakNationwideAgency,
 topology=win.SanbakTopologyV102,planner=win.SanbakGeometryPlannerV104;
assert.equal(map.version,106);
const xy=map.to5179([127,37]);
assert(Math.hypot(xy[0]-955511.809285,xy[1]-1889174.174347)<.05,'WGS84 to EPSG5179 projection is grounded');
assert.deepEqual(map.to5179([127.5,38]),[1000000,2000000]);
assert.throws(()=>map.to5179([0,0]));
const knps=JSON.parse(read('data/knps-seorak-2018.geojson'));
const graph=topology.build(topology.historicKnps(knps),{sourceGeometry:'original'});
const shape=map.create(graph,'knps',{geojson:knps});
const engine=planner.create(graph,'knps');
assert.equal(shape.baseLineCount,21);
assert.equal(shape.nodesXY.length,39);
const plan=engine.plan(engine.example());
assert.equal(plan.status,'geometry_preview_only');
const drawn=shape.overlay(plan);
assert.equal(drawn.unmatchedEdges,0);
assert.equal(drawn.drawnEdges,drawn.totalEdges);
assert(drawn.paths.length>=2);
assert.equal(drawn.navigable,false);
assert(shape.paths.some(a=>a.length>30),'KNPS full source line shape retained');
const agency=JSON.parse(read('data/nationwide/bucket-00.json'));
const code='114100501';
assert.equal(agency.mountains[code][0][1],3797);
const unit={nodes:[[9505639,19542371],[9505506,19542783]],
 edges:[[0,1,43.36,0,0,2]],
 source_parts:[[0,3797,0,'2016-12-31','','']],
 summary:{navigable:false,access_verified:false,physical_junction_verified:false}};
const forest=map.create(unit,'forest',{agencyData:agency,code,
 sourceFiles:['닭/11 (1).zip'],decodeLine:core.decodeLine});
assert(forest.baseLineCount>=20);
const single=forest.overlay({status:'geometry_preview_only',
 legs:[{nodeIds:[0,1],edgeIds:[0]}]});
assert.equal(single.totalEdges,1);
assert.equal(single.drawnEdges,1);
assert.equal(single.unmatchedEdges,0);
assert.equal(single.paths.length,1);
assert(single.paths[0].length>=2);
const mismatched=map.create(unit,'forest',{agencyData:agency,code,
 sourceFiles:['닭/unknown.zip'],decodeLine:core.decodeLine});
const missing=mismatched.overlay({status:'geometry_preview_only',
 legs:[{nodeIds:[0,1],edgeIds:[0]}]});
assert.equal(missing.unmatchedEdges,1);
assert.equal(missing.paths.length,0,'never draw a guessed straight-line connector');
assert.throws(()=>forest.overlay({status:'geometry_preview_only',
 legs:[{nodeIds:[1,1],edgeIds:[0]}]}),/unrelated segment/);
const page=read('nationwide-plan.html'),workflow=read('.github/workflows/deploy-pages.yml');
for(const token of ['산박지도 v106 | 전국 등산로·코스 선형 표시',
 'id="trailMap"','id="mapFit"','id="mapZoomIn"','id="mapZoomOut"',
 'core/nationwide-map-v106.js','core/nationwide-map-view-v106.js',
 'mapCore.create(graph,\'forest\'','mapCanvas.update({selected:waypoints',
 '산림청 선형 표시 실패','지도에서'])assert(page.includes(token),token);
const inline=page.slice(page.lastIndexOf('<script>')+8,page.lastIndexOf('</script>'));
new Function(inline);
new Function('window',read('core/nationwide-map-view-v106.js'))({});
assert(!page.includes('OpenStreetMap'));
assert(!page.includes('openstreetmap.org'));
assert(workflow.includes('core/nationwide-map-v106.js core/nationwide-map-view-v106.js site/core/'));
assert(read('sw.js').includes('sanbakmap-v106-trail-route-svg'));
console.log('PASS v106: EPSG5179 accuracy, 2018 KNPS true trail shapes, forest-source map match, no fake gap, nationwide SVG UI');
