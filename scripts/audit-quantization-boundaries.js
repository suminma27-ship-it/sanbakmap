#!/usr/bin/env node
// Synthetic quantization regression only. Does not certify real trails.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const q = (v,step=0.1) => Math.round(v/step)*step;
const key = p => p.map(v=>Math.round(v/0.1)).join(',');
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const cases = [
 {name:'distinct exact endpoints collapse to one cell',a:[-0.049,-0.049],b:[0.049,0.049],same:true,min:0.13,max:0.15},
 {name:'nearly identical endpoints straddle cell boundary',a:[0.049,0.049],b:[0.05,0.05],same:false,min:0,max:0.002}
];
let checks=0;
function check(label,condition){assert.ok(condition,label);checks++}
for(const c of cases){
 const d=dist(c.a,c.b);
 check(c.name+': separation',d>=c.min && d<=c.max);
 check(c.name+': quantized relation',(key(c.a)===key(c.b))===c.same);
 for(const p of [c.a,c.b]) check(c.name+': drift bound',dist(p,p.map(v=>q(v)))<=Math.SQRT2*0.05+1e-12);
}
const published=JSON.parse(fs.readFileSync('audits/v140-original-coordinate-quantization-summary.json','utf8'));
check('metric CRS',published.crs==='EPSG:5179');
check('decimeter quantization',published.graphNodeQuantizationMeters===0.1);
check('observed maximum drift obeys theoretical bound',published.maximumOriginalEndpointNodeDriftMeters<=Math.SQRT2*0.05+1e-12);
check('114 high-spread nodes remain review-only',published.quantizedNodesSpreadAbove5cm===114 && published.newVerifiedPhysicalConnections===0);
check('four near-pairs remain review-only',published.nearbyDifferentGraphNodePairsAtMost2cm===4 && published.originalTopologyChanged===false);
const sourceBytes=fs.readFileSync('audits/v140-original-coordinate-quantization-summary.json');
const gitBlobSHA1=crypto.createHash('sha1').update(Buffer.from('blob '+sourceBytes.length+'\\0')).update(sourceBytes).digest('hex');
check('input git blob identity',gitBlobSHA1==='72f78e835c13cac887738a179000b2ef5899bbb3');
console.log(JSON.stringify({status:'pass',checks,sourceGitBlobSHA1:gitBlobSHA1,scope:'synthetic coordinate boundary + published metadata; no real feature approval',completion:false},null,2));
