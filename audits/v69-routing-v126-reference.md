# 산박지도 v69 연결 방식 · 원본 코드 기준 교차검증

Original: GitHub commit `13920840c1e3566505f2521bf4f33822a1b8a069`, `index.html` blob `9b1851098d1135d4b856cd658db911a95f0abea8`.
Snapshot date: 2026-11-08.

v69 and v125/v126 are **not identical datasets**: v69 uses 3D park route graph, v125 uses forestry historic original-node graph and 3m simplified display lines. A numerical comparison is a *rule comparison*, not proof of same routes.

## Original v69 source, 421–455

```javascript
 // v59: only reconcile unique coordinate-duplicate endpoints, not arbitrary crossings.
 // Require a degree-one endpoint, <=0.75m horizontal and <=4m vertical difference.
 const degrees=adj.map(edges=>edges.length),cellSize=.00002,cells=new Map();
 for(let i=0;i<N;i++)if(degrees[i]&&goodPoint(net.nodes[i])){
  const p=net.nodes[i],key=Math.floor(p[0]/cellSize)+','+Math.floor(p[1]/cellSize);
  if(!cells.has(key))cells.set(key,[]);
  cells.get(key).push(i);
 }
 const candidates=Array.from({length:N},()=>[]),nearMisses=[];
 for(let i=0;i<N;i++)if(degrees[i]===1){
  const p=net.nodes[i],x=Math.floor(p[0]/cellSize),y=Math.floor(p[1]/cellSize);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   for(const j of cells.get((x+dx)+','+(y+dy))||[]){
    if(i===j||components[i]===components[j])continue;
    const q=net.nodes[j],meters=1000*hav(p,q);
    if(meters>6)continue;
    const elevation=Math.abs(p[2]-q[2]);
    if(meters<=.75&&elevation<=4)candidates[i].push(j);
    else if(nearMisses.length<80&&i<j)
     nearMisses.push({from:i,to:j,horizontalMeters:meters,elevationMeters:elevation});
   }
  }
 }
 const reverseCounts=new Int32Array(N);
 for(const choices of candidates)if(choices.length===1)reverseCounts[choices[0]]++;
 const stitches=[],used=new Set();
 for(let i=0;i<N;i++)if(candidates[i].length===1){
  const j=candidates[i][0],key=Math.min(i,j)+':'+Math.max(i,j);
  if(used.has(key)||reverseCounts[j]!==1)continue;
  if(degrees[j]===1&&(candidates[j].length!==1||candidates[j][0]!==i))continue;
  used.add(key);
  const km=hav(net.nodes[i],net.nodes[j]);
  adj[i].push([j,km,-1]);adj[j].push([i,km,-1]);
  stitches.push({from:i,to:j,horizontalMeters:1000*km,elevationMeters:Math.abs(net.nodes[i][2]-net.nodes[j][2])});
 }
```

Key details: v69 stitches only disconnected **degree-one endpoint** candidates within **0.75 m horizontal** and **4 m elevation**, with unique reverse pairing. Already-connected paths are not stitched. v69 also supports same-edge partial-line routing between arbitrary waypoint positions, unlike current source-node-only planning.

v126 uses **35m** as a maximum for *candidate recording*, not as physical or legal evidence. 0m crossings, duplicate overlapping lines, and near-parallel tracks have no automatic right-of-way established. No original graph edges are changed here.

## Important: v69 also contained an explicit one-off Seorak planning bridge

This route is **not explained by the generic 0.75m stitch alone**. Version 69 calls `installSeorakPlanningBridge()` before creating route graphs, adding a provisional hardcoded connector between Seorak source edges 9 and 22 near Hangyeryeong, measuring approximately 73.19m. Its input provenance was a 2026-11-06 user screenshot and the code explicitly calls it a hypothesis, not an access-verified path. This is a historical special case, **not** a reproducible nationwide connection rule.

Original v69 lines 334–376:

```javascript
// v64: screenshot-based, user-requested provisional connection near Hangyeryeong.
// Add alternative subedges without deleting source edges 9 and 22: previously saved edge IDs remain valid.
// This is not a field-verified trail. The connector is a straight-line planning hypothesis.
function installSeorakPlanningBridge(){
 const p=parks.find(x=>x.id==='seorak'),net=p?.net;
 if(!net||!Array.isArray(net.edges)||net.edges.length<23)return false;
 const specs=[{edge:9,lon:128.410167,lat:38.112018},
              {edge:22,lon:128.409740,lat:38.112584}];
 const anchors=specs.map(spec=>{
  const edge=net.edges[spec.edge];
  if(!Array.isArray(edge?.[3]))return null;
  const i=edge[3].findIndex(pt=>Math.abs(pt[0]-spec.lon)<.0000001&&Math.abs(pt[1]-spec.lat)<.0000001);
  return i>0&&i<edge[3].length-1?{spec,edge,i}:null;
 });
 if(anchors.some(x=>!x))return false;
 const d=hav(anchors[0].edge[3][anchors[0].i],anchors[1].edge[3][anchors[1].i]);
 if(!Number.isFinite(d)||d<.01||d>.1)return false;
 const joins=[];
 for(const a of anchors){
  const xyz=a.edge[3][a.i].slice(0,3),node=net.nodes.push(xyz)-1;
  const first=a.edge[3].slice(0,a.i+1),last=a.edge[3].slice(a.i);
  net.edges.push([a.edge[0],node,lineDistance(first),first]);
  net.edges.push([node,a.edge[1],lineDistance(last),last]);
  joins.push({node,xyz});
 }
 const connectorIndex=net.edges.length;
 net.edges.push([joins[0].node,joins[1].node,d,[joins[0].xyz,joins[1].xyz],
  {feature_kind:'planning_connector',verified:false,source:'user_screenshot_2026_11_06'}]);
 net._planningBaseEdges=specs.map(x=>x.edge);
 net._planningConnectorIndex=connectorIndex;
 net._planningBridge={a:joins[0].xyz,b:joins[1].xyz,km:d};
 return true;
}
function routeUsesPlanningBridge(net,line){
 const link=net?._planningBridge;
 if(!link||!Array.isArray(line))return false;
 for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i];
  if(hav(a,link.a)<.001&&hav(b,link.b)<.001||hav(a,link.b)<.001&&hav(b,link.a)<.001)return true;
 }
 return false;
}
installSeorakPlanningBridge();
```
