/* Sanbakmap v124 — reusable source-geometry contact normalizer.
 * Builds plan-only edges from closest source-line segments even when two
 * source features are ALREADY connected by a distant graph detour.
 * Small coordinate gaps are unverified passage candidates, NOT official trails.
 * Original source edges, DEM IDs and underlying geometry are never replaced.
 * Adapter: original-source objects (KNPS) and metric source polyline parts.
 */
(function(root){
'use strict';
const R=6371008.8,RAD=Math.PI/180;
const key=(a,b)=>a<b?a+'|'+b:b+'|'+a;
const projection=(P,A,B)=>{
 const x=B[0]-A[0],y=B[1]-A[1],len=x*x+y*y;
 if(len<=1e-12)return null;
 const t=Math.max(0,Math.min(1,((P[0]-A[0])*x+(P[1]-A[1])*y)/len));
 const q=[A[0]+x*t,A[1]+y*t];
 return {t,q,d:Math.hypot(q[0]-P[0],q[1]-P[1])};
};
function closest(A,B,C,D){
 const cand=[];
 for(const [p,t,one]of [[A,0,true],[B,1,true]]){
  const h=projection(p,C,D);if(h)cand.push({d:h.d,t,u:h.t,p,q:h.q});
 }
 for(const [q,u]of [[C,0,false],[D,1,false]]){
  const h=projection(q,A,B);if(h)cand.push({d:h.d,t:h.t,u,p:h.q,q});
 }
 const r=[B[0]-A[0],B[1]-A[1]],s=[D[0]-C[0],D[1]-C[1]],
  denom=r[0]*s[1]-r[1]*s[0];
 if(Math.abs(denom)>1e-8){
  const x=C[0]-A[0],y=C[1]-A[1],
   t=(x*s[1]-y*s[0])/denom,u=(x*r[1]-y*r[0])/denom;
  if(t>=0&&t<=1&&u>=0&&u<=1)return {d:0,t,u,p:[A[0]+t*r[0],A[1]+t*r[1]],q:[C[0]+u*s[0],C[1]+u*s[1]]};
 }
 cand.sort((x,y)=>x.d-y.d);return cand[0]||null;
}
const merc=p=>[p[0]*R*RAD*Math.cos(38*RAD),p[1]*R*RAD];
function knpsParts(geo){
 if(geo?.metadata?.source_file_date!=='2018-12-31'||
  geo?.metadata?.source_zip_sha256!=='a4a378233fe491b35bcdc157420d58ca7f9e9f57e1c6af4399dbafcad6ba9baf')
  throw Error('KNPS source provenance mismatch');
 const parts=[];
 for(let i=0;i<geo.features.length;i++){
  const f=geo.features[i];if(f.properties?.facility_type!=='탐방로')continue;
  if(f.properties.current_access_verified!==false||f.properties.routing_allowed!==false)
   throw Error('Historical source is not verified as open');
  const pieces=f.geometry.type==='LineString'?[f.geometry.coordinates]:
   f.geometry.type==='MultiLineString'?f.geometry.coordinates:[];
  for(let j=0;j<pieces.length;j++)parts.push({id:'knps2018:'+i+':'+j,coords:pieces[j]});
 }
 return parts;
}
function enhance(planning,original,parts,{maxGapMeters=35,toMetric=merc}={}){
 if(planning?.schema!=='sanbak-topology-geometric-v102'||planning?.routable!==false||
  planning?.accessVerified!==false||planning?.summary?.physicalJunctionVerified!==false||
  original?.sourceGeometry!=='original'||original?.accessVerified!==false||
  !Array.isArray(original.edges)||!Array.isArray(planning.edges)||
  !Array.isArray(parts)||!Number.isFinite(maxGapMeters)||
  maxGapMeters<=0||maxGapMeters>50)throw Error('Source geometry audit unavailable');
 const originalEdges=original.edges.map((e,id)=>({
  id,sourceId:e.sourceId,startVertex:e.startVertex,endVertex:e.endVertex,
  from:e.from,to:e.to,length_m:e.length_m
 }));
 if(originalEdges.some(e=>typeof e.sourceId!=='string'||!Number.isFinite(e.length_m)||
  !Number.isInteger(e.startVertex)||!Number.isInteger(e.endVertex)))
  throw Error('Original-source lineage adapter required');
 const source=new Map();
 for(const item of parts){
  if(typeof item.id!=='string'||!Array.isArray(item.coords)||item.coords.length<2)
   throw Error('Invalid source polyline');
  const world=item.coords.map(toMetric),prefix=[0],xs=world.map(p=>p[0]),ys=world.map(p=>p[1]);
  for(let i=1;i<world.length;i++)prefix[i]=prefix[i-1]+Math.hypot(
   world[i][0]-world[i-1][0],world[i][1]-world[i-1][1]);
  source.set(item.id,{id:item.id,coords:item.coords,world,prefix,
   bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]});
 }
 const prior=new Set();
 for(const e of planning.edges)if(e.provisionalGap&&
  Number.isInteger(e.sourceOriginalEdgeId)&&originalEdges[e.sourceOriginalEdgeId])
  prior.add(key(e.sourceId,originalEdges[e.sourceOriginalEdgeId].sourceId));
 const candidates=[],all=[...source.values()];
 for(let a=0;a<all.length;a++)for(let b=a+1;b<all.length;b++){
  const x=all[a],y=all[b],K=key(x.id,y.id);
  if(prior.has(K))continue;
  const box=(u,v)=>Math.max(0,u[0]-v[2],v[0]-u[2]);
  const dx=box(x.bounds,y.bounds),
   dy=Math.max(0,x.bounds[1]-y.bounds[3],y.bounds[1]-x.bounds[3]);
  if(Math.hypot(dx,dy)>maxGapMeters)continue;
  let best=null;
  for(let i=0;i<x.world.length-1;i++){
   const A=x.world[i],B=x.world[i+1];
   if(Math.max(A[0],B[0])+maxGapMeters<y.bounds[0]||
    Math.min(A[0],B[0])-maxGapMeters>y.bounds[2]||
    Math.max(A[1],B[1])+maxGapMeters<y.bounds[1]||
    Math.min(A[1],B[1])-maxGapMeters>y.bounds[3])continue;
   for(let j=0;j<y.world.length-1;j++){
    const C=y.world[j],D=y.world[j+1];
    if(Math.max(A[0],B[0])+maxGapMeters<Math.min(C[0],D[0])||
     Math.min(A[0],B[0])-maxGapMeters>Math.max(C[0],D[0])||
     Math.max(A[1],B[1])+maxGapMeters<Math.min(C[1],D[1])||
     Math.min(A[1],B[1])-maxGapMeters>Math.max(C[1],D[1]))continue;
    const p=closest(A,B,C,D);
    if(p&&(!best||p.d<best.d-1e-6))best={...p,i,j};
   }
  }
  // No guess at 2-D crossings: they may be bridges or tunnels.
  // Exact shared vertices are handled separately by v122.
  if(best&&best.d>.05&&best.d<=maxGapMeters)
   candidates.push({a:x.id,b:y.id,...best});
 }
 candidates.sort((a,b)=>a.d-b.d);
 const nodes=planning.nodes.map(p=>p.slice()),edges=planning.edges.slice(),cuts=new Map(),links=[];
 const measure=(a,b)=>{const A=toMetric(a),B=toMetric(b);return Math.hypot(A[0]-B[0],A[1]-B[1])};
 function addCut(edgeId,node,s){
  if(!cuts.has(edgeId))cuts.set(edgeId,[]);
  cuts.get(edgeId).push({node,s});
 }
 // Keep all original cut nodes so the new cut chain can connect to v117–122 splits.
 for(const e of planning.edges){
  if(!e.provisionalSplit||!Number.isInteger(e.sourceOriginalEdgeId))continue;
  addCut(e.sourceOriginalEdgeId,e.from,e.sourceStartMeters);
  addCut(e.sourceOriginalEdgeId,e.to,e.sourceEndMeters);
 }
 function position(sourceId,segment,t){
  const part=source.get(sourceId);
  if(!part)return null;
  const length=part.prefix[segment]+t*(part.prefix[segment+1]-part.prefix[segment]);
  const edge=originalEdges.find(e=>e.sourceId===sourceId&&
   length>=part.prefix[e.startVertex]-.1&&length<=part.prefix[e.endVertex]+.1);
  if(!edge)return null;
  const src=part.prefix[edge.endVertex]-part.prefix[edge.startVertex];
  const s=(length-part.prefix[edge.startVertex])*edge.length_m/src;
  const coord=[part.coords[segment][0]+(part.coords[segment+1][0]-part.coords[segment][0])*t,
   part.coords[segment][1]+(part.coords[segment+1][1]-part.coords[segment][1])*t];
  const old=[{node:edge.from,s:0},{node:edge.to,s:edge.length_m},...(cuts.get(edge.id)||[])];
  const existing=old.find(x=>Math.abs(x.s-s)<.08&&measure(nodes[x.node],coord)<.15);
  if(existing)return {node:existing.node,edge:edge.id,s:existing.s};
  const node=nodes.length;nodes.push(coord);addCut(edge.id,node,s);
  return {node,edge:edge.id,s};
 }
 for(const item of candidates){
  const from=position(item.a,item.i,item.t),to=position(item.b,item.j,item.u);
  if(!from||!to||from.node===to.node)continue;
  // Distance is taken from source geometry, not a guessed route detour.
  links.push({from:from.node,to:to.node,meters:item.d,
   a:item.a,b:item.b,targetEdge:to.edge});
 }
 function clip(part,start,end){
  const {coords,prefix}=part;
  const at=m=>{
   if(m<=0)return coords[0].slice();
   for(let i=1;i<prefix.length;i++)if(m<=prefix[i]+1e-7){
    const t=Math.max(0,Math.min(1,(m-prefix[i-1])/(prefix[i]-prefix[i-1]||1)));
    return [coords[i-1][0]+(coords[i][0]-coords[i-1][0])*t,
     coords[i-1][1]+(coords[i][1]-coords[i-1][1])*t];
   }
   return coords.at(-1).slice();
  };
  const output=[at(start)];
  for(let i=1;i<prefix.length-1;i++)if(prefix[i]>start+.001&&prefix[i]<end-.001)
   output.push(coords[i].slice());
  output.push(at(end));return output;
 }
 let splits=0;
 for(const [id,list]of cuts){
  const edge=originalEdges[id],part=source.get(edge.sourceId);if(!part)continue;
  const entries=[{node:edge.from,s:0},...list,
   {node:edge.to,s:edge.length_m}].filter(x=>Number.isFinite(x.s)&&
    x.s>=-.2&&x.s<=edge.length_m+.2).sort((a,b)=>a.s-b.s||a.node-b.node);
  const unique=[];
  for(const x of entries){
   if(unique.length&&Math.abs(unique.at(-1).s-x.s)<.05&&
    (unique.at(-1).node===x.node||measure(nodes[unique.at(-1).node],nodes[x.node])<.05))continue;
   unique.push(x);
  }
  const begin=part.prefix[edge.startVertex],span=part.prefix[edge.endVertex]-begin;
  for(let i=1;i<unique.length;i++){
   const a=unique[i-1],b=unique[i];if(a.node===b.node||b.s-a.s<.05)continue;
   edges.push({from:a.node,to:b.node,length_m:+(b.s-a.s).toFixed(2),
    sourceId:edge.sourceId,startVertex:edge.startVertex,endVertex:edge.endVertex,
    accessVerified:false,routable:false,provisionalSplit:true,
    sourceOriginalEdgeId:id,sourceStartMeters:a.s,sourceEndMeters:b.s,
    previewPolyline:clip(part,begin+a.s/edge.length_m*span,
     begin+b.s/edge.length_m*span)});
   splits++;
  }
 }
 const connectors=[];
 for(const link of links){
  const d=+link.meters.toFixed(2);if(d<=0)continue;
  const id=edges.length;
  edges.push({from:link.from,to:link.to,length_m:d,sourceId:link.a,
   sourceOriginalEdgeId:link.targetEdge,startVertex:0,endVertex:1,
   accessVerified:false,routable:false,provisionalGap:true,
   previewPolyline:[nodes[link.from].slice(),nodes[link.to].slice()],
   sourceContact:'two source polylines closest points; route is unverified'});
  connectors.push({edgeId:id,fromNode:link.from,toNode:link.to,
   gapMeters:d,sourceIds:[link.a,link.b],status:'PLAN_ONLY_UNVERIFIED'});
 }
 const parent=nodes.map((_,i)=>i),find=i=>{
  while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i;
 };
 for(const e of edges)if(e.from!==e.to&&e.length_m>0)parent[find(e.from)]=find(e.to);
 const comps=new Set(parent.map((_,i)=>find(i))).size;
 const result={...planning,nodes,edges,summary:{...planning.summary,nodes:nodes.length,
  edges:edges.length,geometricComponents:comps,interiorContactCandidates:connectors.length,
  physicalJunctionVerified:false,currentAccessVerified:false}};
 return {graph:result,connectors,splits,candidates:candidates.length,
  source:'source-line closest points; all connections provisional, not access verified'};
}
root.SanbakGraphNormalizeV124=Object.freeze({version:124,enhance,knpsParts});
})(typeof window!=='undefined'?window:globalThis);
