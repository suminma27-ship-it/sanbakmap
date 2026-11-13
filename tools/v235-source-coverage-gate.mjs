import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export function audit(s,m){
 const checks={
 allGraphNodesCovered:s.sourceCoveredGraphNodes===m.graph_nodes,
 endpointsDoubleEdges:s.sourceEndpointOccurrences===2*m.graph_edges,
 sourceFeaturesVsParts:m.source_line_parts>=m.source_features,
 partsVsEdges:m.graph_edges>=m.source_line_parts,
 rawVerticesAtLeastEndpoints:m.source_original_vertices>=s.sourceEndpointOccurrences,
 positiveTopology:[m.mountain_codes,m.graph_nodes,m.graph_edges,m.geometric_components_sum].every(x=>Number.isSafeInteger(x)&&x>0),
 componentsBound:m.geometric_components_sum>=m.mountain_codes&&m.geometric_components_sum<=m.graph_nodes,
 sourceHashMatch:s.inputSHA256?.source===m.source_zip_sha256,
 validExample:s.notableDistinctComponentExample?.status==='requires_source_grounded_review_not_permanent_connection'&&Number.isSafeInteger(s.notableDistinctComponentExample?.nodeA)&&Number.isSafeInteger(s.notableDistinctComponentExample?.nodeB)&&s.notableDistinctComponentExample.nodeA!==s.notableDistinctComponentExample.nodeB&&s.notableDistinctComponentExample.rawSourceEndpointGapMeters>0&&s.notableDistinctComponentExample.rawSourceEndpointGapMeters<=s.nearbyDifferentNodeThresholdMeters,
 reviewNotAuthorized:s.newVerifiedPhysicalConnections===0&&s.originalTopologyChanged===false&&s.mountainsBelow200mRemoved===0,
 quantizationWithinBound:s.maximumOriginalEndpointNodeDriftMeters<=Math.SQRT2*s.graphNodeQuantizationMeters/2+1e-9,
 nearPairCrossComponentBound:s.nearbyDifferentGraphNodePairsAtMost2cmAcrossComponents<=s.nearbyDifferentGraphNodePairsAtMost2cm
 };
 return {passed:Object.values(checks).every(Boolean),checks,passedCount:Object.values(checks).filter(Boolean).length,total:Object.keys(checks).length,sourceReplay:false,physicalPassageAuthorized:false};
}
export function selfTest(s,m){
 assert.equal(audit(s,m).passed,true);
 for(const [a,b] of [[{sourceCoveredGraphNodes:s.sourceCoveredGraphNodes-1},m],[{sourceEndpointOccurrences:s.sourceEndpointOccurrences-1},m],[{newVerifiedPhysicalConnections:1},m],[{notableDistinctComponentExample:{...s.notableDistinctComponentExample,rawSourceEndpointGapMeters:.03}},m],[s,{...m,source_zip_sha256:'bad'}],[s,{...m,geometric_components_sum:1}]]){
 assert.equal(audit({...s,...a},b).passed,false);
 }
 return {passed:7,total:7};
}
if(process.argv[1]?.endsWith('v235-source-coverage-gate.mjs')){
 const s=JSON.parse(readFileSync(process.argv[2]));const m=JSON.parse(readFileSync(process.argv[3]));
 const result={audit:audit(s,m),selfTest:selfTest(s,m)};
 console.log(JSON.stringify(result,null,2));if(!result.audit.passed)process.exitCode=1;
}
