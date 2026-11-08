import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scope={};
for(const file of ['core/nationwide-topology-v102.js','core/nationwide-route-preview-v104.js',
 'core/nationwide-elevation-v107.js','core/nationwide-elevation-pack-v108.js',
 'core/nationwide-elevation-chart-v107.js'])
 new Function('window',read(file))(scope);
const geo=JSON.parse(read('data/knps-seorak-2018.geojson'));
const graph=scope.SanbakTopologyV102.build(
 scope.SanbakTopologyV102.historicKnps(geo),{sourceGeometry:'original'});
const pack=JSON.parse(read('data/nationwide-elevation/seorak-knps-v108.json'));
const decoded=scope.SanbakElevationPackV108.expand(pack,graph,'knps','428302602');
scope.SanbakElevationV107.checkDataset(decoded,graph,'knps','428302602');
const keys=Object.keys(decoded.edgeSamples);
assert.equal(pack.dem.sha256,'3fde3a99661629ce32643cb8134b8aadc94ef824a4829daae5aa84e6376695c1');
assert.equal(pack.dem.resolutionMeters,90);
assert.equal(pack.dem.crs,'EPSG:5179');
assert.equal(pack.dem.verticalDatum,'원본 파일에 수직기준 명시 없음');
assert.equal(keys.length,22);
assert.equal(keys.reduce((n,k)=>n+decoded.edgeSamples[k].length,0),1126);
assert.equal(graph.nodes.length,39);
assert.equal(graph.edges.length,22);
assert.equal(graph.summary.geometricComponents,17);
for(const id of keys){
 const e=graph.edges[Number(id)],samples=decoded.edgeSamples[id];
 assert.equal(samples.at(-1)[0],e.length_m);
 assert.equal(samples[0][0],0);
 assert(samples.every(x=>Number.isFinite(x[1])&&x[1]>=0&&x[1]<=2000));
}
const engine=scope.SanbakGeometryPlannerV104.create(graph,'knps');
const sample=engine.plan(engine.example());
assert.equal(sample.status,'geometry_preview_only');
const result=scope.SanbakElevationV107.profile(sample,graph,'knps','428302602',decoded);
assert.equal(result.status,'ready');
assert(result.points.length>2);
assert(result.totalMeters>0);
assert(result.ascentMeters>=0&&result.descentMeters>=0);
assert.equal(result.accessVerified,false);
assert.equal(scope.SanbakElevationV107.profile(sample,graph,'knps','428302602',null).status,'no_dem');
const truncated={...pack,samples:{...pack.samples,'0':pack.samples['0'].slice(0,-2)}};
assert.throws(()=>scope.SanbakElevationPackV108.expand(truncated,graph,'knps','428302602'));
const mismatched={...pack,edgeIdentities:{...pack.edgeIdentities,'0':[999,1,205.44,'knps2018:0:0',0,1]}};
assert.throws(()=>scope.SanbakElevationPackV108.expand(mismatched,graph,'knps','428302602'),/원본 경로 구간/);
assert.throws(()=>scope.SanbakElevationPackV108.expand(pack,{...graph,edges:graph.edges.slice(0,-1)},'knps','428302602'),/맞지 않아/);
const manifest=scope.SanbakElevationV107.checkIndex(JSON.parse(read('data/nationwide-elevation/index.json')));
assert.equal(manifest.mountains['428302602:knps']?.path,'./data/nationwide-elevation/seorak-knps-v108.json');
assert.equal(manifest.mountains['428302602:knps'].path,'./data/nationwide-elevation/seorak-knps-v108.json');
assert.equal(manifest.mountains['428302602:forest']?.matchedEdges,57,'forest graph has its own 57 original-edge DEM samples');
const page=read('nationwide-plan.html');
for(const phrase of ['산박지도 v120 | 경로 거리 제한 해제','core/nationwide-elevation-pack-v108.js',
 "altPack.expand(data,originalGraph,kind,code)",
 '2,723개 산·53,034개 원본 구간의 고도자료를 온라인으로 배포'])assert(page.includes(phrase),phrase);
new Function(page.slice(page.lastIndexOf('<script>')+8,page.lastIndexOf('</script>')));
const wf=read('.github/workflows/deploy-pages.yml'),sw=read('sw.js');
assert(wf.includes('cp core/nationwide-elevation-v107.js core/nationwide-elevation-partial-v119.js core/nationwide-elevation-chart-v107.js core/nationwide-elevation-pack-v108.js core/nationwide-elevation-archive-v110.js site/core/'));
assert(wf.includes('cp data/nationwide-elevation/*.json site/data/nationwide-elevation/'));
assert(sw.includes('sanbakmap-v120-no-distance-limit'));
assert(sw.includes('./data/nationwide-elevation/seorak-knps-v108.json'));
assert(read('national.html').includes('전국 코스 선형 v120'));
console.log('PASS v108: real source 38814.img 90m samples match 22 KNPS Seorak original edges, 1126 positions, no invented forest altitudes');
