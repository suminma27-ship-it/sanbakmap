import assert from 'node:assert/strict';
import {materializeMountain} from '../tools/build-35m-preview-v127.mjs';
const g={summary:{navigable:false,access_verified:false,physical_junction_verified:false,
 geometric_components:2,nodes:4,edges:2},
 nodes:[[0,0],[1000,0],[500,500],[500,2000]],
 edges:[[0,1,100,0,0,1],[2,3,150,1,0,1]],
 source_parts:[[0,0,0],[0,1,0]]};
const encode=pts=>{let prev=[0,0],result='';
 for(const p of pts){const nums=[Math.round(p[0]*1e5),Math.round(p[1]*1e5)];
  for(let i=0;i<2;i++){let d=nums[i]-prev[i];prev[i]=nums[i];
   let x=d<0?~(d<<1):d<<1;while(x>=0x20){result+=String.fromCharCode((0x20|(x&0x1f))+63);x>>=5}
   result+=String.fromCharCode(x+63);
  }}return result};
const rows=[
 ['test.zip',0,null,null,null,[encode([[127,37],[127.001,37]])]],
 ['test.zip',1,null,null,null,[encode([[127.0005,37.00045],[127.0005,37.0018]])]]
];
const c={sourceParts:[0,1],sourceSegments:[0,0],
 anchorsEPSG5179:[[0,0],[0,0]],gapMeters:24,kind:'transverse_gap_candidate',
 proposedOnly:true,passageVerified:false};
const original=structuredClone(g);
const o=materializeMountain(g,['test.zip'],rows,[c]);
assert.equal(o.stats.attempted,1);
assert.equal(o.stats.gapEdges,1);
assert.equal(o.stats.discarded,0);
assert.equal(o.graph.edges.length>g.edges.length,true);
assert.deepEqual(g,original);
assert.equal(o.graph.summary.navigable,false);
assert.equal(o.graph.summary.physical_junction_verified,false);
assert(o.stats.componentsAfter<o.stats.componentsBefore,'35m candidate should join graph COMPONENTS provisionally');
assert(o.added.some(x=>x.type==='provisional_gap_35m'&&!x.verifiedPassage));
console.log('PASS v127: provisional-only 35m link, original graph unchanged, connectivity rebuild and provenance retained');
