import assert from 'node:assert/strict';
import {classifyExactEndpointPair,selfTest} from '../tools/v234-quantization-risk-gate.mjs';
const a={x:.049,y:0},b={x:.051,y:0};
for(const q of [0,-.1,NaN,Infinity,-Infinity,'0.1',null]){
 assert.throws(()=>classifyExactEndpointPair(a,b,q),/invalid quantization grid/);
}
assert.equal(classifyExactEndpointPair(a,b,.1).sameQuantizedCell,false);
assert.equal(classifyExactEndpointPair({x:.01,y:.01},{x:.02,y:.02},.1).sameQuantizedCell,true);
assert.equal(classifyExactEndpointPair(a,b,.1).passageAuthorized,false);
assert.equal(selfTest().passed,15);
console.log('PASS: fail closed on invalid quantization grids; preserve exact-point and no-passage rules');
