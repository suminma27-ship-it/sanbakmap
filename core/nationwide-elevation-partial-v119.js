/* Sanbakmap v119 — draw only original DEM-supported trail portions.
 * Unknown 2018 GIS gaps remain blank in the chart; never invent their heights.
 * No claim of current access, legal passage, or safe navigation.
 */
(function(root){
'use strict';
function interpolate(samples,at){
 if(!samples?.length||at<samples[0][0]-.2||at>samples[samples.length-1][0]+.2)return null;
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i];
  if(at<=b[0]+.001){
   const t=Math.max(0,Math.min(1,(at-a[0])/(b[0]-a[0]||1)));
   return a[1]+(b[1]-a[1])*t;
  }
 }
 return samples[samples.length-1][1];
}
function profile(plan,original,planning,kind,code,data){
 if(plan?.status!=='geometry_preview_only'||!Array.isArray(plan.legs))
  return {status:'no_route',points:[],note:'계산된 경로가 없어'};
 if(!original?.edges||!planning?.edges||!data)
  return {status:'no_dem',points:[],note:'원본 DEM 자료가 없어'};
 root.SanbakElevationV107.checkDataset(data,original,kind,code);
 const segments=[],gaps=[];let total=0,coveredMeters=0,unknownMeters=0;
 for(const leg of plan.legs){
  if(!Array.isArray(leg.edgeIds)||!Array.isArray(leg.nodeIds)||
     leg.nodeIds.length!==leg.edgeIds.length+1)
   throw Error('계획 경로의 구간 ID 구조가 유효하지 않아');
  for(let i=0;i<leg.edgeIds.length;i++){
   const edgeId=leg.edgeIds[i],e=planning.edges[edgeId];
   if(!e)throw Error('계획 경로에 없는 간선 참조');
   const from=Array.isArray(e)?e[0]:e.from,to=Array.isArray(e)?e[1]:e.to;
   const meters=Array.isArray(e)?e[2]:e.length_m;
   const forward=leg.nodeIds[i]===from&&leg.nodeIds[i+1]===to;
   if(!forward&&!(leg.nodeIds[i]===to&&leg.nodeIds[i+1]===from))
    throw Error('경로 방향이 GIS 연결망과 일치하지 않아');
   if(!Number.isFinite(meters)||meters<=0)throw Error('계획 경로 길이가 올바르지 않아');
   let sampleId=null,start=0,end=meters;
   if(!e.provisionalGap&&!e.geometricContactOnly&&!e.provisionalSplit&&
      edgeId<original.edges.length){
    sampleId=edgeId;
   }else if(e.provisionalSplit&&!e.provisionalGap&&
      Number.isInteger(e.sourceOriginalEdgeId)&&
      Number.isFinite(e.sourceStartMeters)&&Number.isFinite(e.sourceEndMeters)){
    sampleId=e.sourceOriginalEdgeId;
    start=e.sourceStartMeters;end=e.sourceEndMeters;
   }
   const sourceEdge=sampleId!==null?original.edges[sampleId]:null;
   const sourceMeters=Array.isArray(sourceEdge)?sourceEdge[2]:sourceEdge?.length_m;
   const samples=sampleId!==null?data.edgeSamples[String(sampleId)]:null;
   let measured=null;
   if(samples&&Number.isFinite(sourceMeters)&&start>=-.1&&end<=sourceMeters+.1&&
      end>start&&Math.abs((end-start)-meters)<Math.max(.2,meters*.005)){
    const begin=interpolate(samples,Math.max(0,start));
    const finish=interpolate(samples,Math.min(sourceMeters,end));
    if(Number.isFinite(begin)&&Number.isFinite(finish)){
     const points=[[start,begin],
      ...samples.filter(p=>p[0]>start+.01&&p[0]<end-.01),
      [end,finish]];
     if(!forward)points.reverse();
     measured=points.map(p=>({
      distanceMeters:total+(forward?(p[0]-start):(end-p[0]))/(end-start)*meters,
      elevationMeters:p[1]
     }));
    }
   }
   if(measured?.length>=2){
    segments.push(measured);
    coveredMeters+=meters;
   }else{
    gaps.push({fromMeters:total,toMeters:total+meters,provisional:!!e.provisionalGap});
    unknownMeters+=meters;
   }
   total+=meters;
  }
 }
 if(Math.abs(total-plan.distanceMeters)>Math.max(1,plan.legs.length*.1))
  throw Error('계산 경로 거리와 DEM 구간 길이가 일치하지 않아');
 if(!segments.length)return {status:'missing_samples',points:[],totalMeters:total,
  note:'원본 DEM 자료로 확인되는 경로 구간이 없어 고도그래프를 표시하지 않아'};
 return {status:gaps.length?'partial':'ready_partial',points:[],segments,gaps,totalMeters:total,
  coveredMeters,unknownMeters,
  note:'원본 DEM이 확인되는 구간만 표시 · 주황 추정접합과 자료 누락 구간은 고도 공백 · 현장 통행 미확인'};
}
root.SanbakElevationPartialV119=Object.freeze({version:119,profile});
})(typeof window!=='undefined'?window:globalThis);
