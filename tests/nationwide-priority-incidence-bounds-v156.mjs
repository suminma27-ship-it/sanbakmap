// v156: independently bound unique provisional edges incident to high-risk quantized nodes.
// Audit summaries only: not raw SHP/DEM evidence or approval of a physical trail.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const inputs = ['audits/v140-original-coordinate-quantization-summary.json','audits/v145-source-endpoint-priority.json','audits/v147-provisional-evidence-coverage.json'];
const data = inputs.map(path => {
  const raw=readFileSync(new URL('../'+path,import.meta.url));
  console.log(path, 'SHA256', createHash('sha256').update(raw).digest('hex'));
  return JSON.parse(raw);
});
const [a,b,c]=data;
assert.equal(a.originalMountainsPreserved,2902);
assert.equal(a.originalEdgesPreserved,67185);
assert.equal(a.originalNodesPreserved,59301);
assert.equal(a.quantizedNodesSpreadAbove5cm,114);
assert.equal(b.priorityNodeCount,57);
assert.equal(b.priorityMountains,50);
assert.equal(b.priorityProvisionalEdgeIncidences,150);
assert.equal(c.scope.provisional35mEdges,36084);
const band=b.thresholds.find(x=>x.spreadAboveMeters===0.05);
assert.ok(band);
assert.equal(band.nodesWithProvisionalEdges,57);
assert.equal(band.provisionalEdgeIncidences,150);
assert.equal(band.nodes,114);
// Each undirected edge has two endpoints: 150 incidences can cover between
// ceil(150/2) and 150 distinct edges. No candidate-level IDs are available.
const uniqueLower=Math.ceil(b.priorityProvisionalEdgeIncidences/2);
const uniqueUpper=Math.min(b.priorityProvisionalEdgeIncidences,c.scope.provisional35mEdges);
assert.equal(uniqueLower,75);
assert.equal(uniqueUpper,150);
assert.ok(uniqueUpper<c.scope.provisional35mEdges);
assert.equal(c.evidence.priorityConflationNodes,57);
assert.equal(c.noPermanentConnectionApproved,true);
assert.equal(a.newVerifiedPhysicalConnections,0);
console.log(JSON.stringify({priorityNodes:57,priorityMountains:50,edgeIncidences:150,uniqueProvisionalEdgesLowerBound:uniqueLower,uniqueProvisionalEdgesUpperBound:uniqueUpper,distinctEdgeIdsKnown:false,physicalLinksApproved:0},null,2));
