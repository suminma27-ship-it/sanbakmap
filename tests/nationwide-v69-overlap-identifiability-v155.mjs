import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const names=['v129-exact-original-overlay-summary.json','v142-v69-rule-regression-summary.json','v147-provisional-evidence-coverage.json'];
const bytes=names.map(n=>readFileSync(new URL('../audits/'+n,import.meta.url)));
const [o,v,c]=bytes.map(b=>JSON.parse(b));
const sha256=Object.fromEntries(names.map((n,i)=>[n,createHash('sha256').update(bytes[i]).digest('hex')]));
assert.equal(o.candidatePairs,144990);
assert.equal(v.nationwideV128.candidateCount,o.candidatePairs);
assert.equal(v.nationwideV128.atMost075mByBands+v.nationwideV128.over075mByBands,o.candidatePairs);
assert.equal(o.totals.alreadySameNode+o.totals.provisionalEdgesAdded,o.candidatePairs);
assert.equal(c.scope.provisional35mEdges,o.totals.provisionalEdgesAdded);
assert.equal(c.scope.source35mPairs,o.candidatePairs);
assert.equal(c.evidence.originalComponents,o.componentsBefore);
assert.equal(c.evidence.allPreviewComponents,o.componentsAfter);
assert.equal(v.v129Provisional35mEdges,o.totals.provisionalEdgesAdded);
assert.equal(v.v69Rule.maxHorizontalMeters,.75);
assert.equal(v.v69Rule.maxVerticalMeters,4);
for(const flag of ['requiresDegreeOneSource','requiresDifferentComponents','requiresUniqueCandidate','requiresUniqueReverse','requiresMutualUniqueIfTargetDegreeOne']) assert.equal(v.v69Rule[flag],true);
assert.equal(v.hangyeryeong.userConfirmedExceptionPreserved,true);
assert.equal(v.hangyeryeong.automaticStitchAllowed,false);
assert(v.hangyeryeong.originalSourceMinGapMeters>35);
assert.equal(o.verifiedPassage,false);
assert.equal(c.noPermanentConnectionApproved,true);
// The two sets are defined over the same 144,990 candidate universe, but no intersection
// membership list is present. Never treat the 35,598 long-distance candidates as a
// proven subset of the 36,084 provisional edges.
const universe=o.candidatePairs, provisional=o.totals.provisionalEdgesAdded;
const overLegacy=v.nationwideV128.over075mByBands;
const overlapLower=Math.max(0,provisional+overLegacy-universe);
const overlapUpper=Math.min(provisional,overLegacy);
assert.equal(overlapLower,0);
assert.equal(overlapUpper,35598);
assert.equal(overlapUpper-overlapLower,35598);
assert.equal(c.safeToDeclareComplete,false);
console.log(JSON.stringify({result:'PASS',audit:'v155-v69-set-intersection-identifiability',inputSha256:sha256,candidateUniverse:universe,provisionalEdges:provisional,overLegacyThresholdCandidatePairs:overLegacy,possibleOverlapRange:[overlapLower,overlapUpper],exactOverlapKnown:false,graphLevelV69EquivalenceProven:false,physicalConnectionsApproved:0}));
