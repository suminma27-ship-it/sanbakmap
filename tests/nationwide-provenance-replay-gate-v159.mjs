import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const load = p => { const b=readFileSync(new URL(p,import.meta.url)); return {data:JSON.parse(b),sha256:createHash('sha256').update(b).digest('hex')}; };
const original=load('../audits/v129-exact-original-overlay-summary.json');
const gate=load('../audits/v149-provisional-conservation-gate.json');
const a=original.data, b=gate.data;
assert.equal(a.sourceZipSHA256,b.sourceSHA256);
assert.equal(a.overlayPackageSha256,b.overlaySHA256);
assert.equal(a.mountainsProcessed,b.scope.mountains);
assert.equal(a.candidatePairs,b.candidatePartition.allPairs);
assert.equal(a.totals.alreadySameNode,b.candidatePartition.sameNode);
assert.equal(a.totals.provisionalEdgesAdded,b.candidatePartition.provisional);
assert.equal(a.totals.alreadySameNode+a.totals.provisionalEdgesAdded,a.candidatePairs);
assert.equal(b.scope.originalEdges*2,b.scope.sourceEndpointOccurrences);
assert.equal(a.componentsBefore,b.originalComponents);
assert.equal(a.componentsAfter,b.allPreviewComponents);
assert.equal(a.verifiedPassage,false);
assert.equal(a.originalGraphUnmodified,true);
assert.equal(b.permanentLinksApproved,0);
assert.equal(b.hangyeryeongExceptionPreserved,true);
assert.equal(b.below200mExcluded,false);
assert.equal(b.safeToDeclareComplete,false);
// A summary and POI buckets cannot substitute for the original 32-bucket geometry overlay.
// The grade/risk counters may overlap; do not mistake their sum for exhaustive verification.
const overlayPresent=existsSync(new URL('../data/nationwide-original-overlay/',import.meta.url));
assert.equal(overlayPresent,false,'Source replay gate changed: review overlay availability and hashes before updating this assertion');
console.log(JSON.stringify({result:'PASS',audit:'v159-cross-version-provenance-and-replay-gate',inputSha256:{v129:original.sha256,v149:gate.sha256},sourceZipSha256Reference:a.sourceZipSHA256,overlaySha256Reference:a.overlayPackageSha256,coverage:b.scope,provisionalCandidates:b.candidatePartition.provisional,sourceOverlayPresent:overlayPresent,approvedPhysicalLinks:0,complete:false}));
