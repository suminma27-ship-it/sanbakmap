/* Sanbakmap v117: historic KNPS endpoint-on-segment GEOMETRIC contact repair.
 * Only an original source endpoint lying on a different original source segment
 * within 1 cm can add split edges. Never infer 2-D interior/interior crossings,
 * near misses, a safe/legally open trail, or a new synthetic straight connector.
 * Preserve every original edge ID; append derived subedges only.
 */
(function(root){
'use strict';
const RAD=Math.PI/180,R=6371008.8,TOL_M=0.01;
function metric(p){return [p[0]*RAD*R*Math.cos(38*RAD),p[1]*RAD*R]}
function meters(a,b){
 const lat=(a[1]+b[1])*RAD/2;
 const dx=(a[0]-b[0])*RAD*Math.cos(lat),dy=(a[1]-b[1])*RAD;
 return 2*R*Math.asin(Math.min(1,Math.hypot(dx,dy)/2));
}
function project(p,a,b){
 const P=metric(p),A=metric(a),B=metric(b),x=B[0]-A[0],y=B[1]-A[1],den=x*x+y*y;
 if(den<1e-10)return null;
 const t=((P[0]-A[0])*x+(P[1]-A[1])*y)/den;
 if(t<=0.00001||t>=0.99999)return null;
 return {t,dist:Math.hypot(P[0]-(A[0]+t*x),P[1]-(A[1]+t*y))};
}
function enhance(original,geojson){
 if(original?.schema!=='sanbak-topology-geometric-v102'||
  original?.sourceGeometry!=='original'||original?.accessVerified!==false||
  original?.routable!==false||original?.summary?.physicalJunctionVerified!==false||
  original?.summary?.currentAccessVerified!==false||
  geojson?.metadata?.source_file_date!=='2018-12-31'||
  geojson?.metadata?.source_zip_sha256!=='a4a378233fe491b35bcdc157420d58ca7f9e9f57e1c6af4399dbafcad6ba9baf')
  throw Error('Historical KNPS geometry source provenance mismatch');
 if(!Array.isArray(original.nodes)||!Array.isArray(original.edges))throw Error('No original network');
 const parts=new Map();
 for(let i=0;i<geojson.features.length;i++){
  const f=geojson.features[i];
  if(f.properties?.facility_type!=='탐방로')continue;
  if(f.properties?.current_access_verified!==false||
     f.properties?.routing_allowed!==false)throw Error('KNPS approval not verified');
  const x=f.geometry?.type==='LineString'?[f.geometry.coordinates]:
   f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[];
  for(let j=0;j<x.length;j++){
   const coords=x[j],prefix=[0];
   for(let k=1;k<coords.length;k++)prefix.push(prefix.at(-1)+meters(coords[k-1],coords[k]));
   parts.set('knps2018:'+i+':'+j,{coords,prefix});
  }
 }
 const parent=original.nodes.map((_,i)=>i),find=n=>{
  while(parent[n]!==n){parent[n]=parent[parent[n]];n=parent[n]}return n;
 };
 const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
 for(const e of original.edges){
  if(!Number.isInteger(e.from)||!Number.isInteger(e.to)||
   e.from<0||e.to<0||e.from>=parent.length||e.to>=parent.length||
   e.accessVerified!==false||e.routable!==false||!parts.has(e.sourceId))
   throw Error('Old KNPS source edge lineage is invalid');
  if(e.length_m>0&&e.from!==e.to)union(e.from,e.to);
 }
 const originCount=original.edges.length,oldEdges=original.edges,
  endpoints=[];
 for(const [sourceId,p]of parts)for(const vertex of [0,p.coords.length-1]){
  const coord=p.coords[vertex],node=original.nodes.findIndex(n=>
   n[0]===coord[0]&&n[1]===coord[1]);
  if(node<0)throw Error('Source endpoint missing from original graph');
  endpoints.push({sourceId,coord,node,vertex});
 }
 const precise=[],near=[],unique=new Set();
 for(const origin of endpoints){
  const hits=[],gap=[];
  for(let eid=0;eid<oldEdges.length;eid++){
   const e=oldEdges[eid];if(e.sourceId===origin.sourceId)continue;
   const part=parts.get(e.sourceId);
   if(!Number.isInteger(e.startVertex)||!Number.isInteger(e.endVertex)||
    e.startVertex<0||e.endVertex>=part.coords.length)throw Error('Original vertex lineage invalid');
   for(let k=e.startVertex;k<e.endVertex;k++){
    const hit=project(origin.coord,part.coords[k],part.coords[k+1]);
    if(!hit||hit.dist>2)continue;
    const s=part.prefix[k]-part.prefix[e.startVertex]+
      hit.t*(part.prefix[k+1]-part.prefix[k]);
    if(s<0.5||e.length_m-s<0.5)continue;
    const item={originNode:origin.node,originSource:origin.sourceId,
      sourceEdgeId:eid,sourceId:e.sourceId,segment:k,t:hit.t,distanceM:hit.dist,
      splitFromM:s,firstNode:e.from,lastNode:e.to};
    if(hit.dist<=TOL_M)hits.push(item);
    else gap.push(item);
   }
  }
  // A point crossing more than one original segment is ambiguous: do not join.
  const targets=[...new Set(hits.map(h=>h.sourceEdgeId))];
  if(targets.length===1){
   const eligible=hits.filter(h=>h.sourceEdgeId===targets[0]).sort((a,b)=>a.distanceM-b.distanceM);
   const hit=eligible[0];
   if(find(hit.originNode)!==find(hit.firstNode)&&!unique.has(hit.originNode+':'+hit.sourceEdgeId)){
    precise.push(hit);unique.add(hit.originNode+':'+hit.sourceEdgeId);
   }
  }
  gap.sort((a,b)=>a.distanceM-b.distanceM);
  if(gap.length)near.push({node:origin.node,target:gap[0].sourceId,
    distanceM:+gap[0].distanceM.toFixed(3)});
 }
 const edges=oldEdges.slice(),accepted=[];
 for(const item of precise.sort((a,b)=>a.distanceM-b.distanceM||
  a.originNode-b.originNode)){
  // A prior precise split may already have joined the same components.
  if(find(item.originNode)===find(item.firstNode))continue;
  const edge=oldEdges[item.sourceEdgeId];
  const first=Math.round(item.splitFromM*100)/100;
  const second=Math.round((edge.length_m-first)*100)/100;
  if(first<0.5||second<0.5)continue;
  const extra={accessVerified:false,routable:false,
   geometricContactOnly:true,sourceGeometry:'original',
   sourceOriginalEdgeId:item.sourceEdgeId};
  edges.push({from:edge.from,to:item.originNode,length_m:first,
   sourceId:edge.sourceId,startVertex:edge.startVertex,endVertex:item.segment+1,...extra});
  edges.push({from:item.originNode,to:edge.to,length_m:second,
   sourceId:edge.sourceId,startVertex:item.segment,endVertex:edge.endVertex,...extra});
  union(item.originNode,edge.from);
  accepted.push({fromNode:item.originNode,sourceOriginalEdgeId:item.sourceEdgeId,
   appendedEdgeIds:[edges.length-2,edges.length-1],distanceM:+item.distanceM.toFixed(4),
   status:'source-endpoint-on-source-segment; passage unverified'});
 }
 const geometricComponents=new Set(parent.map((_,i)=>find(i))).size;
 const graph={...original,edges,summary:{...original.summary,edges:edges.length,
  geometricComponents,exactEndpointSegmentContacts:accepted.length,
  proximityEdgesCreated:0,physicalJunctionVerified:false,currentAccessVerified:false}};
 return Object.freeze({graph,originalEdgeCount:originCount,contacts:accepted,
  nearCandidates:near.filter(x=>x.distanceM>0.01).sort((a,b)=>a.distanceM-b.distanceM),
  warning:'Only exact 2018 source geometry contacts; current passage/access not verified'});
}
root.SanbakKnpsContactsV117=Object.freeze({version:117,enhance});
})(typeof window!=='undefined'?window:globalThis);
