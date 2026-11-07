/* Sanbakmap topological geometry audit v102.
 * Full-precision source vertices ONLY. Coincident coordinate != authorized passage.
 * Never infer links across gaps, 2-D intersections, or another mountain code.
 * No automatic routing from this module.
 */
(function(root){
'use strict';
const CELL_M=0.1,MAX_GAP_REVIEW_M=2;
const validXY=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=32&&p[1]<=40;
function meters(a,b) {
 const R=6371008.8,rad=Math.PI/180,lat=(a[1]+b[1])*rad/2;
 const dx=(a[0]-b[0])*rad*Math.cos(lat),dy=(a[1]-b[1])*rad;
 return 2*R*Math.asin(Math.min(1,Math.hypot(dx,dy)/2));
}
function historicKnps(geojson){
 if(geojson?.type!=='FeatureCollection'||geojson.metadata?.source_file_date!=='2018-12-31'||!Array.isArray(geojson.features))
  throw Error('KNPS geometry provenance is missing');
 const output=[];
 for(let i=0;i<geojson.features.length;i++){
  const f=geojson.features[i],p=f.properties||{};
  if(p.facility_type!=='탐방로')continue;
  if(p.current_access_verified!==false||p.routing_allowed!==false)throw Error('Unexpected KNPS source access assertion');
  const g=f.geometry,segments=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
  for(let part=0;part<segments.length;part++)output.push({
   sourceId:'knps2018:'+i+':'+part,
   recordId:String(p.original_facility_id||''),
   coords:segments[part],
   sourceGeometry:'original',
   accessVerified:false,routable:false
  });
 }
 if(output.length<1)throw Error('No KNPS trail parts');
 return output;
}
function build(lines,opts={}){
 if(opts.sourceGeometry!=='original')throw Error('Topology requires full-precision original geometry');
 if(!Array.isArray(lines)||!lines.length||lines.length>100000)throw Error('Invalid source line array');
 const parts=lines.map((line,i)=>{
  if(line.sourceGeometry!=='original'||line.accessVerified!==false||line.routable!==false)
   throw Error('Unverified geometry must not be treated as an authorized route');
  if(!Array.isArray(line.coords)||line.coords.length<2||line.coords.length>300000||!line.coords.every(validXY))
   throw Error('Malformed original trail geometry');
  return {id:String(line.sourceId||'source:'+i),coords:line.coords.map(p=>[p[0],p[1]]),sourceId:String(line.sourceId||'source:'+i)};
 });
 // One local metric grid per mountain. Only exact shared original vertices are joined.
 const firstLatitude=parts[0].coords[0][1],cx=111320*Math.cos(firstLatitude*Math.PI/180),cy=111195;
 const key=p=>Math.round(p[0]*cx/CELL_M)+':'+Math.round(p[1]*cy/CELL_M);
 const endpointIndex=new Map(),endpoints=[],split=parts.map(p=>new Set([0,p.coords.length-1]));
 for(let i=0;i<parts.length;i++){
  const pts=parts[i].coords;
  for(const v of [0,pts.length-1]){
   const p=pts[v],k=key(p);
   if(!endpointIndex.has(k))endpointIndex.set(k,[]);
   endpointIndex.get(k).push({part:i,vertex:v,coord:p});
   endpoints.push({part:i,coord:p,key:k});
  }
 }
 let sharedEnds=0,interiorMatches=0;
 for(const entries of endpointIndex.values())if(new Set(entries.map(e=>e.part)).size>=2)sharedEnds++;
 for(let i=0;i<parts.length;i++){
  const pts=parts[i].coords;
  for(let v=1;v<pts.length-1;v++){
   const matches=endpointIndex.get(key(pts[v]));
   if(matches?.some(p=>p.part!==i&&meters(p.coord,pts[v])<=0.15)){
    split[i].add(v);interiorMatches++;
   }
  }
 }
 const nodeMap=new Map(),nodes=[],edges=[];
 function node(coord){
  const k=key(coord);
  if(!nodeMap.has(k)){nodeMap.set(k,nodes.length);nodes.push([coord[0],coord[1]]);}
  return nodeMap.get(k);
 }
 for(let i=0;i<parts.length;i++){
  const pts=parts[i].coords,prefix=[0];
  for(let j=1;j<pts.length;j++)prefix[j]=prefix[j-1]+meters(pts[j-1],pts[j]);
  const junctions=[...split[i]].sort((a,b)=>a-b);
  for(let j=1;j<junctions.length;j++){
   const a=junctions[j-1],b=junctions[j],L=prefix[b]-prefix[a];
   if(L<=0.001)continue;
   edges.push({from:node(pts[a]),to:node(pts[b]),length_m:Math.round(L*100)/100,
     sourceId:parts[i].sourceId,startVertex:a,endVertex:b,accessVerified:false,routable:false});
  }
 }
 const parent=nodes.map((_,i)=>i);
 function find(a){while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a]}return a}
 function union(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a}
 for(const e of edges)union(e.from,e.to);
 const components=new Set(nodes.map((_,i)=>find(i))).size;
 let nearUnconnected=0;const nearExamples=[];
 for(let i=0;i<endpoints.length;i++)for(let j=i+1;j<endpoints.length;j++){
  const a=endpoints[i],b=endpoints[j];
  if(a.part===b.part||a.key===b.key)continue;
  const d=meters(a.coord,b.coord);
  if(d>0.15&&d<=MAX_GAP_REVIEW_M){
   nearUnconnected++;
   if(nearExamples.length<8)nearExamples.push([a.part,b.part,Math.round(d*100)/100]);
  }
 }
 const degree=Array(nodes.length).fill(0);
 for(const e of edges){degree[e.from]++;degree[e.to]++}
 return {schema:'sanbak-topology-geometric-v102',sourceGeometry:'original',sourceVerified:'historic-coordinate-identity-only',
   coordinateSystem:'EPSG:4326',accessVerified:false,routable:false,
   nodes,edges,
   summary:{parts:parts.length,sourceVertices:parts.reduce((n,x)=>n+x.coords.length,0),
    nodes:nodes.length,edges:edges.length,geometricComponents:components,
    sharedEndCells:sharedEnds,endpointInteriorMatches:interiorMatches,
    junctionDegree3plus:degree.filter(x=>x>=3).length,
    nearEndsReviewOnly:nearUnconnected,nearExamples,
    proximityEdgesCreated:0,physicalJunctionVerified:false,currentAccessVerified:false}};
}
root.SanbakTopologyV102=Object.freeze({version:102,historicKnps,build,meters});
})(typeof window!=='undefined'?window:globalThis);
