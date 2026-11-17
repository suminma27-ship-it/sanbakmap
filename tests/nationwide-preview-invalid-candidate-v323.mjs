import assert from 'node:assert/strict';
import {materializeMountain} from '../tools/build-35m-preview-v127.mjs';
const graph={
 summary:{navigable:false,access_verified:false,physical_junction_verified:false,
  geometric_components:2,nodes:4,edges:2},
 nodes:[[0,0],[1000,0],[500,500],[500,2000]],
 edges:[[0,1,100,0,0,1],[2,3,150,1,0,1]],
 source_parts:[[0,0,0],[0,1,0]]
};
const encode=pts=>{
 let prev=[0,0],result='';
 for(const p of pts){
  const nums=p.map(x=>Math.round(x*1e5));
  for(let i=0;i<2;i++){
   let d=nums[i]-prev[i];prev[i]=nums[i];
   let x=d<0?~(d<<1):d<<1;
   while(x>=32){result+=String.fromChar((32|(x&31))+63);x>>=5}
   result+=String.fromChar(x+63);
  }
 }
 return result;
};
const rows=[
 ['test.zip',0,null,null,null,[encode([[127,37],[127.001,37]])]],
 ['test.zip',1,null,null,null,[encode([[127.0005,37.00045],[127.0005,37.0018]])]]
];
const candidate={
 sourceParts:[0,1],sourceSegments:[0,0],anchorsEPSG5179:[[0,0],[0,0]],
 gapMeters:24,kind:'transverse_gap_candidate',proposedOnly:true,passageVerified:false
};
const invalid=[
 {...candidate,gapMeters:NaN},
 {...candidate,gapMeters:Infinity},
 {...candidate,gapMeters:-Infinity},
 {...candidate,gapMeters:'24'},
 {...candidate,sourceSegments:[0.5,0]},
 {...candidate,sourceParts:[0,1.5]},
 {...candidate,sourceParts:[0,99]},
 {...candidate,anchorsEPSG5179:[[NaN,0],[0,0]]},
 {...candidate,anchorsEPSG5179:[[0,0],[Infinity,0]]},
 {...candidate,anchorsEPSG5179:[[0],[0,0]]}
];
const snapshot=JSON.stringify(graph);
const result=materializeMountain(graph,['test.zip'],rows,invalid);
assert.equal(result.stats.attempted,invalid.length);
assert.equal(result.stats.discarded,invalid.length);
assert.equal(result.stats.gapEdges,0);
assert.equal(result.stats.componentsAfter,result.stats.componentsBefore);
assert.equal(result.graph.edges.length,graph.edges.length);
assert.deepEqual(result.graph.edges,graph.edges);
assert.equal(JSON.stringify(graph),snapshot);
assert.equal(result.usableForNavigation,false);
const good=materializeMountain(graph,['test.zip'],rows,[candidate]);
assert.equal(good.stats.attempted,1);
assert.equal(good.stats.gapEdges,1);
assert.equal(good.stats.discarded,0);
assert(good.graph.edges.every(e=>e.every(Number.isFinite)));
assert.equal(good.usableForNavigation,false);
console.log('PASS plan-only overlay: 10 malformed candidate inputs rejected, valid candidate unchanged, source intact');
