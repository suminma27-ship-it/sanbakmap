/* 산박지도 v110 — authenticated, lazy local ZIP mount of the audited 2,723-mountain elevation set.
 * This module does NOT claim the ZIP is hosted by GitHub Pages.
 * Never guess heights from an unavailable edge or elevation source.
 */
(function(root){
'use strict';
const ARCHIVE_SHA256='045cd0b4c41114f7a71b711b601445138a3ef9741a8ee4abaa6660f6e49c1e2e';
const ELEVATION_SHA256='6e9e51a467d6be4ba35bec5127bbb4b896e36e1dbf884535d1aecaa8605224d2';
const PREFIX='data/nationwide-elevation/',MAX_BYTES=4*1024*1024;
const DB_NAME='sanbakmap-v110-elevation-local',KEY='national-audit-archive';
const fail=message=>{throw Error(message)};
const exact=(ok,message)=>{if(!ok)fail(message)};
function archiveEntries(bytes){
 const b=new Uint8Array(bytes),dv=new DataView(bytes);
 exact(b.length>=22&&b.length<=MAX_BYTES,'이 자료는 v109 32개 고도 묶음 ZIP이 아니야');
 let eocd=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65558);i--){
  if(dv.getUint32(i,true)===0x06054b50&&i+22+dv.getUint16(i+20,true)===b.length){eocd=i;break}
 }
 exact(eocd>=0,'고도 ZIP 중앙목록을 찾을 수 없어');
 const count=dv.getUint16(eocd+10,true),size=dv.getUint32(eocd+12,true);
 let cursor=dv.getUint32(eocd+16,true),end=cursor+size;
 exact(count===35&&end===eocd,'고도 ZIP 파일 수 또는 중앙목록이 달라졌어');
 const allowed=new Set([PREFIX+'coverage-v109.json','tools/build_v109.py','README_ko.txt']);
 for(let i=0;i<32;i++)allowed.add(PREFIX+'bucket-'+String(i).padStart(2,'0')+'.json');
 const entries=new Map(),decoder=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){
  exact(cursor+46<=end&&dv.getUint32(cursor,true)===0x02014b50,'고도 ZIP 목록 손상');
  const flags=dv.getUint16(cursor+8,true),method=dv.getUint16(cursor+10,true);
  const crc=dv.getUint32(cursor+16,true),comp=dv.getUint32(cursor+20,true),
   sizeRaw=dv.getUint32(cursor+24,true),nameLen=dv.getUint16(cursor+28,true),
   extraLen=dv.getUint16(cursor+30,true),commentLen=dv.getUint16(cursor+32,true),
   offset=dv.getUint32(cursor+42,true);
  const next=cursor+46+nameLen+extraLen+commentLen;
  exact(next<=end&&method===8&&!(flags&1)&&comp<MAX_BYTES&&sizeRaw<=3*1024*1024,
   '고도 ZIP 압축 형식 오류');
  const name=decoder.decode(b.subarray(cursor+46,cursor+46+nameLen));
  exact(allowed.has(name)&&!entries.has(name)&&offset+30<=b.length,'ZIP 경로 또는 중복 파일이 올바르지 않아');
  entries.set(name,{method,comp,sizeRaw,crc,offset,name});
  cursor=next;
 }
 exact(cursor===end&&entries.size===allowed.size,'고도 ZIP에 필수 자료가 누락됐어');
 return entries;
}
let crcTable=null;
function crc32(bytes){
 if(!crcTable)crcTable=Array.from({length:256},(_,n)=>{
  for(let k=0;k<8;k++)n=(n&1)?(0xedb88320^(n>>>1)):(n>>>1);
  return n>>>0;
 });
 let x=0xffffffff;
 for(let i=0;i<bytes.length;i++)x=crcTable[(x^bytes[i])&255]^(x>>>8);
 return (x^0xffffffff)>>>0;
}
async function readEntry(bytes,entry){
 const dv=new DataView(bytes),raw=new Uint8Array(bytes),at=entry.offset;
 exact(dv.getUint32(at,true)===0x04034b50&&dv.getUint16(at+8,true)===entry.method,
  'ZIP 본문 메타데이터 손상');
 const nameLen=dv.getUint16(at+26,true),extraLen=dv.getUint16(at+28,true);
 const start=at+30+nameLen+extraLen,stop=start+entry.comp;
 exact(stop<=bytes.byteLength,'ZIP 본문 범위 초과');
 const name=new TextDecoder('utf-8',{fatal:true}).decode(raw.subarray(at+30,at+30+nameLen));
 exact(name===entry.name,'ZIP 원본 파일명이 변경됐어');
 exact(typeof DecompressionStream==='function','브라우저의 ZIP 압축 해제 지원이 없어');
 let out;
 try{
  out=new Uint8Array(await new Response(new Blob([raw.subarray(start,stop)])
   .stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
 }catch{fail('고도 ZIP 압축을 해제할 수 없어')}
 exact(out.length===entry.sizeRaw&&crc32(out)===entry.crc,'고도 ZIP 내용 검증 실패');
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(out));
}
async function openBuffer(input){
 exact(input instanceof ArrayBuffer,'고도 ZIP 바이너리 자료가 아니야');
 exact(input.byteLength<=MAX_BYTES,'고도 ZIP 용량 한도를 초과했어');
 exact(root.crypto?.subtle?.digest,'안전한 HTTPS 환경에서만 고도 ZIP을 검증할 수 있어');
 const actual=Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',input)))
  .map(x=>x.toString(16).padStart(2,'0')).join('');
 exact(actual===ARCHIVE_SHA256,'배포된 v109 고도 ZIP과 해시가 달라. 제공된 원본 ZIP만 선택해 줘');
 const entries=archiveEntries(input);
 const coverage=await readEntry(input,entries.get(PREFIX+'coverage-v109.json'));
 exact(coverage?.schema==='sanbak-dem-coverage-v109'&&coverage.checked===2902&&
  coverage.summary?.matchedMountains===2723&&coverage.summary.matchedEdges===53034&&
  coverage.fullSourceRasterVerified===false&&Array.isArray(coverage.records)&&
  coverage.records.length===2902&&Object.keys(coverage.buckets||{}).length===32,
  '전국 고도 검증 보고서 형식이 달라');
 const coverageMap=new Map();
 for(const rec of coverage.records){
  exact(/^\d{9}$/.test(rec.code)&&!coverageMap.has(rec.code)&&
   Number.isInteger(rec.graphEdges)&&Number.isInteger(rec.matchedEdges)&&
   rec.matchedEdges>=0&&rec.matchedEdges<=rec.graphEdges,'산코드별 고도 대조 결과 오류');
  if(rec.matchedEdges)coverageMap.set(rec.code,rec);
 }
 exact(coverageMap.size===2723,'전국 고도 산코드 수가 달라');
 const bucketMemo=new Map();
 return Object.freeze({
  sha256:ARCHIVE_SHA256,
  coverage:{mountains:coverageMap.size,matchedEdges:coverage.summary.matchedEdges,
   graphEdges:coverage.summary.graphEdges,fullSourceRasterVerified:false},
  has:code=>coverageMap.has(String(code)),
  match:code=>coverageMap.get(String(code))||null,
  get:async(code,bucket)=>{
   code=String(code);bucket=String(bucket);
   if(!coverageMap.has(code))return null;
   exact(/^\d{2}$/.test(bucket),'산림청 원본 버킷 ID 오류');
   if(!bucketMemo.has(bucket)){
    const e=entries.get(PREFIX+'bucket-'+bucket+'.json');
    const next=readEntry(input,e).then(d=>{
     exact(d?.schema==='sanbak-dem-bucket-v109'&&d.bucket===bucket&&
      d.mountains&&typeof d.mountains==='object','전국 고도 버킷 검증 실패');
     return d;
    }).catch(e=>{bucketMemo.delete(bucket);throw e});
    bucketMemo.set(bucket,next);
   }
   const data=await bucketMemo.get(bucket);
   const pack=data.mountains[code];
   exact(pack&&pack.mountainCode===code&&pack.sourceKind==='forest'&&
    pack.dem?.sha256===ELEVATION_SHA256&&pack.dem.resolutionMeters===null&&
    pack.dem.sourceRasterResolutionVerified===false&&
    Object.keys(pack.samples||{}).length===coverageMap.get(code).matchedEdges,
    '고도 버킷의 산코드·원본 표본 대응 기록 오류');
   return pack;
  }
 });
}
async function openLocalDb(){
 if(!root.indexedDB)return null;
 return new Promise(resolve=>{
  let req;
  try{req=root.indexedDB.open(DB_NAME,1)}catch{return resolve(null)}
  req.onupgradeneeded=()=>req.result.createObjectStore('files');
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>resolve(null);
  req.onblocked=()=>resolve(null);
 });
}
async function remember(bytes){
 const db=await openLocalDb();if(!db)return false;
 return new Promise(resolve=>{
  const tx=db.transaction('files','readwrite');
  tx.objectStore('files').put(bytes,KEY);
  tx.oncomplete=()=>{db.close();resolve(true)};
  tx.onerror=()=>{db.close();resolve(false)};
  tx.onabort=()=>{db.close();resolve(false)};
 });
}
async function recall(){
 const db=await openLocalDb();if(!db)return null;
 return new Promise(resolve=>{
  const tx=db.transaction('files','readonly');
  const req=tx.objectStore('files').get(KEY);
  req.onsuccess=()=>resolve(req.result instanceof ArrayBuffer?req.result:null);
  req.onerror=()=>resolve(null);
  tx.oncomplete=()=>db.close();
  tx.onerror=()=>db.close();
 });
}
async function loadFile(file){
 exact(file&&typeof file.arrayBuffer==='function'&&file.size<=MAX_BYTES,
  '기존 산박지도 v109 ZIP 파일을 선택해 줘');
 const bytes=await file.arrayBuffer();
 const mounted=await openBuffer(bytes);
 // Browser storage is an optional convenience. The in-memory archive works without it.
 try{await remember(bytes)}catch{}
 return mounted;
}
async function restore(){
 const bytes=await recall();if(!bytes)return null;
 try{return await openBuffer(bytes)}catch{return null}
}
root.SanbakElevationArchiveV110=Object.freeze({version:110,
 archiveSha256:ARCHIVE_SHA256,openBuffer,loadFile,restore});
})(typeof window!=='undefined'?window:globalThis);
