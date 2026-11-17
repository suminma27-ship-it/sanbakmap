import assert from 'node:assert/strict';
import {validateSourceGraph} from '../tools/rebuild-topology-v102.mjs';
const good={nodes:[[0,0],[1,0]],source_parts:[[0,0,0]],edges:[[0,1,1,0,0,1]]};
assert.equal(validateSourceGraph(good,'synthetic'),true);
const bad=[
 [0.5,1,1,0,0,1],[NaN,1,1,0,0,1],[Infinity,1,1,0,0,1],
 [0,1.5,1,0,0,1],[0,2,1,0,0,1],[-1,1,1,0,0,1],
 [0,1,NaN,0,0,1],[0,1,Infinity,0,0,1],[0,1,-1,0,0,1],
 [0,1,1,0.5,0,1],[0,1,1,1,0,1],[0,1,1,NaN,0,1]
];
for(const edge of bad){
 assert.throws(()=>validateSourceGraph({...good,edges:[edge]},'synthetic'),
  /Invalid source edge/,JSON.stringify(edge));
}
assert.throws(()=>validateSourceGraph({...good,edges:[[0,1,1,0,0]]},'synthetic'),/Invalid source edge/);
assert.deepEqual(good.edges,[[0,1,1,0,0,1]]);
// Source vertex spans are integral, nonnegative, and strictly increasing.
const malformedSpans=[
 [0,1,1,0,-1,1],[0,1,1,0,0,0],[0,1,1,0,2,1],
 [0,1,1,0,.5,1],[0,1,1,0,0,1.5],[0,1,1,0,NaN,1],
 [0,1,1,0,0,NaN],[0,1,1,0,Infinity,2],[0,1,1,0,0,Infinity],
 [0,1,1,0,null,1],[0,1,1,0,0,'2']
];
for(const edge of malformedSpans){
 assert.throws(()=>validateSourceGraph({...good,edges:[edge]},'synthetic'),
  /Invalid source edge/,JSON.stringify(edge));
}


// A malformed source vertex must fail before any derived graph can be written.
for(const node of [[NaN,0],[0,Infinity],[0,-Infinity],[0],[null,0],['1',0],null]){
 assert.throws(()=>validateSourceGraph({...good,nodes:[[0,0],node]},'synthetic'),
  /Invalid source node coordinates/);
}
// Stored EPSG:5179 nodes are integer decimeters. Fractional or unsafe
// values silently violate the original 0.1m topology identity model.
const invalidDecimeterNodes=[
 [0.1,0],[-0.5,1],[1,1.5],[Number.MAX_SAFE_INTEGER+1,0],
 [0,Number.MIN_SAFE_INTEGER-1],[0,0,0]
];
for(const node of invalidDecimeterNodes){
 assert.throws(()=>validateSourceGraph({...good,nodes:[[0,0],node]},'synthetic'),
  /Invalid source node coordinates/);
}
assert.equal(validateSourceGraph({...good,nodes:[[-100000,200000],[1,0]]},'synthetic'),true);
assert.equal(validateSourceGraph(good,'synthetic'),true);
console.log('PASS: reject 6 non-decimeter graph node shapes/coordinates');
console.log('PASS: reject 13 malformed graph edges before nationwide artifact write');
