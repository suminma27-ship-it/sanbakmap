import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = name => JSON.parse(readFileSync(new URL('../audits/'+name, import.meta.url), 'utf8'));
const q = read('v140-original-coordinate-quantization-summary.json');
const p = read('v145-source-endpoint-priority.json');
const c = read('v149-provisional-conservation-gate.json');
const a = read('v150-evidence-denominator-and-quantization-gate.json');
const epsilon = 1e-6;
const cell = q.graphNodeQuantizationMeters;
assert.equal(q.crs, 'EPSG:5179');
assert.equal(cell, 0.1);
// For nearest-grid rounding, one point can be at most half a cell diagonal
// from its grid node; two points in one cell can differ by a full diagonal.
assert(q.maximumOriginalEndpointNodeDriftMeters <= cell / Math.SQRT2 + epsilon);
assert(q.maximumOriginalEndpointNodeDriftMeters >= 0);
assert(q.quantizedNodesSpreadAbove10cm <= q.quantizedNodesWithDistinctExactSourceEndpoints);
assert(q.quantizedNodesSpreadAbove10cm > 0,
  'A >10cm source spread is possible diagonally inside a 10cm grid cell');
const rows = p.thresholds;
assert(rows.length >= 5);
for (let i = 0; i < rows.length; i++) {
  const x = rows[i];
  assert(x.spreadAboveMeters > 0 && x.spreadAboveMeters < cell * Math.SQRT2);
  assert(x.nodesWithProvisionalEdges <= x.nodes);
  assert(x.mountains <= x.nodes);
  assert(x.provisionalEdgeIncidences >= x.nodesWithProvisionalEdges);
  if (i) {
    const prev = rows[i-1];
    assert(x.spreadAboveMeters > prev.spreadAboveMeters);
    for (const key of ['nodes','mountains','nodesWithProvisionalEdges','provisionalEdgeIncidences'])
      assert(x[key] <= prev[key], key + ' must be monotonic');
  }
}
const at5cm = rows.find(x => x.spreadAboveMeters === 0.05);
assert(at5cm);
assert.equal(at5cm.nodes, q.quantizedNodesSpreadAbove5cm);
assert.equal(at5cm.nodesWithProvisionalEdges, p.priorityNodeCount);
assert.equal(at5cm.provisionalEdgeIncidences, p.priorityProvisionalEdgeIncidences);
assert.equal(at5cm.nodesWithProvisionalEdges, a.quantization.priorityAttachedNodes);
assert.equal(rows.find(x => x.spreadAboveMeters === 0.1).nodes, q.quantizedNodesSpreadAbove10cm);
assert.equal(q.sourceEndpointOccurrences, q.originalEdgesPreserved * 2);
assert.equal(q.sourceEndpointOccurrences, c.scope.sourceEndpointOccurrences);
assert.equal(q.originalNodesPreserved, q.sourceCoveredGraphNodes);
assert.equal(q.mountainsBelow200mRemoved, 0);
assert.equal(q.newVerifiedPhysicalConnections, 0);
assert.equal(c.permanentLinksApproved, 0);
assert.equal(a.completion.safeToDeclareComplete, false);
console.log('PASS v151: EPSG:5179 quantization geometry bounds, monotonic risk tiers, endpoint conservation, no approval');
