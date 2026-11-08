import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {rebuild as rebuildTopology} from '../tools/rebuild-topology-v102.mjs';
import '../core/nationwide-route-preview-v104.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const engine=globalThis.SanbakGeometryPlannerV104;
const forest={
 nodes:[[0,0],[100,0],[200,0],[300,0],[500,0],[600,0]],
 edges:[[0,1,10,0,0,1],[1,2,5,0,1,2],[2,3,7,0,2,3],[4,5,9,1,0,1]],
 source_parts:[[0],[1]],
 summary:{navigable:false,access_verified:false,physical_junction_verified:false,geometric_components:2}
};
const model=engine.create(forest,'forest');
assert.equal(model.nodeCount,6);assert.equal(model.edgeCount,4);
assert.equal(model.componentCount,2);
const first=model.plan([0,2,3]);assert.equal(first.status,'geometry_preview_only');
assert.equal(first.distanceMeters,22);assert.deepEqual(first.legs.map(x=>x.meters),[15,7]);
assert.deepEqual(first.legs[0].edgeIds,[0,1]);
assert.equal(first.currentAccessVerified,false);assert.equal(first.usableForNavigation,false);
assert.equal(first.approvedConnections,0);
assert.equal(model.plan([0,1,0]).distanceMeters,20,'allow round trips');
assert.equal(model.plan([0,4]).status,'disconnected');
assert.equal(model.plan([0,0]).status,'consecutive_duplicate');
assert.equal(model.plan([0,6]).status,'invalid_node');
assert.equal(model.plan([0]).status,'need_two_to_thirty_nodes');
assert(model.example().length>=2);
assert.throws(()=>engine.create({...forest,summary:{...forest.summary,navigable:true}},'forest'));
assert.throws(()=>engine.create({...forest,edges:[[0,4,8,2,0,1]]},'forest'));
const topoScope={};new Function('window',read('core/nationwide-topology-v102.js'))(topoScope);
const knps=JSON.parse(read('data/knps-seorak-2018.geojson'));
const raw=topoScope.SanbakTopologyV102.historicKnps(knps);
const knpsGraph=topoScope.SanbakTopologyV102.build(raw,{sourceGeometry:'original'});
const knpsEngine=engine.create(knpsGraph,'knps');
assert.deepEqual([knpsEngine.nodeCount,knpsEngine.edgeCount,knpsEngine.componentCount],[39,22,17]);
const demo=knpsEngine.example(),preview=knpsEngine.plan(demo);
assert(demo.length>=2);assert.equal(preview.status,'geometry_preview_only');assert(preview.distanceMeters>0);
let disconnected=null;
for(let i=1;i<39;i++)if(knpsEngine.componentOf(i)!==knpsEngine.componentOf(0)){disconnected=i;break}
assert.notEqual(disconnected,null);
assert.equal(knpsEngine.plan([0,disconnected]).status,'disconnected');
const dir=await mkdtemp(join(tmpdir(),'sanbak-plan-v104-'));
try{
 const built=await rebuildTopology({outputDir:dir});assert.equal(built.mountains,2902);
 const index=JSON.parse(await readFile(join(dir,'index.json'),'utf8'));
 const code=Object.keys(index.mountains).find(x=>x!=='428302602');
 const bucket=index.mountains[code].bucket;
 const data=JSON.parse(gunzipSync(await readFile(join(dir,'bucket-'+bucket+'.json.gz'))).toString('utf8'));
 const live=engine.create(data.mountains[code],'forest');
 assert.equal(live.sourceKind,'forest');
 assert.equal(live.componentCount,data.mountains[code].summary.geometric_components);
 if(live.example().length>1)assert.equal(live.plan(live.example()).status,'geometry_preview_only');
}finally{await rm(dir,{recursive:true,force:true})}
const html=read('nationwide-plan.html');
assert(html.includes('산박지도 v110 | 전국 고도자료 검증·로컬 적용'));
for(const s of ['core/nationwide-route-preview-v104.js','data/nationwide-topology/index.json',
 'data/knps-seorak-topology-v102.json','bucket-'+"'",'경유지 순서','실제 탐방로 지정'])assert(html.includes(s),s);
assert(!html.includes('OpenStreetMap'));
const wf=read('.github/workflows/deploy-pages.yml');
assert(wf.includes('cp nationwide-official.html nationwide-topology.html nationwide-plan.html site/'));
assert(wf.includes('core/nationwide-route-preview-v104.js core/nationwide-pois-v105.js core/nationwide-map-v106.js core/nationwide-map-view-v106.js site/core/'));
assert(read('national.html').includes('전국 코스 선형 v110'));
assert(read('sw.js').includes('sanbakmap-v110-national-elevation-local'));
assert(!read('core/nationwide-graph-review-v103.js').includes('geometry_preview_only'));
console.log('PASS v104: 2+ waypoint original-GIS geometric previews, 2018 KNPS sample, national forest source, roundtrip and disconnected safeguards');
