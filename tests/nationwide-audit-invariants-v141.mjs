import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const names=["v128-original-35m-summary","v129-exact-original-overlay-summary","v130-geometry-quality-summary","v131-dem-grade-crosscheck-summary","v132-dem-gap-repair-summary","v133-original-dem-source-recovery","v134-loop-dem-recovery","v135-direct-source-3d-summary","v136-ambiguous-touch-grade-summary","v137-missing-contact-root-causes","v138-micro-original-summary","v139-micro-chain-preservation-summary","v140-original-coordinate-quantization-summary"];
const x=names.map(n=>JSON.parse(readFileSync(new URL('../audits/'+n+'.json',import.meta.url),'utf8')));
const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
const checks=[
 ['source candidate bands',sum(x[0].bands)===x[0].candidates],
 ['source candidate relation classes',sum(x[0].relations)===x[0].candidates],
 ['v129 35m candidate partition',x[1].totals.alreadySameNode+x[1].totals.provisionalEdgesAdded===x[1].candidatePairs],
 ['v129 same candidates as v128',x[1].candidatePairs===x[0].candidates],
 ['v130 geometry partition',sum(x[2].types)===x[2].linksAudited],
 ['v130 QA decision partition',sum(x[2].decisions)===x[2].linksAudited],
 ['v130 all links same as v129',x[2].linksAudited===x[1].totals.provisionalEdgesAdded],
 ['v131 height class partition',sum(x[3].heightClasses)===x[3].priorityCandidates],
 ['v132 DEM missing cause partition',sum(x[4].missingCauses)===x[4].missingPriorityLinks],
 ['v133 source edge recovery partition',x[5].originalEdgesVerifiedForRecovery+x[5].targetsWithNoTrustworthyMatching3DGeometry===x[5].totalV132OriginalEdgeTargets],
 ['v134 original edge recovery partition',x[6].verifiedSourceEdgesTotal+x[6].unresolvedOriginalSourceEdges===x[6].originalSourceEdgesTargeted],
 ['v134 recovery continuity',x[6].previousV133Verified+x[6].newlyVerifiedClosedSourceLoops===x[6].verifiedSourceEdgesTotal],
 ['v134 unresolved heights continuity',x[6].pairedTotal+x[6].unresolvedJunctions===x[6].v132OriginalMissingHeightJunctions],
 ['v135 direct 3D class partition',sum(x[7].heightClasses)===x[7].priorityCandidatesChecked],
 ['v136 ambiguous grade partition',sum(x[8].gradeAuditCounts)===x[8].ambiguousContactCandidates],
 ['v137 missing cause partition',sum(x[9].causeCounts)===x[9].unresolvedUniqueNodePairSites],
 ['v138 micro edge partition',x[10].sameGraphNodeMicroEdges+x[10].distinctGraphNodeMicroEdges===x[10].microEdgesInRoundedLengthScreen],
 ['v139 distinct node micro partition',x[11].distinctWithNoDegree2Endpoint+x[11].distinctWithDegree2ButNoSameSourceChain+x[11].distinctBlockedByPreviewOrCycle+x[11].structureOnlyContractionCandidates===x[11].distinctNodeMicroEdges],
 ['v140 endpoints exactly twice edges',x[12].sourceEndpointOccurrences===2*x[12].originalEdgesPreserved],
 ['v140 threshold nesting',x[12].quantizedNodesSpreadAbove10cm<=x[12].quantizedNodesSpreadAbove5cm&&x[12].quantizedNodesSpreadAbove5cm<=x[12].quantizedNodesSpreadAbove1cm&&x[12].quantizedNodesSpreadAbove1cm<=x[12].quantizedNodesSpreadAbove1mm],
 ['original source SHA continuity',new Set([x[0].sourceZipSHA256,x[1].sourceZipSHA256,x[2].sourceZipSHA256,x[3].sourceOriginalZipSHA256,x[5].originSourceZipSHA256,x[6].sourceHashes.originalShpZip,x[7].originalSourceSHA256,x[8].originalSourceSHA256,x[9].sourceArchiveSHA256.originalSHP,x[10].sourceSHA256.source,x[11].inputSHA256.source,x[12].inputSHA256.source]).size===1],
 ['original graph SHA continuity',new Set([x[5].originalTopologyZipSHA256,x[6].sourceHashes.originalTopologyZip,x[8].originalTopologySHA256,x[9].sourceArchiveSHA256.v102Topology,x[10].sourceSHA256.topology,x[11].inputSHA256.topology,x[12].inputSHA256.topology]).size===1],
 ['original overlay SHA continuity',new Set([x[1].overlayPackageSha256,x[3].inputs.v129FullOverlaySHA256,x[4].sourceHashes.v129,x[8].v129GraphSHA256,x[9].sourceArchiveSHA256.v129Graph,x[10].sourceSHA256.graph,x[11].inputSHA256.graph,x[12].inputSHA256.graph]).size===1],
 ['v139 and v140 nationwide preservation',x[11].mountainsPreserved===2902&&x[12].originalMountainsPreserved===2902&&x[11].originalEdgesPreserved===x[12].originalEdgesPreserved&&x[11].originalNodesPreserved===x[12].originalNodesPreserved],
 ['v140 source topology unchanged',x[12].originalTopologyChanged===false&&x[12].publishedMapChanged===false&&x[12].newVerifiedPhysicalConnections===0],
 ['Hangyeryeong exception remains out of 35m',x[0].knownCase.name==='한계령'&&x[0].knownCase.originalSourceMinGapMeters>35&&x[1].note.includes('Hangyeryeong')&&x[3].userConfirmedHangyeryeong.preservedAsSeparateKnownCase===true]
];
for(const [name,ok] of checks)assert.ok(ok,'v141 audit regression: '+name);
console.log('PASS v141: '+checks.length+' cross-version audit invariants, original source/graph SHA continuity, no routing change');
