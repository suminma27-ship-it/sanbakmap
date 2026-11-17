import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {materializeMountain} from '../tools/build-35m-preview-v127.mjs';
const encode=pts=>{
 let prev=[0,0],out='';
 for(const p of pts){
  const nums=p.map(x=>Math.round(x*1e5));
  for(let k=0;k<2;k++){
   let d=nums[k]-prev[k];prev[k]=nums[k];
   let v=d<0?~(d<<1):d<<1;
   while(v>=32){out+=String.fromCharCode((32|(v&31))+63);v>>=5}
   out+=String.fromCharCode(v+63);
  }
 }
 return out;
};
const graph={
 summary:{navigable:false,access_verified:false,physical_junction_verified:false,
  geometric_components:3,nodes:6,edges:3},
 nodes:[[0,0],[1000,0],[500,500],[500,2000],[6000,6000],[6500,6500]],
 edges:[[0,1,100,0,0,1],[2,3,150,1,0,1],[4,5,50,2,0,1]],
 source_parts:[[0,0,0],[0,1,0],[0,2,0]]
};
const inputSha=createHash('sha256').update(JSON.stringify(graph)).digest('hex');
const path0=[encode([[127,37],[127.001,37]])];
const path1=[encode([[127.0005,37.00045],[127.0005,37.0018]])];
Object.defineProperty(path0,1,{get(){throw Error('Unused multipart decoded')},enumerable:true});
const unused=['test.zip',2,null,null,null,[]];
Object.defineProperty(unused,5,{get(){throw Error('Unused source row decoded')},enumerable:true});
const rows=[['test.zip',0,null,null,null,path0],['test.zip',1,null,null,null,path1],unused];
const c={sourceParts:[0,1],sourceSegments:[0,0],anchorsEPSG5179:[[0,0],[0,0]],
 gapMeters:24,kind:'transverse_gap_candidate',proposedOnly:true,passageVerified:false};
const noCandidate=materializeMountain(graph,['test.zip'],rows,[]);
assert.equal(noCandidate.stats.attempted,0);
assert.equal(noCandidate.stats.gapEdges,0);
assert.equal(noCandidate.stats.componentsBefore,noCandidate.stats.componentsAfter);
assert.equal(noCandidate.graph.edges.length,graph.edges.length);
const result=materializeMountain(graph,['test.zip'],rows,[c]);
assert.equal(result.stats.attempted,1);
assert.equal(result.stats.gapEdges,1);
assert(result.stats.componentsAfter<result.stats.componentsBefore);
assert.equal(result.added.filter(x=>x.type==='provisional_gap_35m').length,1);
assert.equal(result.added.at(-1).verifiedPassage,false);
assert.equal(result.graph.summary.navigable,false);
assert.equal(result.graph.summary.access_verified,false);
assert.equal(result.usableForNavigation,false);
assert.deepEqual(result.graph.edges.slice(0,graph.edges.length),graph.edges);
assert.equal(createHash('sha256').update(JSON.stringify(graph)).digest('hex'),inputSha);
console.log('PASS source-part selection: unrelated rows never decoded, 35m review preserved, no original graph changes');
