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
