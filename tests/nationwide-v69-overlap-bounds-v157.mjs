import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const path=new URL('../audits/v149-provisional-conservation-gate.json',import.meta.url);
const bytes=readFileSync(path);
const gate=JSON.parse(bytes);
const near=109392; // v155 audited count of pairs at or below v69's 0.75m threshold
const far=35598;  // v155 audited count above 0.75m
const total=gate.candidatePartition.allPairs;
const same=gate.candidatePartition.sameNode;
const provisional=gate.candidatePartition.provisional;
assert.equal(near+far,total);
assert.equal(same+provisional,total);
// Fréchet bounds for overlap of two subsets of a common finite universe.
// This is a tighter numerical constraint than treating the groups as unrelated.
const nearProvisionalMin=Math.max(0,near+provisional-total);
const nearProvisionalMax=Math.min(near,provisional);
const farProvisionalMin=Math.max(0,far+provisional-total);
const farProvisionalMax=Math.min(far,provisional);
assert.equal(nearProvisionalMin,486);
assert.equal(nearProvisionalMax,36084);
assert.equal(farProvisionalMin,0);
assert.equal(farProvisionalMax,35598);
assert.equal(nearProvisionalMin+farProvisionalMax,provisional);
assert.equal(nearProvisionalMax+farProvisionalMin,provisional);
assert.equal(gate.permanentLinksApproved,0);
assert.equal(gate.safeToDeclareComplete,false);
console.log(JSON.stringify({result:'PASS',audit:'v157-v69-overlap-lower-bound',inputSha256:createHash('sha256').update(bytes).digest('hex'),thresholdCounts:{atMost075m:near,above075m:far},provisionalAtMost075m:{minimum:nearProvisionalMin,maximum:nearProvisionalMax},provisionalAbove075m:{minimum:farProvisionalMin,maximum:farProvisionalMax},approvedLinks:0,complete:false}));
