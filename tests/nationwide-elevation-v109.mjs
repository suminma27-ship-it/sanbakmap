import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {rebuild} from '../tools/rebuild-topology-v102.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const win={};
for(const file of ['core/nationwide-elevation-v107.js','core/nationwide-elevation-pack-v108.js','core/nationwide-route-preview-v104.js'])
 new Function('window',read(file))(win);
const index=win.SanbakElevationV107.checkIndex(JSON.parse(read('data/nationwide-elevation/index.json')));
const pilots=[
 ['428302602','seorak-forest-v109.json',45,57],
 ['421504602','odae-forest-v109.json',21,23],
 ['483100401','gyeryong-forest-v109.json',21,19]
];
assert.equal(index.mountains['428302602:knps'].matchedEdges,22);
assert.equal(Object.keys(index.mountains).length,4);
const temp=mkdtempSync(join(tmpdir(),'sanbak-v109-'));
try{
 const rebuilt=await rebuild({outputDir:temp});
 assert.equal(rebuilt.mountains,2902);
 const bucketMemo=new Map();
 const dataIndex=JSON.parse(read('data/nationwide/index.json'));
 for(const [code,filename,nExpected,eExpected] of pilots){
  const bucket=dataIndex.mountains[code]?.bucket;
  assert(bucket,'Mountain must be in forest topology index');
  if(!bucketMemo.has(bucket)){
   const content=JSON.parse(gunzipSync(readFileSync(join(temp,'bucket-'+bucket+'.json.gz'))).toString('utf8'));
   bucketMemo.set(bucket,content);
  }
  const graph=bucketMemo.get(bucket).mountains[code];
  const pack=JSON.parse(read('data/nationwide-elevation/'+filename));
  assert.equal(pack.dem.sha256,'6e9e51a467d6be4ba35bec5127bbb4b896e36e1dbf884535d1aecaa8605224d2');
  assert.equal(pack.dem.hashKind,'annotated-geojson-archive');
  assert.equal(pack.dem.resolutionMeters,null,'not permissible to invent raster resolution');
  assert.equal(pack.dem.sourceRasterResolutionVerified,false);
  assert.equal(pack.dem.verticalDatum,'원본 DEM 수직기준 미기재');
  assert.equal(pack.accessVerified,false);
  const expanded=win.SanbakElevationPackV108.expand(pack,graph,'forest',code);
  win.SanbakElevationV107.checkDataset(expanded,graph,'forest',code);
  assert.equal(graph.nodes.length,nExpected);
  assert.equal(graph.edges.length,eExpected);
  assert.equal(Object.keys(expanded.edgeSamples).length,eExpected);
  assert.equal(index.mountains[code+':forest'].matchedEdges,eExpected);
  assert.equal(index.mountains[code+':forest'].path,'./data/nationwide-elevation/'+filename);
  const engine=win.SanbakGeometryPlannerV104.create(graph,'forest');
  const path=engine.plan(engine.example());
  assert.equal(path.status,'geometry_preview_only');
  const profile=win.SanbakElevationV107.profile(path,graph,'forest',code,expanded);
  assert.equal(profile.status,'ready',code);
  assert.equal(profile.resolutionMeters,null);
  assert.equal(profile.accessVerified,false);
  assert(profile.points.length>=2);
  const altered={...pack,edgeIdentities:{...pack.edgeIdentities,'0':[99,...pack.edgeIdentities['0'].slice(1)]}};
  assert.throws(()=>win.SanbakElevationPackV108.expand(altered,graph,'forest',code),/원본 경로/);
 }
 const page=read('nationwide-plan.html');
 assert(page.includes('산박지도 v117 | 공단 원본 접점 정밀 보정'));
 assert(page.includes('원본 DEM 해상도 미확인'));
 const sw=read('sw.js');
 assert(sw.includes('sanbakmap-v117-knps-exact-contacts'));
 for(const [,f] of pilots)assert(sw.includes('./data/nationwide-elevation/'+f));
 new Function(page.slice(page.lastIndexOf('<script>')+8,page.lastIndexOf('</script>')));
 console.log('PASS v109: three original forest archives, 99/99 edge elevations, source SHA locked, no invented DEM raster metadata, real route SVG compatible');
}finally{rmSync(temp,{recursive:true,force:true})}
