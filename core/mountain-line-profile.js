/* Mountain source-line elevation profiles. No route graph, no snapping, no connectors. */
(function(root){
'use strict';
const R=6371008.8,DEG=Math.PI/180;
function lengthOf(coords){
 let sum=0;
 for(let i=1;i<coords.length;i++){
  const a=coords[i-1],b=coords[i],lat1=a[1]*DEG,lat2=b[1]*DEG;
  const dy=(b[1]-a[1])*DEG,dx=(b[0]-a[0])*DEG;
  const h=Math.sin(dy/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dx/2)**2;
  sum+=2*R*Math.asin(Math.min(1,Math.sqrt(h)));
 }
 return sum;
}
function decode(encoded,expected){
 if(typeof encoded!=='string'||!encoded||encoded.length>250000||!/^[\w-]+$/.test(encoded)||
   !Number.isInteger(expected)||expected<2||expected>50000)
  throw Error('고도표본 인코딩/개수 오류');
 const raw=root.atob(encoded.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-encoded.length%4)%4));
 const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 let pos=0,last=0;const out=[];
 while(pos<bytes.length){
  let n=0,shift=0,done=false;
  for(let i=0;i<5;i++){
   if(pos>=bytes.length)throw Error('잘린 고도표본');
   const byte=bytes[pos++];n+=(byte&127)*2**shift;
   if(!(byte&128)){done=true;break}
   shift+=7;
  }
  if(!done||n>0xffffffff)throw Error('손상된 고도표본');
  last+=n%2?-(Math.floor(n/2)+1):Math.floor(n/2);
  if(last<-5000||last>90000)throw Error('고도 값 범위 초과');
  out.push(last/10);
  if(out.length>expected)throw Error('표본 수 초과');
 }
 if(out.length!==expected)throw Error('표본 수 불일치');
 return out;
}
function profile(line,packed){
 const absent=note=>({status:'unavailable',note,points:[],distanceMeters:null});
 if(!line||!Array.isArray(line.coords)||line.coords.length<2)
  return absent('원본 등산로 선형 없음');
 if(line.sourceKind==='forest'&&line.multipart)
  return absent('여러 선형을 포함한 원본은 고도와 1:1 대응을 확인하지 못했어');
 if(!packed)return absent('이 산에 배포된 고도표본이 없어');
 if(packed.schema!=='sanbak-original-edge-dem-packed-v108'||
  packed.mountainCode!==line.mountainCode||packed.sourceKind!==line.sourceKind||
  packed.spacingMeters!==90||packed.accessVerified!==false||
  !packed.edgeIdentities||!packed.samples)
  return absent('원본 등산로와 고도표본 자료 형식이 맞지 않아');
 const target=line.sourceKind==='forest'?line.recordIndex:line.sourceId;
 const selected=Object.entries(packed.edgeIdentities)
  .filter(([id,proof])=>Array.isArray(proof)&&proof.length===6&&
    proof[3]===target&&Object.hasOwn(packed.samples,id))
  .sort((a,b)=>a[1][4]-b[1][4]);
 if(!selected.length)return absent('이 원본 등산로의 고도표본이 없어');
 const out=[];let total=0,endVertex=0;
 for(const [id,proof] of selected){
  const [from,to,metres,sourceId,start,end]=proof;
  if(!Number.isFinite(metres)||metres<=0||
   !Number.isInteger(start)||!Number.isInteger(end)||start!==endVertex||
   end<=start||end>=line.coords.length)
   return absent('고도표본과 원본 선형의 정점 순서가 다르거나 일부 누락됐어');
  const expected=Math.ceil(metres/90)+1;
  let heights;
  try{heights=decode(packed.samples[id],expected)}
  catch{return absent('원본 고도표본 디코딩에 실패했어')}
  for(let i=0;i<heights.length;i++){
   const distanceMeters=total+(i===heights.length-1?metres:i*90);
   const elevationMeters=heights[i];
   if(out.length&&Math.abs(distanceMeters-out.at(-1).distanceMeters)<.08){
    if(Math.abs(out.at(-1).elevationMeters-elevationMeters)>2)
     return absent('같은 원본 접점의 고도값이 일치하지 않아');
    continue;
   }
   out.push({distanceMeters,elevationMeters});
  }
  total+=metres;endVertex=end;
 }
 if(endVertex!==line.coords.length-1||out.length<2)
  return absent('원본 선형 끝까지 고도표본이 연속되지 않아');
 const geoLength=lengthOf(line.coords);
 // Forest line geometry is 3m-simplified; still reject gross ID mismatches.
 if(Math.abs(geoLength-total)>Math.max(70,total*.07))
  return absent('원본 선형 길이와 고도표본 길이가 일치하지 않아');
 return {status:'ready',points:out,distanceMeters:total,
  minimumMeters:Math.min(...out.map(x=>x.elevationMeters)),
  maximumMeters:Math.max(...out.map(x=>x.elevationMeters)),
  sourceMethod:packed.dem?.sampleMethod||'원본 DEM 표본',
  rasterResolutionVerified:packed.dem?.sourceRasterResolutionVerified===true||
   (packed.dem?.sampleMethod==='georeferenced-dem-to-original-edge'),
  verticalDatum:packed.dem?.verticalDatum||'미기재'};
}
function forestLines(raw,code,decodeLine){
 if(raw?.schema!=='sanbak-national-institutional-lines-v1'||
  raw?.agency!=='산림청'||!Array.isArray(raw.mountains?.[code]))
  throw Error('이 산의 기관 수록 원본 등산로가 없어');
 return raw.mountains[code].flatMap((row,index)=>{
  if(!Array.isArray(row)||row.length!==9||!Array.isArray(row[5]))throw Error('원본 레코드 형식 오류');
  return row[5].map((str,partIndex)=>({
   id:'forest:'+code+':'+index+':'+partIndex,mountainCode:code,sourceKind:'forest',
   recordIndex:index,partIndex,multipart:row[5].length>1,
   sourceId:String(row[0])+':'+row[1],recordName:String(row[3]||'산림청 수록 등산로'),
   coords:decodeLine(str),date:String(row[4]),closed:row[8]==='Y',restricted:row[7]==='Y'
  }));
 });
}
function parkLines(raw,code){
 if(code!=='428302602'||raw?.type!=='FeatureCollection'||raw.features?.length!==24||
   raw.metadata?.source_file_date!=='2018-12-31')
  throw Error('설악산 국립공원공단 원본 형식 오류');
 const out=[];
 raw.features.forEach((f,i)=>{
  if(f.properties?.facility_type!=='탐방로')return;
  const parts=f.geometry?.type==='LineString'?[f.geometry.coordinates]:
   f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[];
  parts.forEach((coords,j)=>out.push({
   id:'knps2018:'+i+':'+j,mountainCode:code,sourceKind:'knps',
   sourceId:'knps2018:'+i+':'+j,recordName:String(f.properties.facility_label||'공단 수록 탐방로'),
   coords,date:'2018-12-31',multipart:false
  }));
 });
 return out;
}
root.SanbakMountainProfiles=Object.freeze({version:1,decode,lengthOf,forestLines,parkLines,profile});
})(typeof window!=='undefined'?window:globalThis);
