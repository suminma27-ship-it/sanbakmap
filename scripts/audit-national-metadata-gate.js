#!/usr/bin/env node
// Read-only nationwide metadata regression gate. Run: node scripts/audit-national-metadata-gate.js
// This does NOT verify SHP/DEM/ZIP bytes, passage legality, or per-edge geometry.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const gitBlobSha = p => {
  const bytes = fs.readFileSync(p);
  return crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
};
const files = {
  v129: ['audits/v129-exact-original-overlay-summary.json','4a19d137b0773542dc99f9682293a624ebbd9c8f'],
  v140: ['audits/v140-original-coordinate-quantization-summary.json','72f78e835c13cac887738a179000b2ef5899bbb3'],
  v287: ['audits/v287-connectivity-attribution-identifiability-correction-20261116.json','15c7548a6b0deabdbd7e9bebc7b36daf04fc6ff8']
};
const data = {};
let passed = 0;
function check(name, condition) { assert.ok(condition, name); passed++; }
for (const [key,[path,expected]] of Object.entries(files)) {
  check('Git blob SHA-1: ' + path, gitBlobSha(path) === expected);
  data[key] = read(path);
}
const {v129:a,v140:b,v287:c} = data;
check('source archive published hash identity', a.sourceZipSHA256 === b.inputSHA256.source);
check('overlay published hash identity', a.overlayPackageSha256 === b.inputSHA256.graph);
check('all 2902 sites included', a.mountainsProcessed === 2902 && b.originalMountainsPreserved === 2902);
check('67185 original edges', b.originalEdgesPreserved === 67185);
check('two endpoint occurrences per original edge', b.sourceEndpointOccurrences === 2*b.originalEdgesPreserved);
check('original components', a.componentsBefore === b.originalConnectedComponents);
check('candidate partition', a.totals.alreadySameNode+a.totals.provisionalEdgesAdded === a.candidatePairs);
check('component net delta only', a.componentsBefore-a.componentsAfter === 289);
check('high-spread review queue', b.quantizedNodesSpreadAbove5cm === 114);
check('near-component case remains within review threshold', b.notableDistinctComponentExample.rawSourceEndpointGapMeters <= b.nearbyDifferentNodeThresholdMeters);
check('hypothetical attribution counterexample', c.conditionalExample.hypotheticalProvisionalMerges-c.conditionalExample.hypotheticalSplitInducedComponentIncreases === 289);
check('no passage approval', a.verifiedPassage === false && b.newVerifiedPhysicalConnections === 0);
console.log(JSON.stringify({status:'pass',checks:passed,inputs:Object.fromEntries(Object.entries(files).map(([k,[p,h]])=>[k,{path:p,gitBlobSHA1:h}])),scope:'published metadata only',completion:false},null,2));
