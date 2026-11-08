/* Sanbakmap v103: geometry-only connection audit and strictly gated route core.
 * Historic cartographic connectivity never implies lawful or safe passage.
 * All source edge indices are retained; no snapping, no cross-mountain edges.
 */
(function(root){
'use strict';
function inspect(graph){
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges)||!Array.isArray(graph.source_parts)||
  !graph.summary||graph.summary.navigable!==false||graph.summary.access_verified!==false||
  graph.summary.physical_junction_verified!==false)throw Error('Historical graph provenance/verification missing');
 const nodes=graph.nodes,edges=graph.edges,n=nodes.length;
 if(n>200000||edges.length>300000||nodes.some(p=>!Array.isArray(p)||p.length!==2||
  !Number.isInteger(p[0])||!Number.isInteger(p[1])))throw Error('Invalid metric source vertices');
 const parent=Array.from({length:n},(_,i)=>i),degree=new Uint32Array(n);
 function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i}
 for(const e of edges){
  if(!Array.isArray(e)||e.length!==6||!Number.isInteger(e[0])||!Number.isInteger(e[1])||
   e[0]<0||e[1]<0||e[0]>=n||e[1]>=n||!Number.isFinite(e[2])||e[2]<0||
   !Number.isInteger(e[3])||e[3]<0||e[3]>=graph.source_parts.length)
   throw Error('Untrusted graph edge');
  const a=find(e[0]),b=find(e[1]);
  if(a!==b)parent[b]=a;
  degree[e[0]]++;degree[e[1]]++;
 }
 const roots=nodes.map((_,i)=>find(i)),count=new Set(roots).size;
 if(count!==graph.summary.geometric_components)throw Error('Component count differs from original-source audit');
 const tips=[];for(let i=0;i<n;i++)if(degree[i]===1)tips.push(i);
 const near=[];
 for(let i=0;i<tips.length;i++)for(let j=i+1;j<tips.length;j++){
  const a=tips[i],b=tips[j];if(roots[a]===roots[b])continue;
  const dx=nodes[a][0]-nodes[b][0],dy=nodes[a][1]-nodes[b][1];
  const dist=Math.hypot(dx,dy)/10;
  if(dist>0.15&&dist<=2)near.push([a,b,Math.round(dist*100)/100]);
 }
 return {componentCount:count,leafCount:tips.length,near,roots,
  geometricOnly:true,physicalJunctionVerified:false,routeAuthorized:false};
}
// Future path engine: every traversed original edge needs independent verified evidence.
// The historic v102 graph has navigable:false, so it is unconditionally rejected.
function route(verifiedGraph,from,to,approval){
 const g=verifiedGraph;
 if(!g||g.summary?.navigable!==true||g.summary?.access_verified!==true||
    g.summary?.physical_junction_verified!==true||approval?.currentAccessVerified!==true||
    approval?.geometryVerified!==true||!Array.isArray(approval?.verifiedEdgeIndices))
   return {status:'blocked_unverified',route:null};
 const n=g.nodes?.length;
 if(!Number.isInteger(n)||n<2||n>200000||!Number.isInteger(from)||!Number.isInteger(to)||
  from<0||to<0||from>=n||to>=n||from===to||!Array.isArray(g.edges))
   return {status:'invalid_input',route:null};
 const allowed=new Set(approval.verifiedEdgeIndices);
 const adj=Array.from({length:n},()=>[]);
 for(let i=0;i<g.edges.length;i++){
  if(!allowed.has(i))continue;
  const e=g.edges[i];if(!Array.isArray(e)||e.length!==6)continue;
  const [a,b,dist]=e;
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=n||b>=n||
     a===b||!Number.isFinite(dist)||dist<=0)continue;
  adj[a].push([b,dist,i]);adj[b].push([a,dist,i]);
 }
 const distance=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),
 prevEdge=new Int32Array(n).fill(-1),seen=new Uint8Array(n),heap=[];
 function push(item){
  let i=heap.length;heap.push(item);
  while(i>0){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p}heap[i]=item;
 }
 function pop(){
  const head=heap[0],tail=heap.pop();if(!heap.length)return head;
  let i=0;
  while(true){const l=i*2+1,r=l+1;if(l>=heap.length)break;
   const ch=r<heap.length&&heap[r][0]<heap[l][0]?r:l;
   if(heap[ch][0]>=tail[0])break;heap[i]=heap[ch];i=ch;
  }heap[i]=tail;return head;
 }
 distance[from]=0;push([0,from]);
 while(heap.length){
  const [d,u]=pop();if(seen[u]||d>distance[u])continue;seen[u]=1;
  if(u===to)break;
  for(const [v,w,edge] of adj[u])if(!seen[v]&&d+w<distance[v]){
   distance[v]=d+w;prev[v]=u;prevEdge[v]=edge;push([distance[v],v]);
  }
 }
 if(!Number.isFinite(distance[to]))return {status:'disconnected_or_unverified_edges',route:null};
 const nodes=[],edges=[];let v=to;
 for(let k=0;k<=n;k++){nodes.push(v);if(v===from)break;edges.push(prevEdge[v]);v=prev[v];if(v<0)break}
 if(nodes.at(-1)!==from)return {status:'invalid_graph',route:null};
 return {status:'ok',route:{nodeIndices:nodes.reverse(),edgeIndices:edges.reverse(),
   lengthMeters:Math.round(distance[to]*100)/100,geometrySource:'original',approvalRequired:true}};
}
root.SanbakGraphReviewV103=Object.freeze({version:103,inspect,route});
})(typeof window!=='undefined'?window:globalThis);
