// Restore the full-precision source-vertex topology audit to 32 independently loaded gzip shards.
// Archive provenance, graph structure and no-routing status are mandatory checks.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=x=>createHash('sha256').update(x).digest('hex');
const guard=(ok,why)=>{if(!ok)throw new Error(why)};
const DATA=join(root,'data','nationwide-topology');
const details=join(root,'data','nationwide','index.json');
export async function rebuild({outputDir=join(root,'site','data','nationwide-topology'),dryRun=false}={}){
 const manifest=JSON.parse(await readFile(join(DATA,'manifest.json'),'utf8'));
 guard(manifest.schema==='sanbak-original-geometry-topology-package-v102'&&
   manifest.base64_parts===16&&manifest.mountain_codes===2902,'Bad topology source manifest');
 const fragments=[];
 for(let i=0;i<manifest.base64_parts;i++){
  const text=await readFile(join(DATA,'pack-'+String(i).padStart(2,'0')+'.js'),'utf8');
  const marker=')[ '+i+' ]='; // The canonical pack assignment is parsed strictly below.
  const found=text.match(/^\(window\.SANBAK_TOPOLOGY_PARTS\|\|\(window\.SANBAK_TOPOLOGY_PARTS=\[\]\)\)\[(\d+)\]=("[A-Za-z0-9+/=]+");?\s*$/s);
  guard(found&&Number(found[1])===i,'Tampered or misordered topology source part '+i);
  fragments.push(JSON.parse(found[2]));
 }
 const binary=Buffer.from(fragments.join(''),'base64');
 guard(binary.length===manifest.gzip_bytes&&hash(binary)===manifest.gzip_sha256,'Packed topology SHA mismatch');
 const decoded=gunzipSync(binary);
 guard(decoded.length===manifest.raw_bytes&&hash(decoded)===manifest.raw_sha256,'Expanded topology SHA mismatch');
 const chunks=JSON.parse(decoded.toString('utf8'));
 guard(Object.keys(chunks).length===32,'Expected 32 full-precision topology buckets');
 const index=JSON.parse(await readFile(details,'utf8'));
 const output={schema:'sanbak-topology-audit-index-v102',source:'산림청 DATA002 original EPSG:5179 GIS',
  source_zip_sha256:manifest.source_zip_sha256,sourceAge:'predominantly 2016',
  accessVerified:false,physicalJunctionVerified:false,routable:false,
  scope:'source vertex coincidence by individual mountain code; no cross-mountain joins',
  counts:{mountains:2902,parts:66503,nodes:59301,edges:67185,components:3571,nearMissesUnconnected:1513},
  mountains:{}};
 let mountainTotal=0,nodeTotal=0,edgeTotal=0,partTotal=0,componentTotal=0,nearTotal=0;
 const writes=[];
 if(!dryRun)await mkdir(outputDir,{recursive:true});
 for(let i=0;i<32;i++){
  const bucket=String(i).padStart(2,'0'),data=chunks[bucket];
  guard(data?.schema==='sanbak-geometric-topology-v1'&&data?.crs==='EPSG:5179'&&
    data?.source_zip_sha256===manifest.source_zip_sha256&&
    data?.status?.includes('route planning disabled'),'Invalid national topology bucket '+bucket);
  const items=Object.entries(data.mountains||{});
  for(const [code,graph] of items){
   guard(/^\d{9}$/.test(code)&&index.mountains?.[code]?.bucket===bucket,
     'Mountain bucket mismatch '+code);
   const sm=graph.summary;
   guard(sm?.navigable===false&&sm.access_verified===false&&
      sm.physical_junction_verified===false&&
      Array.isArray(graph.nodes)&&Array.isArray(graph.edges)&&Array.isArray(graph.source_parts),
      'Invalid connectivity status '+code);
   guard(sm.parts===graph.source_parts.length&&sm.nodes===graph.nodes.length&&sm.edges===graph.edges.length,
      'Source graph dimensions mismatch '+code);
   for(const edge of graph.edges){
    guard(Array.isArray(edge)&&edge.length===6&&
      edge[0]>=0&&edge[0]<graph.nodes.length&&edge[1]>=0&&edge[1]<graph.nodes.length&&
      edge[3]>=0&&edge[3]<graph.source_parts.length&&edge[2]>=0,
      'Invalid source edge indices '+code);
   }
   output.mountains[code]={bucket,parts:sm.parts,nodes:sm.nodes,edges:sm.edges,
     components:sm.geometric_components,nearUnconnected:sm.near_end_pairs_unconnected};
   mountainTotal++;nodeTotal+=sm.nodes;edgeTotal+=sm.edges;partTotal+=sm.parts;
   componentTotal+=sm.geometric_components;nearTotal+=sm.near_end_pairs_unconnected;
  }
  if(!dryRun)writes.push(writeFile(join(outputDir,'bucket-'+bucket+'.json.gz'),
    gzipSync(Buffer.from(JSON.stringify(data),'utf8'),{level:9,mtime:0})));
 }
 guard(mountainTotal===manifest.mountain_codes&&nodeTotal===manifest.graph_nodes&&
   edgeTotal===manifest.graph_edges&&partTotal===manifest.source_line_parts&&
   componentTotal===manifest.geometric_components_sum&&nearTotal===manifest.near_end_pairs_unconnected,
   'Nationwide geometry totals do not match signed manifest');
 if(!dryRun){
  await Promise.all(writes);
  await writeFile(join(outputDir,'index.json'),JSON.stringify(output)+'\n');
 }
 return {mountains:mountainTotal,parts:partTotal,nodes:nodeTotal,edges:edgeTotal,components:componentTotal,
   nearMisses:nearTotal,outputDir:dryRun?null:outputDir};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--output-dir');
 rebuild({outputDir:i>=0?resolve(process.argv[i+1]):join(root,'site','data','nationwide-topology'),
   dryRun:process.argv.includes('--dry-run')})
 .then(x=>console.log('PASS nationwide original-precision topology source and 32 independent shards:',JSON.stringify(x)))
 .catch(e=>{console.error(e);process.exitCode=1});
}
