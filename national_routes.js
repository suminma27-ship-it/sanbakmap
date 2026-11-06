// v65: source-topology route engine, independent of the map UI.
(function(root){
'use strict';
function km(a,b){return 111.195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])}
function build(paths,connectors){
 const nodes=[],adj=[],ids=new Map();
 function vertex(p){
  if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return -1;
  const key=p[0]+','+p[1];if(ids.has(key))return ids.get(key);
  const id=nodes.length;nodes.push(p.slice(0,2));adj.push([]);ids.set(key,id);return id;
 }
 function edge(a,b,provisional){
  const u=vertex(a),v=vertex(b);
  if(u<0||v<0||u===v)return;
  const distance=km(nodes[u],nodes[v]);if(!Number.isFinite(distance)||distance<1e-8)return;
  adj[u].push({to:v,km:distance,provisional});
  adj[v].push({to:u,km:distance,provisional});
 }
 for(const path of paths||[]){
  if(!Array.isArray(path))continue;
  for(let i=1;i<path.length;i++)edge(path[i-1],path[i],false);
 }
 for(const f of connectors||[]){
  if(f?.properties?.feature_kind!=='planning_connector')continue;
  const xy=f.geometry?.coordinates;
  if(Array.isArray(xy)&&xy.length===2)edge(xy[0],xy[1],true);
 }
 return {nodes,adj};
}
// Lexicographically minimize (number of provisional connectors, distance).
function shortest(graph,from,to){
 if(!graph?.nodes||!graph?.adj||!Number.isInteger(from)||!Number.isInteger(to)||
  from<0||to<0||from>=graph.nodes.length||to>=graph.nodes.length)return null;
 if(from===to)return {coords:[graph.nodes[from]],km:0,provisional:0};
 const n=graph.nodes.length,dist=new Float64Array(n),uncertain=new Int32Array(n),prev=new Int32Array(n);
 dist.fill(Infinity);uncertain.fill(2147483647);prev.fill(-1);
 dist[from]=0;uncertain[from]=0;
 const heap=[],less=(a,b)=>a[0]===b[0]?a[1]<b[1]:a[0]<b[0];
 function push(item){
  heap.push(item);let i=heap.length-1;
  while(i>0){const p=(i-1)>>1;if(!less(heap[i],heap[p]))break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p}
 }
 function pop(){
  const out=heap[0],last=heap.pop();
  if(heap.length){
   heap[0]=last;let i=0;
   for(;;){
    const l=i*2+1,r=l+1;let best=i;
    if(l<heap.length&&less(heap[l],heap[best]))best=l;
    if(r<heap.length&&less(heap[r],heap[best]))best=r;
    if(best===i)break;
    [heap[best],heap[i]]=[heap[i],heap[best]];i=best;
   }
  }
  return out;
 }
 push([0,0,from]);
 while(heap.length){
  const [joins,d,u]=pop();
  if(joins!==uncertain[u]||d>dist[u]+1e-10)continue;
  if(u===to)break;
  for(const e of graph.adj[u]){
   const k=joins+(e.provisional?1:0),length=d+e.km,v=e.to;
   if(k<uncertain[v]||(k===uncertain[v]&&length<dist[v]-1e-10)){
    uncertain[v]=k;dist[v]=length;prev[v]=u;push([k,length,v]);
   }
  }
 }
 if(!Number.isFinite(dist[to]))return null;
 const chain=[];let v=to;
 for(let i=0;i<=n;i++){
  chain.push(v);if(v===from)break;
  v=prev[v];if(v<0)return null;
 }
 if(chain.at(-1)!==from)return null;
 chain.reverse();
 return {coords:chain.map(i=>graph.nodes[i]),km:dist[to],provisional:uncertain[to]};
}
function nearest(graph,project,x,y,tolerance){
 if(!graph||typeof project!=='function'||!Number.isFinite(tolerance)||tolerance<=0)return -1;
 let best=-1,dist=tolerance*tolerance;
 for(let i=0;i<graph.nodes.length;i++){
  const p=project(graph.nodes[i]);const d=(p[0]-x)**2+(p[1]-y)**2;
  if(d<=dist){dist=d;best=i}
 }
 return best;
}
root.SanbakNationalRoutes={build,shortest,nearest,km};
})(window);
