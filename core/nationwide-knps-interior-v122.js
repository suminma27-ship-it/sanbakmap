/* Sanbakmap v122 — exact historical interior-vertex contacts for planning.
 * Shared literal source coordinates only, not arbitrary 2-D crossings or
 * near misses. Keep historical provenance, original edges and DEM intact.
 * Even identical GIS coordinates do not certify a passable/open junction.
 */
(function(root){
'use strict';
const RAD=Math.PI/180, R=6371008.8;
const metric=p=>[p[0]*RAD*R*Math.cos(38*RAD),p[1]*RAD*R];
const meters=(a,b)=>{const p=metric(a),q=metric(b);return Math.hypot(p[0]-q[0],p[1]-q[1])};
const key=p=>p[0]+'|'+p[1];
function enhance(planning,original,geo){
 if(planning?.schema!=='sanbak-topology-geometric-v102'||
  planning?.routable!==false||planning?.accessVerified!==false||
  planning?.summary?.physicalJunctionVerified!==false||
  original?.sourceGeometry!=='original'||original?.accessVerified!==false||
  !Array.isArray(original.edges)||!Array.isArray(planning.nodes)||
  geo?.metadata?.source_file_date!=='2018-12-31'||
  geo?.metadata?.source_zip_sha256!=='a4a378233fe491b35bcdc157420d58ca7f9e9f57e1c6af4399dbafcad6ba9baf')
  throw Error('Exact historical junction source mismatch');
 const parts=new Map(),seen=new Map();
 for(let i=0;i<geo.features.length;i++){
  const f=geo.features[i];if(f.properties?.facility_type!=='탐방로')continue;
  if(f.properties?.routing_allowed!==false||f.properties?.current_access_verified!==false)
   throw Error('Current passage is not verified');
  const rows=f.geometry?.type==='LineString'?[f.geometry.coordinates]:
   f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[];
  for(let j=0;j<rows.length;j++){
   const id='knps2018:'+i+':'+j,coords=rows[j],prefix=[0];
   for(let k=1;k<coords.length;k++)prefix[k]=prefix[k-1]+meters(coords[k-1],coords[k]);
   parts.set(id,{coords,prefix});
   for(let k=1;k<coords.length-1;k++){
    const token=key(coords[k]);if(!seen.has(token))seen.set(token,[]);
    seen.get(token).push({id,k,p:coords[k]});
   }
  }
 }
 const nodes=planning.nodes.map(p=>p.slice()),edges=planning.edges.slice(),
  nodeIds=new Map(nodes.map((p,i)=>[key(p),i])),breaks=new Map(),contacts=[];
 const insert=(id,node,s)=>{if(!breaks.has(id))breaks.set(id,[]);
  breaks.get(id).push({node,s})};
 for(const [token,rows] of seen){
  const sources=[...new Set(rows.map(x=>x.id))];
  if(sources.length<2)continue;
  const hits=[];
  for(const row of rows)for(let id=0;id<original.edges.length;id++){
   const edge=original.edges[id];if(edge.sourceId!==row.id||
    row.k<edge.startVertex||row.k>edge.endVertex)continue;
   const part=parts.get(row.id),total=part.prefix[edge.endVertex]-part.prefix[edge.startVertex];
   const s=(part.prefix[row.k]-part.prefix[edge.startVertex])/total*edge.length_m;
   if(s>.05&&s<edge.length_m-.05)hits.push({id,s});
  }
  if(!hits.length)continue;
  let node=nodeIds.get(token);
  if(!Number.isInteger(node)){node=nodes.length;nodes.push(rows[0].p.slice());nodeIds.set(token,node)}
  for(const hit of hits)insert(hit.id,node,hit.s);
  contacts.push({node,sourceIds:sources,coordinate:rows[0].p.slice()});
 }
 // Rebuild full source-coordinate chains alongside prior v118 split edges:
 // new shared nodes must join existing projected split nodes without detours.
 for(const edge of planning.edges){
  if(!edge?.provisionalSplit||!Number.isInteger(edge.sourceOriginalEdgeId)||
   !Number.isFinite(edge.sourceStartMeters)||!Number.isFinite(edge.sourceEndMeters)||
   !breaks.has(edge.sourceOriginalEdgeId))continue;
  insert(edge.sourceOriginalEdgeId,edge.from,edge.sourceStartMeters);
  insert(edge.sourceOriginalEdgeId,edge.to,edge.sourceEndMeters);
 }
 function slice(part,start,end){
  const {coords,prefix}=part;
  function point(at){
   if(at<=0)return coords[0].slice();
   for(let i=1;i<prefix.length;i++)if(at<=prefix[i]){
    const t=Math.max(0,Math.min(1,(at-prefix[i-1])/(prefix[i]-prefix[i-1]||1)));
    return [coords[i-1][0]+(coords[i][0]-coords[i-1][0])*t,
     coords[i-1][1]+(coords[i][1]-coords[i-1][1])*t];
   }
   return coords.at(-1).slice();
  }
  const result=[point(start)];
  for(let i=1;i<prefix.length-1;i++)if(prefix[i]>start+1e-6&&prefix[i]<end-1e-6)
   result.push(coords[i].slice());
  result.push(point(end));return result;
 }
 let addedEdges=0;
 for(const [id,items] of breaks){
  const originalEdge=original.edges[id],part=parts.get(originalEdge.sourceId);
  if(!part)throw Error('Original source edge lineage not found');
  const sorted=[{node:originalEdge.from,s:0},...items.filter(x=>x.s>.04&&x.s<originalEdge.length_m-.04),
   {node:originalEdge.to,s:originalEdge.length_m}].sort((a,b)=>a.s-b.s||a.node-b.node);
  const unique=[];
  for(const item of sorted){
   const last=unique.at(-1);
   if(last&&Math.abs(last.s-item.s)<.05&&
    (last.node===item.node||meters(nodes[last.node],nodes[item.node])<.01))continue;
   unique.push(item);
  }
  const origin=part.prefix[originalEdge.startVertex],
   span=part.prefix[originalEdge.endVertex]-origin;
  for(let i=1;i<unique.length;i++){
   const a=unique[i-1],b=unique[i],length=+(b.s-a.s).toFixed(2);
   if(a.node===b.node||length<.05)continue;
   edges.push({from:a.node,to:b.node,length_m:length,
    sourceId:originalEdge.sourceId,startVertex:originalEdge.startVertex,
    endVertex:originalEdge.endVertex,sourceOriginalEdgeId:id,
    sourceStartMeters:a.s,sourceEndMeters:b.s,
    geometricContactOnly:true,provisionalSplit:true,
    accessVerified:false,routable:false,
    previewPolyline:slice(part,origin+a.s/originalEdge.length_m*span,
     origin+b.s/originalEdge.length_m*span)});
   addedEdges++;
  }
 }
 const parent=nodes.map((_,i)=>i);
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
 for(const e of edges)if(e.from!==e.to&&e.length_m>0)parent[find(e.from)]=find(e.to);
 const components=new Set(parent.map((_,i)=>find(i))).size;
 const graph={...planning,nodes,edges,
  summary:{...planning.summary,nodes:nodes.length,edges:edges.length,
   geometricComponents:components,sharedInteriorCoordinateContacts:contacts.length,
   physicalJunctionVerified:false,currentAccessVerified:false}};
 return Object.freeze({graph,contacts,addedEdges,
  source:'literal original 2018 interior coordinate identity; passage unverified'});
}
root.SanbakKnpsInteriorV122=Object.freeze({version:122,enhance});
})(typeof window!=='undefined'?window:globalThis);
