/* Sanbakmap v104 — geometric route preview, NOT a navigational route.
 * Takes original-geometry v102 source graphs and uses their measured segment lengths.
 * No new links, no snapping, no access inference, no cross-mountain merge.
 * The production-approved route gate in v103 is deliberately NOT used/bypassed.
 */
(function(root){
'use strict';
const GUARD='원본 GIS 기하 검토 전용 · 실제 통행·탐방 허가 미확인';
function create(graph,kind){
 if(kind!=='forest'&&kind!=='knps')throw Error('Unknown source type');
 const s=graph?.summary;
 const sourceOK=kind==='forest'
  ?s?.navigable===false&&s?.access_verified===false&&s?.physical_junction_verified===false
  :graph?.routable===false&&graph?.accessVerified===false&&
    s?.currentAccessVerified===false&&s?.physicalJunctionVerified===false&&graph?.sourceGeometry==='original';
 if(!sourceOK||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))
  throw Error('Historical geometry provenance or access flags missing');
 const nodes=graph.nodes,rawEdges=graph.edges,n=nodes.length;
 if(n<2||n>100000||rawEdges.length>250000)throw Error('Source graph dimensions not supported');
 const adj=Array.from({length:n},()=>[]),degree=new Uint32Array(n),
       parent=Array.from({length:n},(_,i)=>i),edges=[];
 const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x};
 function unite(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a}
 for(const p of nodes){
  if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||
      (kind==='forest'&&(!Number.isInteger(p[0])||!Number.isInteger(p[1]))))
    throw Error('Invalid original-geometry graph node');
 }
 for(let i=0;i<rawEdges.length;i++){
  const raw=rawEdges[i];
  const e=kind==='forest'?
   (Array.isArray(raw)&&raw.length===6?{a:raw[0],b:raw[1],meters:raw[2],sourcePart:raw[3],
     startVertex:raw[4],endVertex:raw[5]}:null):
   (raw&&typeof raw==='object'&&!Array.isArray(raw)&&
     raw.accessVerified===false&&raw.routable===false?
     {a:raw.from,b:raw.to,meters:raw.length_m,sourcePart:raw.sourceId,
       startVertex:raw.startVertex,endVertex:raw.endVertex}:null);
  if(!e||!Number.isInteger(e.a)||!Number.isInteger(e.b)||e.a<0||e.b<0||
     e.a>=n||e.b>=n||!Number.isFinite(e.meters)||e.meters<0||
     !Number.isInteger(e.startVertex)||!Number.isInteger(e.endVertex)||
     e.endVertex<=e.startVertex)throw Error('Malformed source segment');
  if(kind==='forest'&&(!Array.isArray(graph.source_parts)||
     !Number.isInteger(e.sourcePart)||e.sourcePart<0||e.sourcePart>=graph.source_parts.length))
    throw Error('Source segment lineage missing');
  edges.push(e);
  if(e.a===e.b||e.meters<=0)continue; // original self-loop is retained but not a shortcut
  adj[e.a].push([e.b,e.meters,i]);adj[e.b].push([e.a,e.meters,i]);
  degree[e.a]++;degree[e.b]++;unite(e.a,e.b);
 }
 const component=nodes.map((_,i)=>find(i)),components=new Set(component).size;
 const expected=kind==='forest'?s.geometric_components:s.geometricComponents;
 if(components!==expected)throw Error('Graph connectivity disagrees with source audit');
 function shortest(start,end){
  if(component[start]!==component[end])return null;
  const dist=new Float64Array(n);dist.fill(Infinity);
  const prev=new Int32Array(n);prev.fill(-1);
  const prevEdge=new Int32Array(n);prevEdge.fill(-1);
  const visited=new Uint8Array(n),heap=[];
  function push(item){
   let i=heap.length;heap.push(item);
   while(i>0){const j=(i-1)>>1;if(heap[j][0]<=item[0])break;heap[i]=heap[j];i=j}
   heap[i]=item;
  }
  function pop(){
   const first=heap[0],tail=heap.pop();if(!heap.length)return first;
   let i=0;
   for(;;){const left=i*2+1,right=left+1;if(left>=heap.length)break;
    const j=right<heap.length&&heap[right][0]<heap[left][0]?right:left;
    if(heap[j][0]>=tail[0])break;heap[i]=heap[j];i=j;
   }heap[i]=tail;return first;
  }
  dist[start]=0;push([0,start]);
  while(heap.length){
   const [d,u]=pop();if(visited[u]||d>dist[u])continue;visited[u]=1;
   if(u===end)break;
   for(const [v,meters,edge] of adj[u])if(!visited[v]&&d+meters<dist[v]){
    dist[v]=d+meters;prev[v]=u;prevEdge[v]=edge;push([dist[v],v]);
   }
  }
  if(!Number.isFinite(dist[end]))return null;
  const chain=[],used=[];let v=end;
  for(let k=0;k<=n;k++){
   chain.push(v);
   if(v===start)break;
   if(prev[v]===-1)return null;
   used.push(prevEdge[v]);v=prev[v];
  }
  if(chain.at(-1)!==start)return null;
  return {from:start,to:end,nodeIds:chain.reverse(),edgeIds:used.reverse(),
   meters:Math.round(dist[end]*100)/100};
 }
 function plan(waypoints){
  const block={kind:'geometry_preview',usableForNavigation:false,
   currentAccessVerified:false,approvedConnections:0,source:kind,warning:GUARD};
  if(!Array.isArray(waypoints)||waypoints.length<2||waypoints.length>30)
   return {...block,status:'need_two_to_thirty_nodes',legs:[],distanceMeters:null};
  if(waypoints.some(x=>!Number.isInteger(x)||x<0||x>=n))
   return {...block,status:'invalid_node',legs:[],distanceMeters:null};
  if(new Set(waypoints).size!==waypoints.length)
   return {...block,status:'duplicate_waypoint',legs:[],distanceMeters:null};
  let total=0;const legs=[];
  for(let i=1;i<waypoints.length;i++){
   const a=waypoints[i-1],b=waypoints[i],leg=shortest(a,b);
   if(!leg)return {...block,status:'disconnected',failedLeg:[a,b],
      legs:[],distanceMeters:null};
   legs.push(leg);total+=leg.meters;
  }
  return {...block,status:'geometry_preview_only',waypoints:waypoints.slice(),
   legs,distanceMeters:Math.round(total*100)/100};
 }
 function candidates(limit=80){
  const ids=nodes.map((_,i)=>i).filter(i=>degree[i]>0);
  ids.sort((a,b)=>degree[b]-degree[a]||a-b);
  return ids.slice(0,Math.max(1,Math.min(200,limit))).map(id=>({
   nodeId:id,degree:degree[id],component:component[id]}));
 }
 function example(){
  // Pick three distinct source nodes connected by TWO existing edges when possible.
  let highest=-1;
  for(let i=0;i<n;i++)if(degree[i]>degree[highest]||highest===-1)highest=i;
  if(highest<0||!adj[highest].length)return [];
  const unique=[...new Set(adj[highest].map(x=>x[0]))].filter(x=>x!==highest);
  if(unique.length>=2)return [unique[0],highest,unique[1]];
  const neighbor=unique[0];
  if(neighbor===undefined)return [];
  const next=adj[neighbor].map(x=>x[0]).find(x=>x!==highest&&x!==neighbor);
  return next===undefined?[highest,neighbor]:[highest,neighbor,next];
 }
 return Object.freeze({sourceKind:kind,nodeCount:n,edgeCount:edges.length,
  componentCount:components,candidates,example,plan,
  componentOf:id=>Number.isInteger(id)&&id>=0&&id<n?component[id]:null,
  degreeOf:id=>Number.isInteger(id)&&id>=0&&id<n?degree[id]:0});
}
root.SanbakGeometryPlannerV104=Object.freeze({version:104,create});
})(typeof window!=='undefined'?window:globalThis);
