import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rebuild} from '../tools/rebuild-topology-v102.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=await rebuild({dryRun:true});
assert.deepEqual([data.mountains,data.parts,data.nodes,data.edges,data.components,data.nearMisses],
 [2902,66503,59301,67185,3571,1513]);
const coreSource=read('core/nationwide-topology-v102.js');
const ctx={};new Function('window',coreSource)(ctx);
const topo=ctx.SanbakTopologyV102;
const ln=(id,coords)=>({sourceId:id,coords,sourceGeometry:'original',accessVerified:false,routable:false});
const first=topo.build([ln('a',[[127,37],[127.001,37],[127.002,37]]),
 ln('b',[[127.002,37],[127.002,37.001]]),ln('c',[[127.001,37],[127.001,37.001]])],
 {sourceGeometry:'original'});
assert.equal(first.summary.geometricComponents,1);
assert.equal(first.summary.endpointInteriorMatches,1);
assert.equal(first.summary.sharedEndCells,1);
assert.equal(first.summary.edges,4);
assert.equal(first.routable,false);
const gap=topo.build([ln('a',[[127,37],[127.001,37]]),
 ln('b',[[127.001017,37],[127.002,37]])],{sourceGeometry:'original'});
assert.equal(gap.summary.geometricComponents,2);
assert.equal(gap.summary.proximityEdgesCreated,0);
assert.equal(gap.summary.nearEndsReviewOnly,1);
assert.throws(()=>topo.build([ln('a',[[127,37],[127.001,37]])],{sourceGeometry:'simplified'}));
assert.throws(()=>topo.build([{...ln('a',[[127,37],[127.001,37]]),accessVerified:true}],{sourceGeometry:'original'}));
const knps=JSON.parse(read('data/knps-seorak-2018.geojson'));
const sourceParts=topo.historicKnps(knps);
const sample=topo.build(sourceParts,{sourceGeometry:'original'});
assert.deepEqual([sourceParts.length,sample.summary.geometricComponents,sample.summary.nodes,sample.summary.edges,sample.summary.nearEndsReviewOnly],[21,17,39,22,1]);
assert(sample.edges.every(e=>e.routable===false&&e.accessVerified===false));
const html=read('nationwide-topology.html');
assert(html.includes('산박지도 v102 | 전국 등산로 연결망'));
assert(html.includes('data/nationwide-topology/index.json'));
assert(html.includes('data/knps-seorak-topology-v102.json'));
assert(!html.includes('OpenStreetMap'));
const sw=read('sw.js'),wf=read('.github/workflows/deploy-pages.yml');
assert(sw.includes("'./nationwide-topology.html'"));
assert(wf.includes('node tools/rebuild-topology-v102.mjs --output-dir site/data/nationwide-topology'));
assert(wf.includes('node tools/knps-topology-v102.mjs --output-dir site/data'));
assert(wf.includes("'bucket-*.json.gz'"));
assert(read('README.md').includes('## v102 전국 원본 등산로 연결망'));
console.log('PASS v102: full GIS nationwide topology verified, strict no-snap/no-routing, Seoraksan sample and on-demand graph deployment');
