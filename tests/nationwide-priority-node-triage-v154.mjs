import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files=['v140-original-coordinate-quantization-summary.json','v145-source-endpoint-priority.json','v147-provisional-evidence-coverage.json'];
const buffers=files.map(f=>readFileSync(new URL('../audits/'+f,import.meta.url)));
const [q,p,c]=buffers.map(b=>JSON.parse(b));
const inputSha256=Object.fromEntries(files.map((f,i)=>[f,createHash('sha256').update(buffers[i]).digest('hex')]));
assert.equal(p.sourceArchiveSHA256,q.auditArchiveSHA256);
assert.equal(p.priorityNodeCount,57);
assert.equal(p.priorityMountains,50);
assert.equal(p.priorityProvisionalEdgeIncidences,150);
assert.equal(p.recordsReviewed,q.quantizedNodesWithDistinctExactSourceEndpoints);
assert.equal(c.evidence.priorityConflationNodes,p.priorityNodeCount);
assert.equal(c.evidence.priorityConflationMountains,p.priorityMountains);
const thresholds=p.thresholds;
assert.deepEqual(thresholds.map(x=>x.spreadAboveMeters),[.001,.01,.05,.075,.1]);
for(let i=1;i<thresholds.length;i++){
 for(const key of ['nodes','mountains','nodesWithProvisionalEdges','provisionalEdgeIncidences'])
  assert(thresholds[i][key]<=thresholds[i-1][key],key+' monotonic');
}
assert.equal(thresholds[2].nodes,p.priorityNodeCount+57);
assert.equal(thresholds[2].nodesWithProvisionalEdges,p.priorityNodeCount);
assert.equal(thresholds[2].provisionalEdgeIncidences,p.priorityProvisionalEdgeIncidences);
assert.equal(thresholds[4].nodesWithProvisionalEdges,0);
const seen=new Set();
for(const node of p.topPriorityNodes){
 const key=node.mountainCode+':'+node.graphNodeId;
 assert(!seen.has(key),'duplicate priority node');seen.add(key);
 assert(node.maxSourceEndpointSpreadM>.05);
 assert(node.provisionalEdgeIncidences>=1);
 assert(node.originalEdgeIds.length>0);
 assert.equal(new Set(node.originalEdgeIds).size,node.originalEdgeIds.length);
}
assert.deepEqual(p.topPriorityNodes.map(n=>n.maxSourceEndpointSpreadM),[...p.topPriorityNodes.map(n=>n.maxSourceEndpointSpreadM)].sort((a,b)=>b-a));
assert.equal(p.separateComponentGap.mountainCode,q.notableDistinctComponentExample.code);
assert.equal(p.separateComponentGap.nodeA,q.notableDistinctComponentExample.nodeA);
assert.equal(p.separateComponentGap.nodeB,q.notableDistinctComponentExample.nodeB);
assert.equal(p.separateComponentGap.sourceGapM,q.notableDistinctComponentExample.rawSourceEndpointGapMeters);
assert(p.separateComponentGap.sourceGapM<=q.nearbyDifferentNodeThresholdMeters);
assert.equal(p.physicalLinksApproved,0);
assert.equal(c.noPermanentConnectionApproved,true);
console.log(JSON.stringify({result:'PASS',audit:'v154-priority-node-evidence-triage',inputSha256,topPriorityNodeKeys:[...seen],crossComponentPair:p.separateComponentGap,physicalLinksApproved:0}));
