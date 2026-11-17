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

// A malformed source vertex must fail before any derived graph can be written.
for(const node of [[NaN,0],[0,Infinity],[0,-Infinity],[0],[null,0],['1',0],null]){
 assert.throws(()=>validateSourceGraph({...good,nodes:[[0,0],node]},'synthetic'),
  /Invalid source node coordinates/);
}
assert.equal(validateSourceGraph(good,'synthetic'),true);
console.log('PASS: reject 13 malformed graph edges before nationwide artifact write');
