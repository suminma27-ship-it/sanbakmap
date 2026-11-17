/* Sanbakmap Seoraksan source-line selector.
 * Splits ONLY at original vertices. A nearby gap never creates a new trail.
 * ≤1 m source contacts plus one evidence-specific 1.35 m bifurcation are preview-only,
 * not as proof of official legal passage or current opening.
 */
(function(root){
'use strict';
const R=6371008.8, RAD=Math.PI/180;
const distance=(a,b)=>{
 const lat1=a[1]*RAD,lat2=b[1]*RAD,dy=(b[1]-a[1])*RAD,dx=(b[0]-a[0])*RAD;
 const h=Math.sin(dy/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dx/2)**2;
 return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
};
/* Explicit historic-source bifurcation confirmed against original vertices.
 * KNPS 2018 trail no.4 internal vertex 55 and trail no.5 start 0 are 1.35 m apart.
 * This is only a map-selection preview join, NOT a current-access verification.
 * All other source contacts retain the default <=1m strict rule. */
const BISEONDAE_CONTACT=Object.freeze({
 a:'knps2018:18:0',aPoint:[128.4664658864698,38.162912892740344],
 b:'knps2018:21:0',bPoint:[128.46645049144692,38.16291369487476],
 maxGapMeters:2.1,anchorRadiusMeters:4
});
function canJoin(a,sourceA,b,sourceB,joinMeters=1){
 if(!Array.isArray(a)||!Array.isArray(b))return false;
 const gap=distance(a,b);
 if(gap<=joinMeters)return true;
 if(gap>BISEONDAE_CONTACT.maxGapMeters)return false;
 const c=BISEONDAE_CONTACT;
 return (sourceA===c.a&&sourceB===c.b&&
  distance(a,c.aPoint)<=c.anchorRadiusMeters&&distance(b,c.bPoint)<=c.anchorRadiusMeters)||
  (sourceA===c.b&&sourceB===c.a&&
  distance(a,c.bPoint)<=c.anchorRadiusMeters&&distance(b,c.aPoint)<=c.anchorRadiusMeters);
}
function build(geo,{maxMeters=650,joinMeters=1}={}){
 if(geo?.type!=='FeatureCollection'||!Array.isArray(geo.features)||
    !Number.isFinite(maxMeters)||maxMeters<50||maxMeters>3000||
    !Number.isFinite(joinMeters)||joinMeters<0||joinMeters>1)throw Error('설악산 원본/분할 정책 확인 실패');
 const parts=[];
 geo.features.forEach((f,i)=>{
  if(f.properties?.facility_type!=='탐방로')return;
  const pieces=f.geometry?.type==='LineString'?[f.geometry.coordinates]:
   f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[];
  pieces.forEach((coords,j)=>{
   if(!Array.isArray(coords)||coords.length<2||
      !coords.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&
       Number.isFinite(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=32&&p[1]<=40))
       throw Error('원본 탐방로 좌표 오류');
   const prefix=[0];
   for(let v=1;v<coords.length;v++)prefix.push(prefix.at(-1)+distance(coords[v-1],coords[v]));
   parts.push({sourceId:'knps2018:'+i+':'+j,featureIndex:i,partIndex:j,coords,prefix,
     properties:f.properties,meters:prefix.at(-1)});
  });
 });
 // Source endpoints can be touching another polyline's internal vertex.
 // General <=1m source contacts and only the known 1.35m Biseondae bifurcation.
 const tips=parts.flatMap(part=>[
  {sourceId:part.sourceId,p:part.coords[0]},
  {sourceId:part.sourceId,p:part.coords.at(-1)}
 ]);
 const segments=[];
 for(const part of parts){
  const cuts=new Set([0,part.coords.length-1]);let last=0;
  for(let i=1;i<part.coords.length-1;i++){
   if(part.prefix[i]-part.prefix[last]>=maxMeters){cuts.add(i);last=i;continue}
   if(tips.some(t=>t.sourceId!==part.sourceId&&canJoin(part.coords[i],part.sourceId,t.p,t.sourceId,joinMeters))){
     cuts.add(i);last=i;
   }
  }
  const idx=[...cuts].sort((a,b)=>a-b);
  for(let n=1;n<idx.length;n++){
   const from=idx[n-1],to=idx[n],meters=part.prefix[to]-part.prefix[from];
   if(meters<.05)continue;
   const coords=part.coords.slice(from,to+1);
   segments.push({id:part.sourceId+':'+from+'-'+to,sourceId:part.sourceId,
    featureIndex:part.featureIndex,partIndex:part.partIndex,
    vertexStart:from,vertexEnd:to,coords,meters,
    start:coords[0],end:coords.at(-1),parent:part});
  }
 }
 return {parts,segments,source:geo.metadata?.source_file_date||'unknown',joinMeters};
}
const endOf=item=>item.reverse?item.segment.start:item.segment.end;
const startOf=item=>item.reverse?item.segment.end:item.segment.start;
function append(route,segment,{joinMeters=1}={}){
 if(!Array.isArray(route)||!segment?.coords)return {ok:false,route,reason:'invalid'};
 if(route.some(item=>item.segment.id===segment.id))
  return {ok:false,route,reason:'duplicate'};
 if(!route.length)return {ok:true,route:[{segment,reverse:false}],reason:'first'};
 const last=endOf(route.at(-1));
 if(canJoin(last,route.at(-1).segment.sourceId,segment.start,segment.sourceId,joinMeters))
  return {ok:true,route:[...route,{segment,reverse:false}],reason:'joined'};
 if(canJoin(last,route.at(-1).segment.sourceId,segment.end,segment.sourceId,joinMeters))
  return {ok:true,route:[...route,{segment,reverse:true}],reason:'joined_reversed'};
 // When the first selected piece was pointing the wrong direction,
 // auto-reverse it only if this second segment shares its original start.
 if(route.length===1){
  const start=startOf(route[0]);
  if(canJoin(start,route[0].segment.sourceId,segment.start,segment.sourceId,joinMeters))
   return {ok:true,route:[{segment:route[0].segment,reverse:!route[0].reverse},
     {segment,reverse:false}],reason:'auto_reversed_first'};
  if(canJoin(start,route[0].segment.sourceId,segment.end,segment.sourceId,joinMeters))
   return {ok:true,route:[{segment:route[0].segment,reverse:!route[0].reverse},
     {segment,reverse:true}],reason:'auto_reversed_first'};
 }
 return {ok:false,route,reason:'not_connected'};
}
const reverse=route=>route.slice().reverse().map(item=>({segment:item.segment,reverse:!item.reverse}));
const total=route=>route.reduce((m,x)=>m+x.segment.meters,0);
root.SanbakSeorakSegments=Object.freeze({version:2,distance,canJoin,build,append,reverse,total,startOf,endOf});
})(typeof window!=='undefined'?window:globalThis);
