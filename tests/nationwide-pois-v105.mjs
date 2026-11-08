import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {rebuild as rebuildTopology} from '../tools/rebuild-topology-v102.mjs';
import '../core/nationwide-pois-v105.js';
import '../core/nationwide-route-preview-v104.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const poi=globalThis.SanbakNationwidePoiV105;
const planner=globalThis.SanbakGeometryPlannerV104;
const index=poi.checkIndex(JSON.parse(read('data/nationwide-pois/index.json')));
assert.equal(index.matchedPoints,45627);assert.equal(index.mountainsWithCandidatePoints,2878);
assert.equal(index.sourceAccessVerified,false);assert.equal(index.knpsCombined,false);
let count=0,types=[0,0,0,0];const mountains=new Set(),shards=[];
for(let i=0;i<32;i++){
 const id=String(i).padStart(2,'0'),gz=readFileSync(new URL('../data/nationwide-pois/bucket-'+id+'.json.gz',import.meta.url));
 const d=poi.checkBucket(JSON.parse(gunzipSync(gz).toString('utf8')),index);shards.push(d);
 for(const [code,rows]of Object.entries(d.mountains)){
  assert(/^\d{9}$/.test(code));mountains.add(code);
  for(const item of rows){
   assert.equal(item.length,7);assert(item[5]>=0&&item[5]<=0.15);
   types[item[1]]++;count++;
  }
 }
}
assert.equal(count,45627);assert.equal(mountains.size,2878);
assert.deepEqual(types,[27549,17532,545,1]);
const tmp=await mkdtemp(join(tmpdir(),'sanbak-pois-v105-'));
try{
 const built=await rebuildTopology({outputDir:tmp});assert.equal(built.mountains,2902);
 const topoIndex=JSON.parse(await readFile(join(tmp,'index.json'),'utf8'));
 assert.equal(index.topologySourceSHA256,topoIndex.source_zip_sha256);
 let checked=0;
 for(let i=0;i<32;i++){
  const id=String(i).padStart(2,'0');
  const graphs=JSON.parse(gunzipSync(await readFile(join(tmp,'bucket-'+id+'.json.gz'))).toString('utf8'));
  for(const [code,rows]of Object.entries(shards[i].mountains)){
   const model=planner.create(graphs.mountains[code],'forest');
   const linked=poi.selectMountain(shards[i],index,code,model);
   assert.equal(linked.length,rows.length);
   for(const p of linked){
    assert(p.nodeId>=0&&p.nodeId<model.nodeCount);
    assert.equal(p.coordinatesMatched,true);assert.equal(p.accessVerified,false);
    assert.equal(p.routingApproved,false);
    if(p.kind==='분기점')assert(model.degreeOf(p.nodeId)>=3);
   }
   checked++;
  }
 }
 assert.equal(checked,2878);
 const code='428302602',bucket=topoIndex.mountains[code].bucket;
 const g=JSON.parse(gunzipSync(await readFile(join(tmp,'bucket-'+bucket+'.json.gz'))).toString('utf8')).mountains[code];
 const forestModel=planner.create(g,'forest');
 const forestPoints=poi.selectMountain(shards[Number(bucket)],index,code,forestModel);
 assert(forestPoints.length>10);
 const scope={};new Function('window',read('core/nationwide-topology-v102.js'))(scope);
 const knps=JSON.parse(read('data/knps-seorak-2018.geojson'));
 const knpsG=scope.SanbakTopologyV102.build(scope.SanbakTopologyV102.historicKnps(knps),{sourceGeometry:'original'});
 const knpsModel=planner.create(knpsG,'knps');
 assert.throws(()=>poi.selectMountain(shards[Number(bucket)],index,code,knpsModel),/original forest-source graph/);
}finally{await rm(tmp,{recursive:true,force:true})}
const html=read('nationwide-plan.html'),workflow=read('.github/workflows/deploy-pages.yml');
for(const token of ['산박지도 v109 | 원본 연결망 DEM 고도 확대','id="poiSelect"','id="poiType"',
 'id="sourceMode"','core/nationwide-pois-v105.js','data/nationwide-pois/index.json',
 'poiCore.selectMountain','setPOIs([])'])assert(html.includes(token),token);
const inline=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'));
new Function(inline);
assert(workflow.includes('cp data/nationwide-pois/index.json data/nationwide-pois/bucket-*.json.gz site/data/nationwide-pois/'));
assert(workflow.includes("wc -l)\" -eq 32"));
assert(workflow.includes('core/nationwide-pois-v105.js core/nationwide-map-v106.js core/nationwide-map-view-v106.js site/core/'));
assert(read('sw.js').includes('sanbakmap-v109-national-dem-pilot'));
assert(read('national.html').includes('전국 코스 선형 v109'));
console.log('PASS v105: 32 agency POI buckets, 45,627 exact POIs in 2,878 mountains, no cross-source KNPS links');
