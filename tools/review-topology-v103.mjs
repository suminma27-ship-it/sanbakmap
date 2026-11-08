/* V103 build-time inventory of candidate connections.
 * Reads only SHA-checked v102 source shards already reconstructed in site/.
 * No new connector is added, no current access status is inferred.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import '../core/nationwide-graph-review-v103.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const requireThat=(ok,msg)=>{if(!ok)throw Error(msg)};
const pair=(a,b)=>a<b?a+'|'+b:b+'|'+a;
export async function rebuild({sourceDir=join(root,'site','data','nationwide-topology'),
 outputDir=sourceDir,dryRun=false}={}){
 const index=JSON.parse(await readFile(join(sourceDir,'index.json'),'utf8'));
 requireThat(index.schema==='sanbak-topology-audit-index-v102'&&index.counts?.mountains===2902,
  'v102 topology index missing');
 const sharedPoints=new Map(),perMountain={};
 let total=0,splitCount=0,nearTotal=0,nearMountains=0;
 for(let i=0;i<32;i++){
  const name='bucket-'+String(i).padStart(2,'0')+'.json.gz';
  const d=JSON.parse(gunzipSync(await readFile(join(sourceDir,name))).toString('utf8'));
  requireThat(d.schema==='sanbak-geometric-topology-v1'&&
    d.source_zip_sha256===index.source_zip_sha256,'Topology source SHA mismatch '+name);
  for(const [code,graph] of Object.entries(d.mountains||{})){
   requireThat(index.mountains?.[code]?.bucket===String(i).padStart(2,'0')&&
    graph.summary?.navigable===false,'Mountain cannot be promoted '+code);
   const diag=globalThis.SanbakGraphReviewV103.inspect(graph);
   total++;if(diag.componentCount>1)splitCount++;
   if(diag.near.length){nearTotal+=diag.near.length;nearMountains++}
   perMountain[code]={components:diag.componentCount,leafNodes:diag.leafCount,
     near:diag.near,neighbors:[]};
   for(let j=0;j<graph.nodes.length;j++){
    const p=graph.nodes[j],key=p[0]+':'+p[1];
    if(!sharedPoints.has(key))sharedPoints.set(key,[]);
    sharedPoints.get(key).push([code,j]);
   }
  }
 }
 requireThat(total===2902&&splitCount===324&&nearTotal===83&&nearMountains===39,
  'Unexpected nationwide internal disconnect audit counts');
 let crossPoints=0;
 const crossPairs=new Map();
 for(const [key,at] of sharedPoints){
  const codes=new Map();
  for(const [code,node] of at)if(!codes.has(code))codes.set(code,node);
  if(codes.size<2)continue;
  crossPoints++;
  const names=[...codes.keys()].sort(),xy=key.split(':').map(Number);
  for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){
   const a=names[i],b=names[j],k=pair(a,b);
   if(!crossPairs.has(k))crossPairs.set(k,{codes:[a,b],sharedCoordinates:0,samples:[]});
   const p=crossPairs.get(k);p.sharedCoordinates++;
   if(p.samples.length<2)p.samples.push([xy[0],xy[1],codes.get(a),codes.get(b)]);
  }
 }
 requireThat(crossPoints===1515&&crossPairs.size===308,
  'Nationwide cross-mountain shared-point totals unexpectedly changed');
 const pairs=[...crossPairs.values()].sort((a,b)=>a.codes.join().localeCompare(b.codes.join()));
 for(const p of pairs){
  const [a,b]=p.codes;
  perMountain[a].neighbors.push([b,p.sharedCoordinates]);
  perMountain[b].neighbors.push([a,p.sharedCoordinates]);
 }
 for(const x of Object.values(perMountain))x.neighbors.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 const output={schema:'sanbak-topology-review-v103',source_zip_sha256:index.source_zip_sha256,
  status:'historic-geometry-review-only',currentAccessVerified:false,
  physicalJunctionVerified:false,routeAllowed:false,createdConnectingEdges:0,
  metric:'original EPSG:5179 positions in 0.1m units',
  rules:{internalNear:'different graph components; degree-1 endpoints; 0.15m<distance<=2m',
    sharedCrossCode:'exact same integer decimeter coordinate from two or more mountain codes'},
  totals:{mountains:total,mountainsWithMultipleComponents:splitCount,
    mountainsWithInternalNearCandidates:nearMountains,internalNearCandidatePairs:nearTotal,
    crossCodeSharedCoordinateLocations:crossPoints,crossCodePairCount:pairs.length,
    createdConnectingEdges:0},
  mountains:perMountain,crossCodePairs:pairs};
 if(!dryRun){await mkdir(outputDir,{recursive:true});
  await writeFile(join(outputDir,'review-v103.json'),JSON.stringify(output)+'\n');
 }
 return output;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.indexOf('--source-dir'),b=process.argv.indexOf('--output-dir');
 rebuild({sourceDir:a<0?undefined:resolve(process.argv[a+1]),
  outputDir:b<0?undefined:resolve(process.argv[b+1]),dryRun:process.argv.includes('--dry-run')})
 .then(x=>console.log('PASS V103 candidate connections, NO ADDED EDGES:',JSON.stringify(x.totals)))
 .catch(e=>{console.error(e);process.exitCode=1});
}
