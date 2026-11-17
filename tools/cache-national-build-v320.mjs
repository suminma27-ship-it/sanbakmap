// Verified reuse of generated national GIS data; no approval of passage.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const stampPath='data/nationwide-topology/cache-validation-v320.json';
const sha=x=>createHash('sha256').update(x).digest('hex');
const check=(ok,why)=>{if(!ok)throw Error(why)};
const buckets=prefix=>Array.from({length:32},(_,n)=>prefix+String(n).padStart(2,'0'));
export const requiredPaths=[
 'data/nationwide/index.json',
 ...buckets('data/nationwide/bucket-').map(x=>x+'.json'),
 'data/nationwide-topology/index.json',
 'data/nationwide-topology/review-v103.json',
 'data/nationwide-topology/contacts-v125-index.json',
 'data/nationwide-topology/preview-35m-v127-index.json',
 ...buckets('data/nationwide-topology/bucket-').map(x=>x+'.json.gz'),
 ...buckets('data/nationwide-topology/contacts-v125-bucket-').map(x=>x+'.json.gz'),
 ...buckets('data/nationwide-topology/preview-35m-v127-bucket-').map(x=>x+'.json.gz')
].sort();
export async function checkNationwideCache(siteDir,{write=false}={}){
 const site=resolve(siteDir),readJSON=async file=>JSON.parse(await readFile(join(site,file),'utf8'));
 const manifest=JSON.parse(await readFile(join(ROOT,'data/nationwide-topology/manifest.json'),'utf8'));
 check(manifest.schema==='sanbak-original-geometry-topology-package-v102'&&
  manifest.mountain_codes===2902&&manifest.graph_edges===67185,'Source manifest scope mismatch');
 const [display,topo,contact,preview]=await Promise.all([
  readJSON('data/nationwide/index.json'),readJSON('data/nationwide-topology/index.json'),
  readJSON('data/nationwide-topology/contacts-v125-index.json'),
  readJSON('data/nationwide-topology/preview-35m-v127-index.json')]);
 check(display.schema==='sanbak-national-index-v1'&&display.buckets?.length===32,
  'Nationwide display index incomplete');
 check(topo.schema==='sanbak-topology-audit-index-v102'&&
  topo.counts?.mountains===2902&&topo.counts?.edges===67185&&
  topo.source_zip_sha256===manifest.source_zip_sha256&&
  topo.accessVerified===false&&topo.physicalJunctionVerified===false,
  'Original topology coverage or authorization gate failed');
 check(contact.schema==='sanbak-national-contacts-v125'&&contact.totals?.mountains===2902&&
  contact.createdConnectingEdges===0&&contact.sourceZipSHA256===manifest.source_zip_sha256,
  'Contact audit coverage or no-link gate failed');
 check(preview.schema==='sanbak-35m-plan-only-index-v127'&&
  preview.counts?.mountains===2902&&preview.originalDEMUnchanged===true&&
  preview.physicalPassageVerified===false&&preview.sourceZipSHA256===manifest.source_zip_sha256,
  'Preview coverage or authorization gate failed');
 const files={};
 for(const file of requiredPaths){
  const bytes=await readFile(join(site,file));
  check(bytes.length>0,'Empty artifact: '+file);
  if(file.endsWith('.gz'))check(bytes[0]===31&&bytes[1]===139,'Bad gzip: '+file);
  files[file]=sha(bytes);
 }
 const expected={schema:'sanbak-verified-national-cache-v320',version:1,
  sourceZipSHA256:manifest.source_zip_sha256,mountains:2902,originalEdges:67185,
  approvedNewConnections:0,files};
 if(write)await writeFile(join(site,stampPath),JSON.stringify(expected)+'\n');
 else{
  const saved=await readJSON(stampPath);
  check(saved.schema===expected.schema&&saved.version===1&&
   saved.sourceZipSHA256===expected.sourceZipSHA256&&saved.mountains===2902&&
   saved.originalEdges===67185&&saved.approvedNewConnections===0,
   'Cache stamp provenance mismatch');
  check(saved.files&&Object.keys(saved.files).length===requiredPaths.length,
   'Cache inventory incomplete');
  for(const file of requiredPaths)check(saved.files[file]===files[file],
   'Cached output SHA-256 mismatch: '+file);
 }
 return {status:write?'written':'verified',files:requiredPaths.length,
  mountains:2902,originalEdges:67185,sourceZipSHA256:manifest.source_zip_sha256};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flag=process.argv.indexOf('--site'),site=flag<0?join(ROOT,'site'):resolve(process.argv[flag+1]);
 checkNationwideCache(site,{write:process.argv.includes('--write')})
  .then(x=>console.log('PASS nationwide cache v320',JSON.stringify(x)))
  .catch(e=>{console.error('CACHE INVALID:',e.message);process.exitCode=1});
}
