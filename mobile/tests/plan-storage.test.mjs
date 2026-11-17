import test from 'node:test';
import assert from 'node:assert/strict';
import {graphFingerprint,validatePlan,restorePlan,readPlans,savePlan,deletePlan,updatePlanDate,exportPlans,importPlans} from '../src/plan-storage.mjs';
const graph={nodes:[[1,2],[3,4]],edges:[{a:0,b:1,length_m:10}]};
const model={nodeCount:2,degreeOf:n=>n<2?1:0,plan:ids=>({status:'geometry_preview_only',legs:[{edgeIds:[0]}]})};
const plan=()=>({schema:1,name:'설악 계획',mountainCode:'428302602',graphKind:'knps',sourceFingerprint:graphFingerprint(graph),waypoints:[0,1],planDate:'2026-11-20',currentAccessVerified:false,usableForNavigation:false});
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
test('valid plan saves, loads and deletes without storing consent',()=>{const s=storage();savePlan(s,plan());assert.equal(readPlans(s).length,1);assert.deepEqual(restorePlan(readPlans(s)[0],{mountainCode:'428302602',graphKind:'knps',graph,model}),[0,1]);deletePlan(s,0);assert.equal(readPlans(s).length,0)});
test('changed graph and disconnected paths cannot restore',()=>{assert.throws(()=>restorePlan(plan(),{mountainCode:'428302602',graphKind:'knps',graph:{...graph,edges:[]},model}),/달라/);assert.throws(()=>restorePlan(plan(),{mountainCode:'428302602',graphKind:'knps',graph,model:{...model,plan:()=>({status:'disconnected'})}}),/확인/)});
test('rejects invented permissions, invalid dates, malformed waypoints',()=>{assert.throws(()=>validatePlan({...plan(),currentAccessVerified:true}));assert.throws(()=>validatePlan({...plan(),planDate:'2026-02-30'}));assert.throws(()=>validatePlan({...plan(),waypoints:[0,-1]}));});

test('JSON export/import roundtrip preserves unverified safety fields',()=>{
 const source=storage(),target=storage();savePlan(source,plan());
 const exported=exportPlans(source);const result=importPlans(target,exported);
 assert.deepEqual(result,{imported:1,skipped:0});
 assert.deepEqual(readPlans(target),readPlans(source));
 assert.deepEqual(importPlans(target,exported),{imported:0,skipped:1});
 assert.equal(JSON.parse(exported).plans[0].usableForNavigation,false);
 assert.equal(JSON.stringify(JSON.parse(exported)).includes('lntConsent'),false);
});
test('malformed or invented permissions never partially import',()=>{
 const s=storage();savePlan(s,plan());const before=s.getItem('sanbakmap:route-plans:v1');
 const bad=JSON.stringify({format:'sanbakmap-route-plans',version:1,plans:[{...plan(),name:'new'}, {...plan(),currentAccessVerified:true}]});
 assert.throws(()=>importPlans(s,bad),/미검증/);
 assert.equal(s.getItem('sanbakmap:route-plans:v1'),before);
 assert.throws(()=>importPlans(s,'not json'),/JSON/);
 assert.throws(()=>importPlans(s,JSON.stringify({format:'other',version:1,plans:[]})),/지원하지/);
});

test('date editing preserves original graph identity, waypoint order and unverified flags',()=>{
 const s=storage();savePlan(s,plan());const before=readPlans(s)[0];
 const updated=updatePlanDate(s,0,'2026-12-01');
 assert.equal(updated.planDate,'2026-12-01');
 assert.deepEqual(updated.waypoints,before.waypoints);
 assert.equal(updated.sourceFingerprint,before.sourceFingerprint);
 assert.equal(updated.currentAccessVerified,false);
 assert.equal(updated.usableForNavigation,false);
 assert.deepEqual(restorePlan(updated,{mountainCode:'428302602',graphKind:'knps',graph,model}),[0,1]);
 const snapshot=s.getItem('sanbakmap:route-plans:v1');
 assert.throws(()=>updatePlanDate(s,0,'2026-02-30'),/계획일/);
 assert.throws(()=>updatePlanDate(s,3,'2026-12-01'),/번호/);
 assert.equal(s.getItem('sanbakmap:route-plans:v1'),snapshot);
 assert.equal(updatePlanDate(s,0,'').planDate,'');
});

test('restoration rejects missing leg coverage, unknown edges and inferred joins',()=>{
 const context={mountainCode:'428302602',graphKind:'knps',graph,model};
 for(const legs of [[],[{edgeIds:[]}],[{edgeIds:[9]}],[{edgeIds:[-1]}],[{edgeIds:[0.5]}]]){
  const fake={...model,plan:()=>({status:'geometry_preview_only',legs})};
  assert.throws(()=>restorePlan(plan(),{...context,model:fake}),/확인|복원/);
 }
 const inferred={nodes:graph.nodes,edges:[{...graph.edges[0],provisionalGap:true}]};
 const unverified={nodes:graph.nodes,edges:[{...graph.edges[0],unverified:true}]};
 for(const bad of [inferred,unverified]){
  const snapshot={...plan(),sourceFingerprint:graphFingerprint(bad)};
  assert.throws(()=>restorePlan(snapshot,{...context,graph:bad}),/미확인/);
 }
 assert.deepEqual(restorePlan(plan(),context),[0,1]);
});
