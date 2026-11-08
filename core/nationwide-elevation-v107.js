/* Sanbakmap v107: original-edge DEM profile contract.
 * No interpolation across missing edges, no point-coordinate guesses,
 * and no synthetic elevation fallback.
 */
(function(root){
'use strict';
const ORIGIN=Object.freeze({
 forest:'7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a',
 knps:'a4a378233fe491b35bcdc157420d58ca7f9e9f57e1c6af4399dbafcad6ba9baf'
});
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const safeCode=x=>/^\d{9}$/.test(String(x));
function checkIndex(value){
 if(value?.schema!=='sanbak-elevation-index-v107'||value.version!==107||
    value.policy!=='original-source-edge-samples-only'||
    !value.mountains||typeof value.mountains!=='object'||Array.isArray(value.mountains))
  throw Error('고도 색인 형식이 일치하지 않아');
 for(const [key,entry] of Object.entries(value.mountains)){
  if(!/^\d{9}:(forest|knps)$/.test(key)||
     !entry||typeof entry.path!=='string'||
     !/^\.\/data\/nationwide-elevation\/[a-zA-Z0-9_-]+\.json$/.test(entry.path))
    throw Error('고도 색인 위치가 안전하지 않아');
 }
 return value;
}
function edgeData(e,kind){
 return kind==='forest'&&Array.isArray(e)&&e.length===6?{from:e[0],to:e[1],meters:e[2]}:
 kind==='knps'&&e&&typeof e==='object'&&e.routable===false&&e.accessVerified===false?
 {from:e.from,to:e.to,meters:e.length_m}:null;
}
function checkDataset(data,graph,kind,code){
 const dem=data?.dem;
 const verifiedRaster=dem?.sampleMethod==='georeferenced-dem-to-original-edge'&&
  Number.isFinite(dem.resolutionMeters)&&dem.resolutionMeters>0&&dem.resolutionMeters<=100;
 const vertexElevation=dem?.sampleMethod==='source-geojson-dem-vertices-to-original-edge'&&
  dem.hashKind==='annotated-geojson-archive'&&dem.sourceRasterResolutionVerified===false&&
  dem.resolutionMeters===null&&
  dem.verticalDatum==='원본 DEM 수직기준 미기재';

 if(!safeCode(code)||(kind!=='forest'&&kind!=='knps')||
    data?.schema!=='sanbak-original-edge-dem-v107'||data.mountainCode!==String(code)||
    data.sourceKind!==kind||data.graphArchiveSHA256!==ORIGIN[kind]||
    data.nodeCount!==graph?.nodes?.length||data.edgeCount!==graph?.edges?.length||
    !Array.isArray(graph?.edges)||!Array.isArray(graph?.nodes)||
    !data.dem||!hash(data.dem.sha256)||typeof data.dem.name!=='string'||
    !data.dem.name.trim()||!data.dem.verticalDatum||
    data.dem.units!=='m'||!(verifiedRaster||vertexElevation)||
    data.accessVerified!==false||
    !data.edgeSamples||typeof data.edgeSamples!=='object'||Array.isArray(data.edgeSamples))
    throw Error('고도자료 원본·수직기준·원본 구간 대응 정보 검증 실패');
 for(const [key,pts] of Object.entries(data.edgeSamples)){
  if(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=graph.edges.length||
     !Array.isArray(pts)||pts.length<2||pts.length>50000)throw Error('원본 구간의 고도 샘플 손상');
  const e=edgeData(graph.edges[Number(key)],kind);
  if(!e||!Number.isFinite(e.meters)||e.meters<=0)throw Error('고도 샘플의 원본 구간이 유효하지 않아');
  let previous=-1;
  for(const p of pts){
   if(!Array.isArray(p)||p.length!==2||
      !Number.isFinite(p[0])||!Number.isFinite(p[1])||
      p[1]<-500||p[1]>9000||
      p[0]<0||p[0]>e.meters+.1||p[0]<=previous)
      throw Error('고도 샘플 좌표/높이 손상');
   previous=p[0];
  }
  if(Math.abs(pts[0][0])>.05||Math.abs(pts.at(-1)[0]-e.meters)>.05)
   throw Error('구간 시작/끝 고도 샘플이 일치하지 않아');
 }
 return data;
}
function profile(plan,graph,kind,code,data){
 if(plan?.status!=='geometry_preview_only'||!Array.isArray(plan.legs))
  return {status:'no_route',points:[],note:'연결된 시험 코스를 먼저 계산해 줘'};
 if(!data)return {status:'no_dem',points:[],note:'이 산에 등록된 원본 대조 DEM 고도 샘플이 없어'};
 checkDataset(data,graph,kind,code);
 let total=0,previous=null,up=0,down=0;
 const points=[];
 for(const leg of plan.legs){
  if(!Array.isArray(leg.edgeIds)||!Array.isArray(leg.nodeIds)||
    leg.nodeIds.length!==leg.edgeIds.length+1)
    throw Error('경유지 코스 원본 구간 대조 실패');
  for(let i=0;i<leg.edgeIds.length;i++){
   const id=leg.edgeIds[i],e=edgeData(graph.edges[id],kind);
   if(!e||!Number.isFinite(e.meters)||e.meters<=0)
    throw Error('알 수 없는 고도 그래프 원본 구간');
   const a=leg.nodeIds[i],b=leg.nodeIds[i+1],forward=a===e.from&&b===e.to;
   if(!forward&&!(a===e.to&&b===e.from))throw Error('원본 그래프 경로 일치 실패');
   const samples=data.edgeSamples[String(id)];
   if(!samples)return {status:'incomplete',points:[],missingEdge:id,
    note:'경로에 DEM 표본이 없는 원본 구간이 있어 고도그래프를 생략해'};
   const oriented=forward?samples:samples.slice().reverse().map(p=>[e.meters-p[0],p[1]]);
   for(let j=0;j<oriented.length;j++){
    const p=oriented[j],d=total+p[0],h=p[1];
    if(previous&&Math.abs(d-previous.distanceMeters)<.06){
     if(Math.abs(h-previous.elevationMeters)>2)
      return {status:'inconsistent',points:[],note:'이어진 노드의 DEM 높이가 서로 달라 고도그래프를 생략해'};
     continue;
    }
    if(previous){
     const rise=h-previous.elevationMeters;
     if(rise>0)up+=rise;else down-=rise;
    }
    previous={distanceMeters:d,elevationMeters:h};points.push(previous);
   }
   total+=e.meters;
  }
 }
 if(points.length<2||Math.abs(total-plan.distanceMeters)>1)
  throw Error('원본 코스 거리와 고도 표본 거리 불일치');
 return {status:'ready',points,totalMeters:total,
  ascentMeters:up,descentMeters:down,
  sourceName:data.dem.name,verticalDatum:data.dem.verticalDatum,
  resolutionMeters:data.dem.resolutionMeters,
  sampleMethod:data.dem.sampleMethod,
  sampleSpacingMeters:data.dem.sampleSpacingMeters||90,
  rasterSourceVerified:data.dem.sampleMethod==='georeferenced-dem-to-original-edge',
  previewOnly:true,accessVerified:false};
}
root.SanbakElevationV107=Object.freeze({version:107,checkIndex,checkDataset,profile});
})(typeof window!=='undefined'?window:globalThis);
