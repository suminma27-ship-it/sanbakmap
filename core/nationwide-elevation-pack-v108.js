/* Sanbakmap v108 — compact, source-edge-locked DEM sample decoder.
 * Each base64url string holds ZigZag / unsigned-LEB128 changes in decimetre
 * elevations. Distance samples are 0, 90m, ..., original edge endpoint.
 * No DEM height can be reconstructed for an absent edge.
 */
(function(root){
'use strict';
function rawBytes(value){
 if(typeof value!=='string'||!value||value.length>200000||
    !/^[A-Za-z0-9_-]+$/.test(value))throw Error('DEM 압축 표본 문자가 올바르지 않아');
 const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
 return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
}
function decodedHeights(encoded,expected){
 const b=rawBytes(encoded),out=[];let pos=0,previous=0;
 while(pos<b.length){
  let n=0,shift=0,ended=false;
  for(let k=0;k<5;k++){
   if(pos>=b.length)throw Error('압축 고도 표본 끝이 잘렸어');
   const v=b[pos++];n+=(v&127)*2**shift;
   if(n>0xffffffff)throw Error('압축 고도 표본 범위를 벗어났어');
   if(!(v&128)){ended=true;break}
   shift+=7;
  }
  if(!ended)throw Error('압축 고도 표본이 손상됐어');
  previous+=n%2?-(Math.floor(n/2)+1):Math.floor(n/2);
  if(previous<-5000||previous>90000)throw Error('고도 표본 값의 범위를 벗어났어');
  out.push(previous/10);
  if(out.length>expected)throw Error('표본 수가 원본 구간을 초과했어');
 }
 if(out.length!==expected)throw Error('표본 수와 원본 구간 길이가 달라');
 return out;
}
function edgeOf(raw,kind){
 if(kind==='knps'&&raw?.routable===false&&raw?.accessVerified===false)
  return [raw.from,raw.to,raw.length_m,raw.sourceId,raw.startVertex,raw.endVertex];
 if(kind==='forest'&&Array.isArray(raw)&&raw.length===6)
  return raw.slice();
 return null;
}
function expand(packed,graph,kind,code){
 if(packed?.schema!=='sanbak-original-edge-dem-packed-v108'||
    packed.mountainCode!==String(code)||packed.sourceKind!==kind||
    !graph||!Array.isArray(graph.edges)||!Array.isArray(graph.nodes)||
    packed.nodeCount!==graph.nodes.length||packed.edgeCount!==graph.edges.length||
    packed.spacingMeters!==90||packed.accessVerified!==false||
    !packed.samples||typeof packed.samples!=='object'||Array.isArray(packed.samples)||
    !packed.edgeIdentities||typeof packed.edgeIdentities!=='object'||Array.isArray(packed.edgeIdentities))
  throw Error('원본 GIS와 고도 표본 패키지가 맞지 않아');
 const keys=Object.keys(packed.samples),identityKeys=Object.keys(packed.edgeIdentities);
 if(!keys.length||keys.length>graph.edges.length||keys.length!==identityKeys.length||
    identityKeys.some(k=>!Object.hasOwn(packed.samples,k)))
  throw Error('고도 표본·원본 구간 식별자가 일치하지 않아');
 const samples={};
 for(const key of keys){
  if(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=graph.edges.length)
   throw Error('잘못된 원본 구간 번호');
  const e=edgeOf(graph.edges[Number(key)],kind);
  const proof=packed.edgeIdentities[key];
  if(!e||!Array.isArray(proof)||proof.length!==e.length||
     proof.some((v,i)=>v!==e[i])||!Number.isFinite(e[2])||e[2]<=0)
   throw Error('원본 경로 구간이 이전 DEM 추출 당시와 달라졌어');
  const len=e[2],count=Math.ceil(len/90)+1;
  const elevations=decodedHeights(packed.samples[key],count);
  const row=elevations.map((height,i)=>[i===count-1?len:i*90,height]);
  samples[key]=row;
 }
 return {schema:'sanbak-original-edge-dem-v107',
  mountainCode:packed.mountainCode,sourceKind:packed.sourceKind,
  graphArchiveSHA256:packed.graphArchiveSHA256,nodeCount:packed.nodeCount,
  edgeCount:packed.edgeCount,dem:packed.dem,accessVerified:false,
  edgeSamples:samples,status:packed.status};
}
root.SanbakElevationPackV108=Object.freeze({version:108,expand});
})(typeof window!=='undefined'?window:globalThis);
