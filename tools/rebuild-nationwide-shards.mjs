// Restore all 32 institutional-data buckets from the shipped 11-part v100 source.
// Exact source SHA-256 checks prevent silent changes and accidental route promotion.
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha256=x=>createHash('sha256').update(x).digest('hex');
const fail=message=>{throw new Error(message)};
function extractPart(src,expected){
 const found=src.match(/\)\[(\d+)\]=/);
 if(!found||Number(found[1])!==expected)fail('Missing ordered nationwide part '+expected);
 const raw=src.slice(found.index+found[0].length).trim();
 if(!raw.endsWith(';'))fail('Broken JS chunk terminator '+expected);
 const fragment=JSON.parse(raw.slice(0,-1));
 if(typeof fragment!=='string'||!fragment.length)fail('Empty nationwide data chunk '+expected);
 return fragment;
}
export async function rebuild({outputDir=join(root,'site','data','nationwide'),dryRun=false}={}){
 const parts=[];
 for(let i=0;i<11;i++){
  const name='part-'+String(i).padStart(2,'0')+'.js';
  parts.push(extractPart(await readFile(join(root,'data','nationwide-full',name),'utf8'),i));
 }
 const bundled=JSON.parse(parts.join(''));
 const index=JSON.parse(await readFile(join(root,'data','nationwide','index.json'),'utf8'));
 if(index.schema!=='sanbak-national-index-v1'||index.buckets?.length!==32||
    Object.keys(bundled).length!==32)fail('Expected 32 nationwide institution buckets');
 const codeSet=new Set();let rowTotal=0;const output=[];
 for(const item of index.buckets){
  const number=item.name.match(/^bucket-(\d{2})\.json$/)?.[1];
  if(!number||typeof bundled[number]!=='string')fail('Unknown nationwide bucket '+item.name);
  const zip=Buffer.from(bundled[number],'base64');
  const raw=gunzipSync(zip);
  const hash=sha256(raw);
  if(hash!==item.sha256||raw.length!==item.bytes)fail('Nationwide source SHA/size mismatch '+item.name);
  const data=JSON.parse(raw.toString('utf8'));
  if(data.schema!=='sanbak-national-institutional-lines-v1'||data.agency!=='산림청'||
     data.route_authorization!=='unverified'||data.current_access!=='unverified')
    fail('Invalid institution source status '+number);
  const codes=Object.keys(data.mountains||{});
  let count=0;
  for(const code of codes){
   if(!/^\d{9}$/.test(code)||index.mountains?.[code]?.bucket!==number||
       index.mountains[code]?.count!==data.mountains[code].length||
       codeSet.has(code))fail('Duplicate or mismatched mountain code '+code);
   codeSet.add(code);count+=data.mountains[code].length;
  }
  if(codes.length!==item.mountains||count!==item.lines)
   fail('Bucket geographic coverage mismatch '+number);
  rowTotal+=count;
  output.push({name:item.name,bytes:raw.length,hash,count,mountains:codes.length,raw});
 }
 if(codeSet.size!==2902||rowTotal!==59368||
    index.summary?.institutional_line_count!==rowTotal||
    index.summary?.mountain_count!==codeSet.size)
  fail('Nationwide source totals changed');
 if(!dryRun){
  await mkdir(outputDir,{recursive:true});
  await Promise.all(output.map(o=>writeFile(join(outputDir,o.name),o.raw)));
 }
 return {buckets:32,mountains:codeSet.size,lines:rowTotal,bytes:output.reduce((n,x)=>n+x.bytes,0),
   outputDir:dryRun?null:outputDir};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--output-dir'),out=i>=0?resolve(process.argv[i+1]):join(root,'site','data','nationwide');
 rebuild({outputDir:out}).then(result=>console.log('PASS rebuilt verified nationwide agency buckets:',JSON.stringify(result))).catch(e=>{console.error(e);process.exitCode=1});
}
