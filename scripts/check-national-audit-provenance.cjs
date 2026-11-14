#!/usr/bin/env node
// Read-only nationwide audit gate. Usage: node scripts/check-national-audit-provenance.cjs
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function load(p) { return JSON.parse(fs.readFileSync(path.join(root,p),'utf8')); }
const v129=load('audits/v129-exact-original-overlay-summary.json');
const v140=load('audits/v140-original-coordinate-quantization-summary.json');
const v263=load('audits/v263-proximity-candidate-conservation-gate-20261115.json');
const sha=(p)=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+fs.statSync(path.join(root,p)).size+'\\0'.replace('\\0','\0')),fs.readFileSync(path.join(root,p))])).digest('hex');
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label);}
check('input blob SHA',()=>{for(const input of v263.inputs)assert.equal(sha(input.path),input.gitBlobSHA1);});
check('source SHA256 agreement',()=>assert.equal(v129.sourceZipSHA256,v140.inputSHA256.source));
check('graph SHA256 agreement',()=>assert.equal(v129.overlayPackageSha256,v140.inputSHA256.graph));
check('archive non-identity',()=>assert.notEqual(v129.topologyZipSha256,v140.inputSHA256.topology));
check('nationwide coverage',()=>{assert.equal(v129.mountainsProcessed,2902);assert.equal(v140.originalMountainsPreserved,2902);});
check('original edge and endpoint conservation',()=>{assert.equal(v140.originalEdgesPreserved,67185);assert.equal(v140.sourceEndpointOccurrences,2*v140.originalEdgesPreserved);assert.equal(v140.sourceCoveredGraphNodes,v140.originalNodesPreserved);});
check('35m candidate partition',()=>assert.equal(v129.totals.alreadySameNode+v129.totals.provisionalEdgesAdded,v129.candidatePairs));
check('component reduction',()=>assert.equal(v129.componentsBefore-v129.componentsAfter,v263.derived.componentReductionsPlanOnly));
check('quantization risk hierarchy',()=>{assert.ok(v140.quantizedNodesSpreadAbove10cm<=v140.quantizedNodesSpreadAbove5cm);assert.ok(v140.quantizedNodesSpreadAbove5cm<=v140.quantizedNodesSpreadAbove1cm);});
check('no physical approval',()=>{assert.equal(v129.verifiedPassage,false);assert.equal(v140.newVerifiedPhysicalConnections,0);assert.equal(v263.mutations.approvedLinks,0);});
check('Hangyeryeong remains outside threshold',()=>assert.ok(v263.derived.hangyeryeongGapMeters>v263.derived.proximityThresholdMeters));
console.log(JSON.stringify({passed:checks,completion:false,scope:'GitHub audit JSON consistency only; no raw SHP/DEM/ZIP or field verification'}));
