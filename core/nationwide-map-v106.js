/* Sanbakmap v106 - base-map-free trail geometry presenter.
 * Source route lengths/topology are v102 originals; source DISPLAY lines are
 * the v101 historical 3m-simplified institution polylines, not navigable GPS.
 * No line segment is inserted to span a gap, mismatched route display FAILS CLOSED.
 */
(function(root){
'use strict';
const RAD=Math.PI/180,A=6378137,F=1/298.257222101,E2=F*(2-F),EP=E2/(1-E2),
 LON0=127.5*RAD,LAT0=38*RAD,K0=.9996;
function arc(lat){
 const q=E2,q2=q*q,q3=q2*q;
 return A*((1-q/4-3*q2/64-5*q3/256)*lat
 -(3*q/8+3*q2/32+45*q3/1024)*Math.sin(2*lat)
 +(15*q2/256+45*q3/1024)*Math.sin(4*lat)
 -(35*q3/3072)*Math.sin(6*lat));
}
const ARC0=arc(LAT0);
function to5179(pos){
 if(!Array.isArray(pos)||pos.length<2||!Number.isFinite(pos[0])||
 !Number.isFinite(pos[1])||pos[0]<124||pos[0]>132||pos[1]<32||pos[1]>40)
 throw Error('Invalid WGS84 historic trail coordinate');
 const lat=pos[1]*RAD,lon=pos[0]*RAD,s=Math.sin(lat),c=Math.cos(lat),
 tan=Math.tan(lat),N=A/Math.sqrt(1-E2*s*s),T=tan*tan,C=EP*c*c,D=(lon-LON0)*c;
 const x=1e6+K0*N*(D+(1-T+C)*D**3/6+
 (5-18*T+T*T+72*C-58*EP)*D**5/120);
 const y=2e6+K0*(arc(lat)-ARC0+N*tan*(D*D/2+
 (5-T+9*C+4*C*C)*D**4/24+
 (61-58*T+T*T+600*C-330*EP)*D**6/720));
 return [x,y];
}
function line(points){
 if(!Array.isArray(points)||points.length<2)return null;
 const xy=points.map(to5179),cumulative=[0];
 for(let i=1;i<xy.length;i++)cumulative[i]=cumulative[i-1]+Math.hypot(
  xy[i][0]-xy[i-1][0],xy[i][1]-xy[i-1][1]);
 if(!Number.isFinite(cumulative.at(-1))||cumulative.at(-1)<.01)return null;
 return {xy,cumulative,length:cumulative.at(-1)};
}
function nearestOnLine(part,point,frac){
 let best=null,dist=Infinity;
 const {xy,cumulative,length}=part;
 for(let i=0;i<xy.length-1;i++){
  const a=xy[i],b=xy[i+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;
  if(l2<1e-12)continue;
  const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/l2));
  const x=a[0]+t*dx,y=a[1]+t*dy,d=Math.hypot(point[0]-x,point[1]-y);
  const s=cumulative[i]+t*Math.sqrt(l2),fraction=s/length;
  // Coordinate mismatch dominates. Fraction is ONLY a tie-breaker for a
  // source part that revisits the same place; never a substitute for matching.
  const score=d+Math.min(2,Math.abs(fraction-frac)*.7);
  if(score<dist){best={point:[x,y],i,t,s,d};dist=score}
 }
 return best&&best.d<=7?best:null;
}
function clip(part,first,last,firstFrac,lastFrac,originalMeters){
 const a=nearestOnLine(part,first,firstFrac),b=nearestOnLine(part,last,lastFrac);
 if(!a||!b||b.s-a.s<.02)return null;
 const coords=[a.point];
 for(let i=a.i+1;i<=b.i;i++)coords.push(part.xy[i]);
 coords.push(b.point);
 const length=b.s-a.s;
 // Reject visibly implausible partial-line matches instead of inventing a
 // straight connector or drawing an entire unrelated source feature.
 if(originalMeters>.5&&(length<originalMeters*.62||length>originalMeters*1.3))
  return null;
 return coords;
}
function create(graph,kind,source){
 if(kind!=='forest'&&kind!=='knps')throw Error('Unsupported map source');
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))
  throw Error('Original topology required');
 if(kind==='forest'&&(
   graph.summary?.navigable!==false||graph.summary?.access_verified!==false||
   !Array.isArray(graph.source_parts)||!Array.isArray(source?.sourceFiles)||
   source?.agencyData?.schema!=='sanbak-national-institutional-lines-v1'||
   !/^\d{9}$/.test(String(source?.code))))
   throw Error('Forest geometry and its source provenance must be separate and historical');
 if(kind==='knps'&&(graph.routable!==false||graph.accessVerified!==false||
  source?.geojson?.type!=='FeatureCollection'||
  source.geojson.metadata?.source_file_date!=='2018-12-31'))
  throw Error('KNPS display source provenance is missing');
 const nodesXY=graph.nodes.map(p=>kind==='forest'?
  (Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)?[p[0]/10,p[1]/10]:
    (()=>{throw Error('Invalid EPSG5179 decimeter node')})()):to5179(p));
 const sourceLines=new Map(),paths=[],sourceNames=new Map();
 if(kind==='forest'){
  const records=source.agencyData.mountains?.[source.code]||[];
  if(!Array.isArray(records))throw Error('Institution mountain detail is unavailable');
  for(const r of records){
   if(!Array.isArray(r)||r.length!==9||!Array.isArray(r[5]))throw Error('Historical display part invalid');
   const [file,row,,,,parts]=r;
   if(typeof file!=='string'||!Number.isInteger(row))throw Error('Display source lineage missing');
   for(let i=0;i<parts.length;i++){
    let p;try{p=line(source.decodeLine(parts[i]))}catch(e){continue}
    if(!p)continue;
    const key=file+'|'+row+'|'+i;
    sourceLines.set(key,p);paths.push(p.xy);
   }
  }
  for(let i=0;i<graph.source_parts.length;i++){
   const rec=graph.source_parts[i];
   if(!Array.isArray(rec)||rec.length<3||!Number.isInteger(rec[0])||
    !Number.isInteger(rec[1])||!Number.isInteger(rec[2])||
    typeof source.sourceFiles[rec[0]]!=='string')throw Error('Invalid original source part');
   sourceNames.set(i,source.sourceFiles[rec[0]].split('/').at(-1)+'|'+rec[1]+'|'+rec[2]);
  }
 }else{
  for(let i=0;i<source.geojson.features.length;i++){
   const f=source.geojson.features[i],g=f.geometry;
   if(f.properties?.facility_type!=='탐방로')continue;
   if(f.properties.current_access_verified!==false||f.properties.routing_allowed!==false)
    throw Error('Unverified KNPS source cannot be promoted');
   const parts=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
   for(let j=0;j<parts.length;j++){
    const p=line(parts[j]);if(!p)continue;
    const key='knps2018:'+i+':'+j;
    sourceLines.set(key,p);paths.push(p.xy);
   }
  }
 }
 const edgeRefs=graph.edges.map((edge,i)=>{
  if(kind==='forest'){
   if(!Array.isArray(edge)||edge.length!==6||!sourceNames.has(edge[3]))
    throw Error('Unmatched forest graph segment');
   return {key:sourceNames.get(edge[3]),start:edge[4],end:edge[5],
    from:edge[0],to:edge[1],meters:edge[2]};
  }
  if(!edge||typeof edge.sourceId!=='string'||edge.routable!==false||
   edge.accessVerified!==false)throw Error('Unverified KNPS edge');
  return {key:edge.sourceId,start:edge.startVertex,end:edge.endVertex,
   from:edge.from,to:edge.to,meters:edge.length_m,
   provisionalGap:edge.provisionalGap===true,
   provisionalSplit:edge.provisionalSplit===true,
   previewPolyline:edge.previewPolyline||null};
 });
 const sourceOrder=new Map();
 for(let i=0;i<edgeRefs.length;i++){
  const e=edgeRefs[i],a=sourceOrder.get(e.key)||[];
  a.push({id:i,start:e.start,end:e.end,meters:e.meters});sourceOrder.set(e.key,a);
 }
 const fractions=new Map();
 for(const [key,edges]of sourceOrder){
  edges.sort((a,b)=>a.start-b.start);
  const full=edges.reduce((n,e)=>n+Math.max(0,e.meters),0);
  let progress=0;
  for(const e of edges){
   fractions.set(e.id,[full?progress/full:0,full?(progress+e.meters)/full:1]);
   progress+=e.meters;
  }
 }
 // Only a genuine original graph endpoint with a proven corresponding display
 // segment can be selected. "Nearby" lines and unverified source pieces
 // are never treated as connected walkable routes.
 const incident=Array.from({length:nodesXY.length},()=>[]);
 for(let i=0;i<edgeRefs.length;i++){
  const e=edgeRefs[i];
  if(e.from===e.to||!Number.isFinite(e.meters)||e.meters<=0)continue;
  if(e.from<0||e.from>=incident.length||e.to<0||e.to>=incident.length)
   throw Error('원본 선형 끝점의 노드 번호가 일치하지 않아');
  incident[e.from].push(i);incident[e.to].push(i);
 }
 const matchMemo=new Map();
 function edgeDisplayMatched(id){
  if(matchMemo.has(id))return matchMemo.get(id);
  const e=edgeRefs[id],part=sourceLines.get(e.key),fraction=fractions.get(id);
  const matched=!!(e.previewPolyline?.length>=2||(part&&fraction&&
   clip(part,nodesXY[e.from],nodesXY[e.to],fraction[0],fraction[1],e.meters)));
  matchMemo.set(id,matched);return matched;
 }
 function pickableNode(id){
  // Projected split points are internal graph nodes, NOT original source
  // waypoints. Only original institutional endpoints are user-selectable.
  return Number.isInteger(id)&&id>=0&&id<incident.length&&
   (kind!=='knps'||!Number.isInteger(graph.originalNodeCount)||
    id<graph.originalNodeCount)&&incident[id].some(edgeDisplayMatched);
 }
 function overlay(plan){
  const empty={paths:[],provisionalPaths:[],totalEdges:0,drawnEdges:0,unmatchedEdges:0,
   displayAccuracy:'historic-display-simplification',navigable:false};
  if(plan?.status!=='geometry_preview_only'||!Array.isArray(plan.legs))return empty;
  const paths=[],provisionalPaths=[],seen=new Set();
  let totalEdges=0,drawnEdges=0,unmatchedEdges=0;
  for(const leg of plan.legs){
   if(!Array.isArray(leg.nodeIds)||!Array.isArray(leg.edgeIds)||
     leg.nodeIds.length!==leg.edgeIds.length+1)throw Error('Unverifiable route path');
   for(let i=0;i<leg.edgeIds.length;i++){
    const eid=leg.edgeIds[i],from=leg.nodeIds[i],to=leg.nodeIds[i+1],e=edgeRefs[eid];
    if(!e||(from!==e.from||to!==e.to)&&(from!==e.to||to!==e.from))
     throw Error('Plan references an unrelated segment');
    totalEdges++;
    // Repeated edge in return trips is valid but only needs one visual layer.
    const reused=seen.has(eid);seen.add(eid);
    if(e.previewPolyline){
     if(!Array.isArray(e.previewPolyline)||e.previewPolyline.length<2)
      throw Error('Provisional source-line geometry missing');
     const coords=e.previewPolyline.map(to5179);
     drawnEdges++;
     if(!reused)(e.provisionalGap?provisionalPaths:paths).push(coords);
     continue;
    }
    const part=sourceLines.get(e.key),frac=fractions.get(eid);
    if(!part||!frac){unmatchedEdges++;continue}
    const coords=clip(part,nodesXY[e.from],nodesXY[e.to],frac[0],frac[1],e.meters);
    if(!coords){unmatchedEdges++;continue}
    drawnEdges++;if(!reused)paths.push(coords);
   }
  }
  return {paths,provisionalPaths,totalEdges,drawnEdges,unmatchedEdges,
   displayAccuracy:'historic-display-simplification',navigable:false};
 }
 return Object.freeze({kind,paths,nodesXY,overlay,pickableNode,
  historical:true,navigable:false,baseLineCount:paths.length});
}
root.SanbakLineMapV106=Object.freeze({version:106,to5179,create});
})(typeof window!=='undefined'?window:globalThis);
