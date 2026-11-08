import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {rebuild} from '../tools/rebuild-topology-v102.mjs';

// v111: 20 actual institutional source mountain graphs x 3 route scenarios.
// A graph connection is only geometric coincidence; never assert safe/legal access.
const root=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scope={};
for(const file of [
 'core/nationwide-route-preview-v104.js','core/nationwide-topology-v102.js',
 'core/nationwide-elevation-v107.js','core/nationwide-elevation-pack-v108.js'
])new Function('window',root(file))(scope);
const planner=scope.SanbakGeometryPlannerV104;
const alt=scope.SanbakElevationV107,packed=scope.SanbakElevationPackV108;
const names=JSON.parse(root('data/nationwide/index.json')).mountains;
const representative=[
 ['428302602','설악산_대청봉'],['488605302','지리산_천왕봉'],
 ['113050202','북한산_백운대'],['421504602','오대산_노인봉'],
 ['483100401','계룡산'],['457300702','덕유산_향적봉'],
 ['438001301','소백산_비로봉'],['437201201','속리산_천황봉'],
 ['431503501','월악산_영봉'],['421902201','태백산_장군봉'],
 ['462300101','가야산'],['271401201','팔공산_비로봉'],
 ['477502301','주왕산'],['116200201','관악산'],
 ['113200102','도봉산_자운봉'],['113500201','수락산'],
 ['412900401','청계산'],['411170201','광교산'],
 ['418303301','유명산'],['437401401','민주지산']
];
assert.equal(representative.length,20);
const temp=mkdtempSync(join(tmpdir(),'sanbak-national-v111-'));
let tested=0,unconnected=0,invalidFallback=0,validLegs=0;
const graphCache=new Map(), byCode=new Map();
try{
 const result=await rebuild({outputDir:temp});
 assert.equal(result.mountains,2902);
 assert.equal(result.edges,67185);
 const audit=JSON.parse(readFileSync(join(temp,'index.json'),'utf8'));
 const get=code=>{
  const bucket=audit.mountains[code]?.bucket;
  assert(/^\d{2}$/.test(bucket),'missing source code: '+code);
  if(!graphCache.has(bucket)){
   const path=join(temp,'bucket-'+bucket+'.json.gz');
   graphCache.set(bucket,JSON.parse(gunzipSync(readFileSync(path)).toString('utf8')));
  }
  return graphCache.get(bucket).mountains[code];
 };
 for(const [code,name] of representative){
  assert.equal(names[code]?.name,name,'source mountain identity changed: '+code);
  const graph=get(code);byCode.set(code,graph);
  assert(graph?.summary?.navigable===false&&graph?.summary?.access_verified===false);
  const model=planner.create(graph,'forest');
  assert(model.edgeCount>0,'no original geometry to test: '+code);
  const edge=graph.edges.find(e=>Array.isArray(e)&&e.length===6&&e[0]!==e[1]&&e[2]>0);
  assert(edge,'no nonzero original route geometry: '+code);
  const [from,to,metres]=edge;
  const forward=model.plan([from,to]);
  assert.equal(forward.status,'geometry_preview_only',name+' forward');
  assert(forward.distanceMeters>0&&forward.distanceMeters<=metres+.02);
  assert.equal(forward.usableForNavigation,false);
  assert.equal(forward.currentAccessVerified,false);
  assert.equal(forward.approvedConnections,0);
  assert(forward.legs[0].edgeIds.length>0);
  assert(forward.legs[0].nodeIds.length===forward.legs[0].edgeIds.length+1);
  tested++;validLegs+=forward.legs[0].edgeIds.length;
  const backward=model.plan([to,from]);
  assert.equal(backward.status,'geometry_preview_only',name+' backward');
  assert(Math.abs(backward.distanceMeters-forward.distanceMeters)<=.02,
    name+' reverse path length mismatch');
  assert.equal(backward.usableForNavigation,false);
  tested++;
  const startComponent=model.componentOf(from);
  let other=-1;
  for(let node=0;node<model.nodeCount;node++)if(model.componentOf(node)!==startComponent){
   other=node;break;
  }
  if(other>=0){
   assert.equal(model.plan([from,other]).status,'disconnected',name+' gap false-positive');
   unconnected++;
  }else{
   assert.equal(model.plan([from,model.nodeCount]).status,'invalid_node',
    name+' out-of-range node false-positive');
   invalidFallback++;
  }
  tested++;
 }
 assert.equal(tested,60);
 assert.equal(unconnected+invalidFallback,20);
 // Real original-edge height datasets already ONLINE: 3 forest pilots + 1 KNPS Seorak.
 // Every registered edge must yield a finite, directional, source-matched profile.
 const pilots=[
  ['428302602','seorak-forest-v109.json'],['421504602','odae-forest-v109.json'],
  ['483100401','gyeryong-forest-v109.json']
 ];
 const provenance=alt.checkIndex(JSON.parse(root('data/nationwide-elevation/index.json')));
 let altitudeChecks=0,edgeProfiles=0;
 function checkAllEdges(code,kind,graph,file){
  const obj=JSON.parse(root('data/nationwide-elevation/'+file));
  const sample=packed.expand(obj,graph,kind,code);
  alt.checkDataset(sample,graph,kind,code);
  for(const id of Object.keys(sample.edgeSamples)){
   const k=Number(id),e=graph.edges[k];
   const a=kind==='knps'?e.from:e[0],b=kind==='knps'?e.to:e[1];
   const length=kind==='knps'?e.length_m:e[2];
   assert(a!==b&&length>0);
   const run=(x,y)=>alt.profile({
    status:'geometry_preview_only',distanceMeters:length,
    legs:[{nodeIds:[x,y],edgeIds:[k]}]
   },graph,kind,code,sample);
   const p=run(a,b),q=run(b,a);
   assert.equal(p.status,'ready',code+' edge '+id);
   assert.equal(q.status,'ready',code+' reverse edge '+id);
   assert.equal(p.accessVerified,false);
   assert.equal(q.accessVerified,false);
   for(const r of [p,q]){
    assert(r.points.length>=2);
    assert(Math.abs(r.totalMeters-length)<.01);
    assert(r.ascentMeters>=0&&r.descentMeters>=0);
    assert(r.points.every((v,i,arr)=>Number.isFinite(v.distanceMeters)&&
      Number.isFinite(v.elevationMeters)&&(!i||v.distanceMeters>arr[i-1].distanceMeters)));
    const net=r.points.at(-1).elevationMeters-r.points[0].elevationMeters;
    assert(Math.abs(net-(r.ascentMeters-r.descentMeters))<.01,'elevation balance');
   }
   assert(Math.abs(p.ascentMeters-q.descentMeters)<.05,'ascent/descent reverse');
   assert(Math.abs(p.descentMeters-q.ascentMeters)<.05,'descent/ascent reverse');
   altitudeChecks+=2;
   edgeProfiles++;
  }
  assert.equal(edgeProfiles>=Object.keys(sample.edgeSamples).length,true);
  assert.equal(provenance.mountains[code+':'+kind].matchedEdges,
    Object.keys(sample.edgeSamples).length);
  return Object.keys(sample.edgeSamples).length;
 }
 let forestEdges=0;
 for(const [code,file] of pilots)forestEdges+=checkAllEdges(code,'forest',byCode.get(code),file);
 const knpsJson=JSON.parse(root('data/knps-seorak-2018.geojson'));
 const knpsGraph=scope.SanbakTopologyV102.build(
  scope.SanbakTopologyV102.historicKnps(knpsJson),{sourceGeometry:'original'});
 const parkEdges=checkAllEdges('428302602','knps',knpsGraph,'seorak-knps-v108.json');
 assert.equal(forestEdges,99);
 assert.equal(parkEdges,22);
 assert.equal(altitudeChecks,242);
 // No online national coverage is asserted without the audited ZIP actually being deployed.
 const online=JSON.parse(root('data/nationwide-elevation/online-v110.json'));
 assert.equal(online.schema,'sanbak-national-dem-online-v110');
 assert.equal(online.accessVerified,false);
 assert.equal(online.rasterResolutionVerified,false);
 if(online.mountedMountains===0){
  assert.equal(Object.keys(online.mountains).length,0);
  assert.equal(online.matchedEdges,0);
 }
 const html=root('nationwide-plan.html');
 assert(html.includes('@media(max-width:760px)'),'mobile CSS rule absent');
 assert(html.includes('id="elevationPanel"'),'collapsible profile absent');
 assert(html.includes('id="elevationChart"'),'elevation canvas absent');
 assert(html.includes('id="trailMap"'),'trail map absent');
 console.log('PASS v111 20 source mountains / 60 real-graph scenarios: '+ 
  '20 forward, 20 reverse, '+unconnected+' disconnected, '+invalidFallback+
  ' invalid-node fallback; '+validLegs+' graph legs; '+
  edgeProfiles+' published source-edge DEM profiles x 2 directions = '+altitudeChecks+
  ' altitude tests; historical GIS only, access unverified');
}finally{rmSync(temp,{recursive:true,force:true})}
