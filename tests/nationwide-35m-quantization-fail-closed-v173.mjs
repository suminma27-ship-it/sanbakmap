import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const bytes=readFileSync(new URL('../audits/v172-35m-quantization-threshold-uncertainty-20261111.json',import.meta.url));
const audit=JSON.parse(bytes);
const sha256=createHash('sha256').update(bytes).digest('hex');
const q=0.1, threshold=35;
const endpointBound=Math.SQRT2*q/2;
const pairBound=2*endpointBound;
const [lower,upper]=audit.calculation.quantizedDistanceAmbiguityIntervalMeters;
const near=(a,b)=>Math.abs(a-b)<1e-10;
assert.ok(near(audit.calculation.maxSingleEndpointDisplacementMeters,endpointBound));
assert.ok(near(audit.calculation.maxTwoEndpointDistancePerturbationMeters,pairBound));
assert.ok(near(lower,threshold-pairBound));
assert.ok(near(upper,threshold+pairBound));
assert.ok(lower<threshold && upper>threshold);
assert.equal(audit.scope.mountains,2902);
assert.equal(audit.scope.originalEdges,67185);
assert.equal(audit.scope.provisionalCandidateEdges,36084);
assert.equal(audit.scope.priorityNodes,57);
assert.equal(audit.sourceBytesRehashed,false);
assert.equal(audit.complete,false);
assert.equal(audit.preservation.newPhysicalConnectionsApproved,0);
assert.equal(audit.preservation.originalGraphEdited,false);
assert.equal(audit.preservation.demEdited,false);
assert.equal(audit.preservation.uiEdited,false);
assert.equal(audit.preservation.hangyeryeongExceptionPreserved,true);
// Explicit synthetic boundary examples; these are NOT observed trail endpoints.
for(const [precise,quantized] of [[35-pairBound,35],[35+pairBound,35],[35,35-pairBound],[35,35+pairBound]]){
  assert.ok(Math.abs(precise-quantized)<=pairBound+1e-12);
}
// A threshold gate cannot imply legal or physical traversability.
const classifications=[lower-0.001,lower,35,upper,upper+0.001].map(d=>({
  d, geometricClass:d<lower?'inside':d>upper?'outside':'ambiguous',
  physicalConnectionApproved:false
}));
assert.deepEqual(classifications.map(x=>x.geometricClass),['inside','ambiguous','ambiguous','ambiguous','outside']);
assert.ok(classifications.every(x=>!x.physicalConnectionApproved));
console.log(JSON.stringify({result:'PASS',test:'v173-35m-quantization-fail-closed',inputSha256:sha256,lower,upper,syntheticCases:4,physicalConnectionsApproved:0,complete:false}));
