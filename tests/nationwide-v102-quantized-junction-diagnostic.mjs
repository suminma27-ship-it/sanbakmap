import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../core/nationwide-topology-v102.js',import.meta.url),'utf8');
const root={};new Function('window',code)(root);
const line=(id,coords)=>({sourceId:id,coords,sourceGeometry:'original',accessVerified:false,routable:false});
const build=lines=>root.SanbakTopologyV102.build(lines,{sourceGeometry:'original'});
const coincident=build([
 line('a',[[127,37],[127.001,37]]),
 line('b',[[127.001,37],[127.002,37]])
]);
assert.equal(coincident.summary.quantizedNodeConflations,0);
const shifted=build([
 line('a',[[127,37],[127.001,37]]),
 line('b',[[127.00100015,37],[127.002,37]])
]);
assert.equal(shifted.summary.quantizedNodeConflations,1);
assert(shifted.summary.maximumConflationMeters>.01);
assert(shifted.summary.maximumConflationMeters<.02);
assert.equal(shifted.summary.conflationExamples.length,1);
assert.equal(shifted.summary.conflationExamples[0].node,1);
assert.equal(shifted.summary.geometricComponents,coincident.summary.geometricComponents);
assert.equal(shifted.summary.edges,coincident.summary.edges);
assert.equal(shifted.summary.nodes,coincident.summary.nodes);
assert.equal(shifted.summary.proximityEdgesCreated,0);
assert.equal(shifted.summary.currentAccessVerified,false);
assert.equal(shifted.routable,false);
assert(shifted.edges.every(e=>e.routable===false&&e.accessVerified===false));
const separated=build([
 line('a',[[127,37],[127.001,37]]),
 line('b',[[127.001017,37],[127.002,37]])
]);
assert.equal(separated.summary.quantizedNodeConflations,0);
assert.equal(separated.summary.geometricComponents,2);
console.log('PASS v102 quantized junction diagnostic: exact/shifted/separate inputs; unchanged topology and no route approval');
