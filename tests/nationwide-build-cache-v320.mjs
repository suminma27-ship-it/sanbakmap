import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,unlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {requiredPaths,checkNationwideCache} from '../tools/cache-national-build-v320.mjs';
const root=mkdtempSync(join(tmpdir(),'sanbak-cache-v320-'));
const manifest=JSON.parse(readFileSync(new URL('../data/nationwide-topology/manifest.json',import.meta.url)));
const write=(name,bytes)=>{
 const p=join(root,name);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);
};
try{
 for(const file of requiredPaths)
  write(file,file.endsWith('.gz')?gzipSync(Buffer.from('{"test":true}')):
   JSON.stringify({test:true}));
 const digest=manifest.source_zip_sha256;
 write('data/nationwide/index.json',JSON.stringify({
  schema:'sanbak-national-index-v1',buckets:Array.from({length:32},(_,i)=>i)}));
 write('data/nationwide-topology/index.json',JSON.stringify({
  schema:'sanbak-topology-audit-index-v102',source_zip_sha256:digest,
  accessVerified:false,physicalJunctionVerified:false,counts:{mountains:2902,edges:67185}}));
 write('data/nationwide-topology/contacts-v125-index.json',JSON.stringify({
  schema:'sanbak-national-contacts-v125',sourceZipSHA256:digest,
  createdConnectingEdges:0,totals:{mountains:2902}}));
 write('data/nationwide-topology/preview-35m-v127-index.json',JSON.stringify({
  schema:'sanbak-35m-plan-only-index-v127',sourceZipSHA256:digest,
  physicalPassageVerified:false,originalDEMUnchanged:true,counts:{mountains:2902}}));
 const made=await checkNationwideCache(root,{write:true});
 assert.equal(made.files,133);
 assert.equal((await checkNationwideCache(root)).status,'verified');
 const victim='data/nationwide-topology/contacts-v125-bucket-11.json.gz';
 write(victim,gzipSync(Buffer.from('{"test":"tampered"}')));
 await assert.rejects(checkNationwideCache(root),/SHA-256 mismatch/);
 write(victim,gzipSync(Buffer.from('{"test":true}')));
 assert.equal((await checkNationwideCache(root)).status,'verified');
 unlinkSync(join(root,'data/nationwide-topology/preview-35m-v127-bucket-31.json.gz'));
 await assert.rejects(checkNationwideCache(root),/ENOENT/);
 console.log('PASS cache v320: 133 file hashes, 2902 scope, tampering and omission rejected');
}finally{rmSync(root,{recursive:true,force:true})}
