import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {rebuild as rebuildTopology} from '../tools/rebuild-topology-v102.mjs';
import {rebuild as reviewTopology} from '../tools/review-topology-v103.mjs';
import '../core/nationwide-graph-review-v103.js';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const core=globalThis.SanbakGraphReviewV103;
const sample={nodes:[[0,0],[100,0],[112,0],[210,0]],edges:[[0,1,10,0,0,1],[2,3,9.8,1,0,1]],
 source_parts:[['a'],['b']],
 summary:{navigable:false,access_verified:false,physical_junction_verified:false,geometric_components:2}};
const d=core.inspect(sample);assert.equal(d.componentCount,2);
assert.equal(d.near.length,1);assert.equal(d.near[0][2],1.2);
assert.equal(core.route(sample,0,3,{currentAccessVerified:true,geometryVerified:true,verifiedEdgeIndices:[0,1]}).status,'blocked_unverified');
const good=structuredClone(sample);good.summary={...sample.summary,navigable:true,access_verified:true,physical_junction_verified:true};
assert.equal(core.route(good,0,3,{currentAccessVerified:true,geometryVerified:true,verifiedEdgeIndices:[0,1]}).status,'disconnected_or_unverified_edges');
const complete=structuredClone(good);complete.edges.push([1,2,1.2,0,1,2]);
const approval={currentAccessVerified:true,geometryVerified:true,verifiedEdgeIndices:[0,1,2]};
assert.equal(core.route(complete,0,3,approval).status,'ok');
assert.equal(core.route(complete,0,3,{...approval,verifiedEdgeIndices:[0,1]}).status,'disconnected_or_unverified_edges');
const dir=await mkdtemp(join(tmpdir(),'sanbak-topology-103-'));
try {
 await rebuildTopology({outputDir:dir});
 const review=await reviewTopology({sourceDir:dir,dryRun:true});
 assert.deepEqual([review.totals.mountains,review.totals.mountainsWithMultipleComponents,
  review.totals.mountainsWithInternalNearCandidates,review.totals.internalNearCandidatePairs,
  review.totals.crossCodeSharedCoordinateLocations,review.totals.crossCodePairCount],
  [2902,324,39,83,1515,308]);
 assert.equal(review.createdConnectingEdges,0);
 assert.equal(review.routeAllowed,false);
 const seorak=review.mountains['428302602'];assert(seorak);
} finally {await rm(dir,{recursive:true,force:true})}
const html=await read('nationwide-topology.html');
assert(html.includes('산박지도 v103 | 전국 등산로 연결 후보 검토'));
assert(html.includes("review-v103.json"));assert(html.includes("code==='428302602'"));
assert(!(await read('core/nationwide-graph-review-v103.js')).includes('planning_connector'));
const wf=await read('.github/workflows/deploy-pages.yml');
assert(wf.includes('node tools/review-topology-v103.mjs --source-dir site/data/nationwide-topology'));
assert(wf.includes('cp core/nationwide-source-loader.js core/nationwide-app.js core/nationwide-topology-v102.js core/nationwide-graph-review-v103.js'));
assert((await read('sw.js')).includes('sanbakmap-v113-trail-node-map-pick'));
console.log('PASS v103: cross-code repeated points, disconnected leaf candidates, no unapproved routes, full build integration');
