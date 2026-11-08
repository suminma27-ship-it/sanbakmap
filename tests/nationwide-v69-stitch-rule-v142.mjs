import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const a=read('audits/v142-v69-rule-regression-summary.json');
const v128=read('audits/v128-original-35m-summary.json');
const v129=read('audits/v129-exact-original-overlay-summary.json');
const v141=read('audits/v141-cross-version-invariants.json');
assert.equal(a.historicV69Commit,'13920840c1e3566505f2521bf4f33822a1b8a069');
assert.equal(a.historicV69IndexBlob,'9b1851098d1135d4b856cd658db911a95f0abea8');
assert.equal(a.nationwideV128.candidateCount,v128.candidates);
const under=v128.bands['0-0.15m']+v128.bands['0.15-0.75m'];
assert.equal(under,109392);
assert.equal(a.nationwideV128.atMost075mByBands,under);
assert.equal(a.nationwideV128.over075mByBands,v128.candidates-under);
assert.equal(a.v129Provisional35mEdges,v129.totals.provisionalEdgesAdded);
assert.equal(v141.scope.mountains,2902);
assert.equal(a.hangyeryeong.originalSourceMinGapMeters,v128.knownCase.originalSourceMinGapMeters);
assert(a.hangyeryeong.originalSourceMinGapMeters>35);
assert.equal(a.originalGraphChanged,false);
assert.equal(a.demChanged,false);
assert.equal(a.uiChanged,false);
assert.equal(a.physicalLinksApproved,0);

// A standalone fixture of the documented v69 candidate/stitch rules. Distances are supplied
// as metres so this test validates the decision logic, NOT the historic haversine implementation.
function legacyStitches(nodes){
 const options=nodes.map((a,i)=>a.degree!==1?[]:nodes.flatMap((b,j)=>{
  if(i===j||a.component===b.component||a.horizontal[j]===undefined)return [];
  return a.horizontal[j]<=.75&&Math.abs(a.z-b.z)<=4?[j]:[];
 }));
 const reverse=nodes.map((_,j)=>options.filter(o=>o.length===1&&o[0]===j).length);
 const seen=new Set(),links=[];
 for(let i=0;i<nodes.length;i++)if(options[i].length===1){
  const j=options[i][0],key=[i,j].sort((x,y)=>x-y).join(':');
  if(seen.has(key)||reverse[j]!==1)continue;
  if(nodes[j].degree===1&&(options[j].length!==1||options[j][0]!==i))continue;
  seen.add(key);links.push(key);
 }
 return links;
}
const node=(component,degree,z=0,horizontal={})=>({component,degree,z,horizontal});
assert.deepEqual(legacyStitches([node(0,1,0,{1:.5}),node(1,1,1,{0:.5})]),['0:1'],'unique endpoint pair');
assert.deepEqual(legacyStitches([node(0,1,0,{1:.751}),node(1,1,0,{0:.751})]),[],'horizontal threshold');
assert.deepEqual(legacyStitches([node(0,1,0,{1:.5}),node(1,1,4.01,{0:.5})]),[],'vertical threshold');
assert.deepEqual(legacyStitches([node(0,2,0,{1:.5}),node(1,1,0,{0:.5})]),[],'source degree one required');
assert.deepEqual(legacyStitches([node(0,1,0,{1:.5}),node(0,1,0,{0:.5})]),[],'already connected rejected');
assert.deepEqual(legacyStitches([node(0,1,0,{1:.5,2:.5}),node(1,1,0,{0:.5}),node(2,1,0,{0:.5})]),[],'ambiguous forward candidates rejected');
assert.deepEqual(legacyStitches([node(0,1,0,{2:.5}),node(1,1,0,{2:.5}),node(2,2,0,{0:.5,1:.5})]),[],'reverse ambiguity rejected');
assert.deepEqual(legacyStitches([node(0,1,0,{1:.5}),node(1,1,0,{0:.5,2:.5}),node(2,1,0,{1:.5})]),[],'degree one target requires mutual unique');
assert.deepEqual(legacyStitches([node(0,1,0,{1:.75}),node(1,1,4,{0:.75})]),['0:1'],'inclusive boundaries');
console.log('PASS v142: v69 rule fixture, 9 decision cases, 35598 source pairs above 0.75m; no topology changes');
