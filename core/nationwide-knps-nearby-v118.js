/* Sanbakmap v118 — optional PLAN-ONLY near-endpoint gap preview.
 * Inputs are original 2018 KNPS trail lines and the v117 audit graph.
 * At most 5 m endpoint-to-interior, not arbitrary path-to-path crossings.
 * A connector never establishes safe/authorized passage; it remains visible
 * and measured as a provisional gap even when used by shortest-path preview.
 * Exact original edge identities/DEM records are NEVER rewritten.
 */
(function(root){
'use strict';
const RAD=Math.PI/180,R=6371008.8,MAX_GAP_M=5;
const metric=p=>[p[0]*RAD*R*Math.cos(38*RAD),p[1]*RAD*R];
const meters=(a,b)=>{const p=metric(a),q=metric(b);return Math.hypot(p[0]-q[0],p[1]-q[1])};
function projection(P,A,B){
 const p=metric(P),a=metric(A),b=metric(B),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
 if(den<1e-9)return null;
 const t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den;
 if(t<=0.00001||t>=0.99999)return null;
 return {t,dist:Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy),
  at:[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t]};
}
function enhance(graph,geojson,{maxGapMeters=MAX_GAP_M}={}){
 if(graph?.schema!=='sanbak-topology-geometric-v102'||
    graph?.routable!==false||graph?.accessVerified!==false||
    graph?.summary?.physicalJunctionVerified!==false||
    graph?.summary?.currentAccessVerified!==false||
    geojson?.metadata?.source_file_date!=='2018-12-31'||
    geojson?.metadata?.source_zip_sha256!=='a4a378233fe491b35bcdc157420d58ca7f9e9f57e1c6af4399dbafcad6ba9baf'||
    !Number.isFinite(maxGapMeters)||maxGapMeters<.1||maxGapMeters>MAX_GAP_M)
   throw Error('KNPS source provenance or maximum planning gap invalid');
 const originalEdges=graph.edges.filter(e=>!e.geometricContactOnly&&!e.provisionalSplit&&!e.provisionalGap);
 const parts=new Map();
 for(let i=0;i<geojson.features.length;i++){
  const f=geojson.features[i];
  if(f.properties?.facility_type!=='탐방로')continue;
  if(f.properties?.current_access_verified!==false||f.properties?.routing_allowed!==false)
   throw Error('Unverified access cannot be treated as open');
  const records=f.geometry?.type==='LineString'?[f.geometry.coordinates]:
   f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[];
  for(let j=0;j<records.length;j++){
   const coords=records[j],prefix=[0];
   for(let k=1;k<coords.length;k++)prefix.push(prefix.at(-1)+meters(coords[k-1],coords[k]));
   parts.set('knps2018:'+i+':'+j,{coords,prefix});
  }
 }
 const nodes=graph.nodes.map(x=>x.slice()),parent=nodes.map((_,i)=>i);
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
 const unite=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
 for(const e of graph.edges){
  if(e.accessVerified!==false||e.routable!==false||!parts.has(e.sourceId)||
     !Number.isInteger(e.from)||!Number.isInteger(e.to)||!nodes[e.from]||!nodes[e.to])
   throw Error('Original KNPS graph lineage mismatch');
  if(e.from!==e.to&&e.length_m>0)unite(e.from,e.to);
 }
 const endpoints=[];
 for(const [sourceId,p]of parts)for(const vertex of [0,p.coords.length-1]){
  const coord=p.coords[vertex],node=nodes.findIndex(x=>x[0]===coord[0]&&x[1]===coord[1]);
  if(node<0)throw Error('Source endpoint missing from graph');
  if(!endpoints.some(e=>e.node===node&&e.sourceId===sourceId))
   endpoints.push({node,sourceId,coord});
 }
 const candidates=[],seen=new Set();
 for(const origin of endpoints)for(let eid=0;eid<originalEdges.length;eid++){
  const e=originalEdges[eid];
  if(e.sourceId===origin.sourceId||find(origin.node)===find(e.from))continue;
  const part=parts.get(e.sourceId);
  if(!part||e.startVertex<0||e.endVertex>=part.coords.length)throw Error('Bad edge part');
  let best=null;
  for(let j=e.startVertex;j<e.endVertex;j++){
   const hit=projection(origin.coord,part.coords[j],part.coords[j+1]);
   if(!hit||hit.dist<=.01||hit.dist>maxGapMeters)continue;
   const len=part.prefix[j]-part.prefix[e.startVertex]+
    hit.t*(part.prefix[j+1]-part.prefix[j]);
   if(len<.5||e.length_m-len<.5)continue;
   const c={originNode:origin.node,sourceOrigin:origin.sourceId,
    targetEdge:eid,sourceId:e.sourceId,segment:j,t:hit.t,
    at:hit.at,dist:hit.dist,sourceMeters:len};
   if(!best||c.dist<best.dist)best=c;
  }
  if(best&&!seen.has(origin.node+':'+eid)){
   candidates.push(best);seen.add(origin.node+':'+eid);
  }
 }
 candidates.sort((a,b)=>a.dist-b.dist||a.originNode-b.originNode||a.targetEdge-b.targetEdge);
 const accepted=[],events=[];
 for(const item of candidates){
  const target=originalEdges[item.targetEdge];
  if(find(item.originNode)===find(target.from))continue;
  // Exact source endpoint and sole closest target: only one connection
  // per original component pair, preferring the least geometric discrepancy.
  const previous=accepted.find(x=>x.originNode===item.originNode);
  if(previous)continue;
  const p=parts.get(item.sourceId),newNode=nodes.length;
  nodes.push(item.at.slice());parent.push(newNode);
  events.push({...item,projectedNode:newNode});
  accepted.push(item);
  unite(item.originNode,newNode);unite(newNode,target.from);
 }
 const edges=graph.edges.slice(),byEdge=new Map();
 for(const ev of events){
  if(!byEdge.has(ev.targetEdge))byEdge.set(ev.targetEdge,[]);
  byEdge.get(ev.targetEdge).push(ev);
 }
 function along(part,start,end){
  if(!(end>start))return null;
  function interpolate(distance){
   for(let i=1;i<part.prefix.length;i++)if(distance<=part.prefix[i]+1e-5){
    const d=part.prefix[i]-part.prefix[i-1],t=d?Math.min(1,Math.max(0,(distance-part.prefix[i-1])/d)):0;
    const a=part.coords[i-1],b=part.coords[i];
    return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
   }
   return part.coords.at(-1).slice();
  }
  const coords=[interpolate(start)];
  for(let i=1;i<part.prefix.length-1;i++)if(part.prefix[i]>start+1e-5&&part.prefix[i]<end-1e-5)
   coords.push(part.coords[i].slice());
  coords.push(interpolate(end));return coords;
 }
 for(const [eid,list]of byEdge){
  const original=originalEdges[eid],part=parts.get(original.sourceId),
   offset=part.prefix[original.startVertex];
  list.sort((a,b)=>a.sourceMeters-b.sourceMeters);
  const breaks=[{node:original.from,s:0},...list.map(x=>({node:x.projectedNode,s:x.sourceMeters})),
   {node:original.to,s:original.length_m}];
  for(let i=1;i<breaks.length;i++){
   const a=breaks[i-1],b=breaks[i],m=+(b.s-a.s).toFixed(2);
   if(m<=0)throw Error('Overlapping projection along same source edge');
   edges.push({from:a.node,to:b.node,length_m:m,
    sourceId:original.sourceId,startVertex:original.startVertex,endVertex:original.endVertex,
    accessVerified:false,routable:false,provisionalSplit:true,
    sourceOriginalEdgeId:eid,previewPolyline:along(part,offset+a.s,offset+b.s)});
  }
 }
 const connectors=[];
 for(const ev of events){
  const m=+ev.dist.toFixed(2),edgeId=edges.length;
  if(m<=0)throw Error('Invalid zero-length approximate connector');
  edges.push({from:ev.originNode,to:ev.projectedNode,length_m:m,
   sourceId:ev.sourceOrigin,startVertex:0,endVertex:1,accessVerified:false,routable:false,
   provisionalGap:true,sourceOriginalEdgeId:ev.targetEdge,
   previewPolyline:[nodes[ev.originNode].slice(),nodes[ev.projectedNode].slice()]});
  connectors.push({edgeId,fromNode:ev.originNode,toNode:ev.projectedNode,
   sourceEdge:ev.targetEdge,gapMeters:m,mode:'PLAN_ONLY_NEARBY_NO_ACCESS_VERIFICATION'});
 }
 const components=new Set(parent.map((_,i)=>find(i))).size;
 const result={...graph,nodes,edges,originalNodeCount:graph.nodes.length,summary:{...graph.summary,nodes:nodes.length,
  edges:edges.length,geometricComponents:components,proximityEdgesCreated:connectors.length,
  physicalJunctionVerified:false,currentAccessVerified:false,planningGapMaxMeters:maxGapMeters}};
 return Object.freeze({graph:result,connectors,maxGapMeters,
  originalEdgeCount:graph.edges.length,
  source:'2018 KNPS historic source lines; proximity estimate, not navigable/verified'});
}
root.SanbakKnpsNearbyV118=Object.freeze({version:118,enhance});
})(typeof window!=='undefined'?window:globalThis);
