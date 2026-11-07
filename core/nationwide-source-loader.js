/* Shared nationwide agency-trail display contract v1.
   Source registration != official legal designation != currently open trail.
   This engine never creates path connectors or authorizes routing.
   The institution source is a 2016-2019 historical snapshot, for visual use only. */
(function(root){
'use strict';
const codeOK=x=>/^\d{9}$/.test(String(x));
const inKorea=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=32&&p[1]<=40;
function readDelta(str,offset){
 let result=0,shift=0,i=offset;
 while(i<str.length){
  const b=str.charCodeAt(i++)-63;
  if(b<0||b>63)throw Error('Damaged institution line data');
  result|=(b&31)<<shift;
  if(!(b&32))return [result&1?~(result>>1):result>>1,i];
  shift+=5;if(shift>30)throw Error('Polyline coordinate overflow');
 }
 throw Error('Incomplete polyline data');
}
function decodeLine(s){
 if(typeof s!=='string'||s.length<4||s.length>500000)throw Error('Invalid encoded hiking path');
 const points=[];let i=0,lon=0,lat=0;
 while(i<s.length){
  const a=readDelta(s,i);const b=readDelta(s,a[1]);i=b[1];
  lon+=a[0];lat+=b[0];
  const xy=[lon/1e5,lat/1e5];
  if(!inKorea(xy))throw Error('Agency coordinates outside Korea');
  points.push(xy);
  if(points.length>200000)throw Error('Hiking path exceeds safe size');
 }
 if(points.length<2)throw Error('Hiking path too short');
 return points;
}
function catalog(items){
 if(!Array.isArray(items)||items.length!==2932)throw Error('Nationwide mountain index must contain 2,932 records');
 const seen=new Set();
 return items.map(x=>{
  const code=String(x.c),name=String(x.n||'').trim();
  if(!codeOK(code)||!name||seen.has(code))throw Error('Invalid or repeated mountain code '+code);
  seen.add(code);
  return {code,name,segments:Number(x.s)||0,spots:Number(x.p)||0,demCoverage:x.e};
 });
}
function index(raw){
 if(!raw||raw.schema!=='sanbak-national-index-v1'||!raw.mountains||!Array.isArray(raw.buckets)||raw.buckets.length!==32)throw Error('Institutional catalog mismatch');
 const codes=Object.keys(raw.mountains);
 if(codes.length!==2902)throw Error('Unexpected institution source mountain coverage');
 for(const code of codes){
  const d=raw.mountains[code];
  if(!codeOK(code)||!/^\d{2}$/.test(d.bucket)||!Number.isInteger(d.count)||d.count<1)throw Error('Invalid nationwide source entry');
 }
 return raw;
}
function agency(raw,code){
 if(!codeOK(code)||raw?.schema!=='sanbak-national-institutional-lines-v1'||raw?.agency!=='산림청')throw Error('Invalid institution source data');
 const records=raw.mountains?.[code];
 if(!Array.isArray(records)||!records.length)throw Error('Missing registered trails for mountain '+code);
 const lines=[];
 for(const record of records){
  if(!Array.isArray(record)||record.length!==9||!Array.isArray(record[5]))throw Error('Invalid source record');
  const [file,row,id,name,date,parts,difficulty,restriction,closed]=record;
  if(typeof file!=='string'||!Number.isInteger(row)||typeof id!=='string'||typeof date!=='string')throw Error('Provenance missing');
  if(parts.length>100)throw Error('Invalid multipart line');
  for(const encoded of parts)lines.push({coords:decodeLine(encoded),name:String(name||''),difficulty:String(difficulty||''),
    sourceId:file+':'+row,sourceRecordId:id,date,closed:closed==='Y',restricted:restriction==='Y'});
 }
 return {kind:'agency',label:'산림청 수록 등산로',date:'2016~2019',lines,
  points:null,previewPath:null,sourceCount:records.length,
  historic:true,officiallyDesignated:false,currentlyOpenVerified:false,routable:false,
  note:'기관 과거 자료에 수록된 등산로이며 2026년 현재 지정·통행 가능 여부는 확인되지 않았어.'};
}
function knps(raw){
 if(raw?.type!=='FeatureCollection'||raw.metadata?.source_file_date!=='2018-12-31'||raw.metadata?.trail_features!==19||
    !Array.isArray(raw.features)||raw.features.length!==24)throw Error('Historic national park line metadata mismatch');
 const features=raw.features.filter(f=>f.properties?.facility_type==='탐방로');
 if(features.length!==19)throw Error('KNPS source trail count changed');
 const lines=[];
 for(const f of features){
  if(f.properties.current_access_verified!==false||f.properties.routing_allowed!==false)throw Error('Unexpectedly authorized park facility');
  const g=f.geometry,parts=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
  for(const points of parts){
   if(!Array.isArray(points)||points.length<2||!points.every(inKorea))throw Error('KNPS coordinates invalid');
   lines.push({coords:points.map(x=>x.slice(0,2)),name:String(f.properties?.label||''),sourceId:String(f.properties.original_facility_id||''),
     date:'2018-12-31',closed:false,restricted:false});
  }
 }
 return {kind:'knps',label:'국립공원공단 등록 탐방로',date:'2018-12-31',lines,
   sourceCount:19,previewPath:null,historic:true,officiallyDesignated:false,currentlyOpenVerified:false,routable:false,
   note:'공단의 2018년 시설 분류이며 현행 개방 여부·법정 지정은 별도 최신 확인이 필요해.'};
}
function preview(code,name,svg){
 return {kind:'preview',label:'산림청 산별 원본 미리보기',date:'주로 2016',lines:[],
  previewPath:typeof svg==='string'?svg:'',sourceCount:0,historic:true,
  officiallyDesignated:false,currentlyOpenVerified:false,routable:false,
  note:'원본에서 만든 단순화 미리보기야. 상세 공공기관 선형은 아직 이 산에 배포되지 않았어.'};
}
function choose(code,{park=null,agencyData=null,previewPath=''}={}){
 if(code==='428302602'&&park)return knps(park);
 if(agencyData)return agency(agencyData,code);
 return preview(code,'',previewPath);
}
root.SanbakNationwideAgency=Object.freeze({version:1,catalog,index,decodeLine,agency,knps,preview,choose,inKorea});
})(typeof window!=='undefined'?window:globalThis);
