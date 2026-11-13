/** Read-only metadata and feature-level quantization risk gate. No route authorization. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function checkSummary(summary,manifest){
  const errors=[];
  const check=(ok,label)=>{if(!ok)errors.push(label)};
  check(summary.inputSHA256?.source===manifest.source_zip_sha256,'source SHA-256');
  check(summary.originalMountainsPreserved===manifest.mountain_codes,'mountain count');
  check(summary.originalNodesPreserved===manifest.graph_nodes,'node count');
  check(summary.originalEdgesPreserved===manifest.graph_edges,'edge count');
  check(summary.sourceEndpointOccurrences===manifest.graph_edges*2,'endpoint count');
  check(summary.originalConnectedComponents===manifest.geometric_components_sum,'components');
  const thresholds=['quantizedNodesWithDistinctExactSourceEndpoints','quantizedNodesSpreadAbove1mm','quantizedNodesSpreadAbove1cm','quantizedNodesSpreadAbove5cm','quantizedNodesSpreadAbove10cm'];
  const counts=thresholds.map(k=>summary[k]);
  check(counts.every(n=>Number.isSafeInteger(n)&&n>=0)&&counts.every((n,i)=>i===0||counts[i-1]>=n),'nested quantization risk thresholds');
  check(counts[0]<=summary.multipleEndpointGraphNodes&&summary.multipleEndpointGraphNodes<=summary.originalNodesPreserved,'multi-endpoint bound');
  check(summary.nearbyDifferentGraphNodePairsAtMost1mm<=summary.nearbyDifferentGraphNodePairsAtMost1cm&&summary.nearbyDifferentGraphNodePairsAtMost1cm<=summary.nearbyDifferentGraphNodePairsAtMost2cm,'nested near-pair counts');
  check(summary.nearbyDifferentGraphNodePairsAtMost2cmAcrossComponents<=summary.nearbyDifferentGraphNodePairsAtMost2cm,'cross-component near-pair bound');
  check(summary.mountainsWithPotentialSameNodeConflation<=summary.originalMountainsPreserved,'mountain conflation bound');
  check(summary.mountainsWithNearbyDifferentNodePairs<=summary.originalMountainsPreserved,'mountain near-pair bound');
  check(summary.mountainsWithNearbySeparateComponentPairs<=summary.mountainsWithNearbyDifferentNodePairs,'mountain cross-component bound');
  const q=summary.graphNodeQuantizationMeters;
  check(q===0.1&&summary.maximumOriginalEndpointNodeDriftMeters<=Math.SQRT2*q/2+1e-9,'decimeter rounding theoretical bound');
  check(summary.originalTopologyChanged===false&&summary.newVerifiedPhysicalConnections===0&&summary.mountainsBelow200mRemoved===0,'nonmutation');
  return {passed:errors.length===0,checks:15,errors,quantizationRiskNodesAbove5cm:summary.quantizedNodesSpreadAbove5cm,nearPairsAtMost2cm:summary.nearbyDifferentGraphNodePairsAtMost2cm,sourceGeometryReplay:false,authorizedConnections:0};
}
export function classifyExactEndpointPair(a,b,q=.1){
  if(![a?.x,a?.y,b?.x,b?.y].every(Number.isFinite))throw Error('non-finite endpoint');
  const d=Math.hypot(a.x-b.x,a.y-b.y);
  const cell=v=>Math.round(v/q);
  return {distanceMeters:d,sameQuantizedCell:cell(a.x)===cell(b.x)&&cell(a.y)===cell(b.y),sameExactPoint:a.x===b.x&&a.y===b.y,requiresReview:d>0,passageAuthorized:false};
}
export function selfTest(){
  const s={inputSHA256:{source:'abc'},originalMountainsPreserved:2902,originalNodesPreserved:59301,originalEdgesPreserved:67185,sourceEndpointOccurrences:134370,originalConnectedComponents:3571,quantizedNodesWithDistinctExactSourceEndpoints:1722,quantizedNodesSpreadAbove1mm:470,quantizedNodesSpreadAbove1cm:368,quantizedNodesSpreadAbove5cm:114,quantizedNodesSpreadAbove10cm:2,multipleEndpointGraphNodes:40552,nearbyDifferentGraphNodePairsAtMost1mm:0,nearbyDifferentGraphNodePairsAtMost1cm:1,nearbyDifferentGraphNodePairsAtMost2cm:4,nearbyDifferentGraphNodePairsAtMost2cmAcrossComponents:1,mountainsWithPotentialSameNodeConflation:332,mountainsWithNearbyDifferentNodePairs:4,mountainsWithNearbySeparateComponentPairs:1,graphNodeQuantizationMeters:.1,maximumOriginalEndpointNodeDriftMeters:.070569,originalTopologyChanged:false,newVerifiedPhysicalConnections:0,mountainsBelow200mRemoved:0};
  const m={source_zip_sha256:'abc',mountain_codes:2902,graph_nodes:59301,graph_edges:67185,geometric_components_sum:3571};
  assert.equal(checkSummary(s,m).passed,true);
  assert.equal(checkSummary({...s,quantizedNodesSpreadAbove10cm:115},m).passed,false);
  assert.equal(checkSummary({...s,maximumOriginalEndpointNodeDriftMeters:.08},m).passed,false);
  assert.equal(checkSummary({...s,nearbyDifferentGraphNodePairsAtMost2cmAcrossComponents:5},m).passed,false);
  assert.equal(checkSummary({...s,sourceEndpointOccurrences:134369},m).passed,false);
  assert.deepEqual([classifyExactEndpointPair({x:0.01,y:0.01},{x:0.02,y:0.02}).sameQuantizedCell,classifyExactEndpointPair({x:.049,y:0},{x:.051,y:0}).sameQuantizedCell],[true,false]);
  assert.equal(classifyExactEndpointPair({x:0,y:0},{x:0,y:0}).requiresReview,false);
  assert.throws(()=>classifyExactEndpointPair({x:NaN,y:0},{x:0,y:0}));
  return {passed:8,total:8};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const tests=selfTest();
  const [s,m]=process.argv.slice(2);
  const result=s&&m?checkSummary(JSON.parse(readFileSync(s)),JSON.parse(readFileSync(m))):null;
  if(result&&!result.passed)process.exitCode=1;
  console.log(JSON.stringify({tests,sourceAudit:result},null,2));
}
