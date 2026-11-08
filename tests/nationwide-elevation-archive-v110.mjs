import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {deflateRawSync} from 'node:zlib';
const source=readFileSync(new URL('../core/nationwide-elevation-archive-v110.js',import.meta.url),'utf8');
const known='045cd0b4c41114f7a71b711b601445138a3ef9741a8ee4abaa6660f6e49c1e2e';
function crc32(bytes){
 let n=0xffffffff;
 for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n&1)?(n>>>1)^0xedb88320:(n>>>1)}
 return (n^0xffffffff)>>>0;
}
const v16=(n)=>{const b=Buffer.alloc(2);b.writeUInt16LE(n);return b};
const v32=(n)=>{const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b};
function zipFiles(entries){
 let offset=0,locals=[],centers=[];
 for(const [name,str] of entries){
  const filename=Buffer.from(name),raw=Buffer.from(str),z=deflateRawSync(raw),crc=crc32(raw);
  const local=Buffer.concat([v32(0x04034b50),v16(20),v16(0),v16(8),v16(0),v16(0),
    v32(crc),v32(z.length),v32(raw.length),v16(filename.length),v16(0),filename,z]);
  const center=Buffer.concat([v32(0x02014b50),v16(20),v16(20),v16(0),v16(8),v16(0),v16(0),
    v32(crc),v32(z.length),v32(raw.length),v16(filename.length),v16(0),v16(0),v16(0),
    v16(0),v32(0),v32(offset),filename]);
  centers.push(center);locals.push(local);offset+=local.length;
 }
 const central=Buffer.concat(centers);
 const end=Buffer.concat([v32(0x06054b50),v16(0),v16(0),v16(entries.length),v16(entries.length),
  v32(central.length),v32(offset),v16(0)]);
 return Buffer.concat([...locals,central,end]);
}
const codes=Array.from({length:2902},(_,i)=>String(100000001+i));
const coverage={schema:'sanbak-dem-coverage-v109',checked:2902,
 summary:{matchedMountains:2723,matchedEdges:53034,graphEdges:67185},
 fullSourceRasterVerified:false,
 records:codes.map((code,i)=>({code,graphEdges:1,matchedEdges:i<2723?1:0}))};
const wanted=codes[0];
const pack={schema:'sanbak-original-edge-dem-packed-v108',mountainCode:wanted,
 sourceKind:'forest',edgeCount:1,
 dem:{sha256:'6e9e51a467d6be4ba35bec5127bbb4b896e36e1dbf884535d1aecaa8605224d2',
 resolutionMeters:null,sourceRasterResolutionVerified:false},
 samples:{'0':'YQA'}};
const entries=[];
for(let i=0;i<32;i++){
 const id=String(i).padStart(2,'0');
 entries.push(['data/nationwide-elevation/bucket-'+id+'.json',JSON.stringify({
  schema:'sanbak-dem-bucket-v109',bucket:id,mountains:i===0?{[wanted]:pack}:{}})]);
}
coverage.buckets=Object.fromEntries(Array.from({length:32},(_,i)=>[String(i).padStart(2,'0'),{mountains:i===0?1:0}]));
entries.push(['data/nationwide-elevation/coverage-v109.json',JSON.stringify(coverage)]);
entries.push(['tools/build_v109.py','print(1)']);
entries.push(['README_ko.txt','unit fixture']);
const zipped=zipFiles(entries);
const digest=Uint8Array.from(known.match(/../g),x=>parseInt(x,16));
const crypto={subtle:{digest:async()=>digest.buffer.slice(0)}};
const scope={window:null,crypto,ArrayBuffer,Uint8Array,DataView,TextDecoder,Blob,Response,
 DecompressionStream,Map,Set,Promise,Error,Number,Object,String,Array};
scope.window=scope;
vm.runInNewContext(source,scope);
const core=scope.SanbakElevationArchiveV110;
assert.equal(core.version,110);
const array=zipped.buffer.slice(zipped.byteOffset,zipped.byteOffset+zipped.byteLength);
const a=await core.openBuffer(array);
assert.equal(a.coverage.mountains,2723);
assert.equal(a.coverage.matchedEdges,53034);
assert.equal(a.coverage.fullSourceRasterVerified,false);
assert(a.has(wanted));assert(!a.has(codes.at(-1)));
assert.equal(a.match(wanted).matchedEdges,1);
const found=await a.get(wanted,'00');
assert.equal(found.mountainCode,wanted);assert.equal(found.dem.resolutionMeters,null);
assert.equal(await a.get(codes.at(-1),'00'),null);
await assert.rejects(a.get(wanted,'01'),/고도 버킷/);
const corrupted=Buffer.from(zipped);corrupted[corrupted.length-1]=1;
await assert.rejects(core.openBuffer(corrupted.buffer.slice(corrupted.byteOffset,corrupted.byteOffset+corrupted.byteLength)),
 /중앙목록/);
const invalidCrypto={...scope,crypto:{subtle:{digest:async()=>Uint8Array.from(Array(32).fill(0)).buffer}}};
invalidCrypto.window=invalidCrypto;vm.runInNewContext(source,invalidCrypto);
await assert.rejects(invalidCrypto.SanbakElevationArchiveV110.openBuffer(array),/해시/);
const page=readFileSync(new URL('../nationwide-plan.html',import.meta.url),'utf8');
assert(page.includes('산박지도 v121 | 고도 보간 구분'));
for(const term of ['nationalElevationZip','nationalElevationStatus','core/nationwide-elevation-archive-v110.js',
 'localArchive.get(code,index?.mountains?.[code]?.bucket)','archiveCore.loadFile(file)','archiveCore.restore()'])
 assert(page.includes(term),term);
new Function(page.slice(page.lastIndexOf('<script>')+8,page.lastIndexOf('</script>')));
const wf=readFileSync(new URL('../.github/workflows/deploy-pages.yml',import.meta.url),'utf8');
assert(wf.includes('core/nationwide-elevation-archive-v110.js'));
assert(wf.includes('python tools/publish-nationwide-elevation-v110.py --output-dir site/data/nationwide-elevation'));
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
assert(sw.includes('sanbakmap-v121-gap-elevation-preview'));
console.log('PASS v110: strict nationwide ZIP SHA256 + directory + deflate/CRC, 2723-code lazy lookup, unknown intervals remain unverified, hosted and local status separated');
