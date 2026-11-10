import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read = name => { const bytes=readFileSync(new URL('../audits/'+name,import.meta.url)); return {json:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')}; };
const A=read('v140-original-coordinate-quantization-summary.json');
const B=read('v145-source-endpoint-priority.json');
const C=read('v149-provisional-conservation-gate.json');
const a=A.json,b=B.json,c=C.json,t=b.thresholds;
assert.equal(a.auditArchiveSHA256,b.sourceArchiveSHA256);
assert.equal(b.sourceArchiveSHA256,c.v140ArchiveSHA256);
assert.equal(a.originalMountainsPreserved,c.scope.mountains);
assert.equal(a.originalEdgesPreserved,c.scope.originalEdges);
assert.equal(a.quantizedNodesWithDistinctExactSourceEndpoints,b.recordsReviewed);
assert.deepEqual(t.map(x=>x.spreadAboveMeters),[.001,.01,.05,.075,.1]);
assert.deepEqual(t.map(x=>x.nodes),[470,368,114,37,2]);
assert.deepEqual([a.quantizedNodesSpreadAbove1mm,a.quantizedNodesSpreadAbove1cm,a.quantizedNodesSpreadAbove5cm,a.quantizedNodesSpreadAbove10cm],[t[0].nodes,t[1].nodes,t[2].nodes,t[4].nodes]);
for(let i=1;i<t.length;i++){assert(t[i].nodes<=t[i-1].nodes);assert(t[i].nodesWithProvisionalEdges<=t[i-1].nodesWithProvisionalEdges);assert(t[i].provisionalEdgeIncidences<=t[i-1].provisionalEdgeIncidences);}
for(const x of t){assert(x.nodesWithProvisionalEdges<=x.nodes);assert(x.provisionalEdgeIncidences>=x.nodesWithProvisionalEdges);}
assert.equal(t[2].nodesWithProvisionalEdges,b.priorityNodeCount);
assert.equal(t[2].provisionalEdgeIncidences,b.priorityProvisionalEdgeIncidences);
assert.equal(b.priorityNodeCount,c.priorityConflationNodes);
assert.equal(b.priorityProvisionalEdgeIncidences,c.priorityConflationIncidences);
assert.equal(a.notableDistinctComponentExample.code,b.separateComponentGap.mountainCode);
assert.equal(a.notableDistinctComponentExample.rawSourceEndpointGapMeters,b.separateComponentGap.sourceGapM);
assert.equal(c.candidatePartition.sameNode+c.candidatePartition.provisional,c.candidatePartition.allPairs);
assert.equal(a.newVerifiedPhysicalConnections,0);
assert.equal(b.physicalLinksApproved,0);
assert.equal(c.permanentLinksApproved,0);
assert.equal(c.safeToDeclareComplete,false);
// Conservative numerical bounds, NOT proof of distinct physical trails.
const incidence=b.priorityProvisionalEdgeIncidences;
const uniqueLower=Math.ceil(incidence/2), uniqueUpper=incidence;
assert.equal(uniqueLower,75);assert.equal(uniqueUpper,150);
console.log(JSON.stringify({result:'PASS',audit:'v160-quantization-threshold-lineage',inputSha256:{v140:A.sha256,v145:B.sha256,v149:C.sha256},sourceArchiveSha256Reference:a.auditArchiveSHA256,priorityNodes:b.priorityNodeCount,priorityIncidences:incidence,uniqueProvisionalEdgeBounds:[uniqueLower,uniqueUpper],approvedPhysicalLinks:0,complete:false}));
