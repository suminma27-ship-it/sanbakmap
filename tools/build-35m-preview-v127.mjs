/* v127: build PLAN-ONLY forest graph overlays for ALL <=35m display candidates.
 * Never certify hiking access, and never mutate signed original topology/DEM.
 * The site does not use these as authorized routes. Separate graph + connector
 * metadata are preserved for validating the v69 model and future graph reads.
 * 3m-simplified display positions and along-source distances are approximate.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import '../core/nationwide-source-loader.js';
import '../core/nationwide-map-v106.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const decode=globalThis.SanbakNationwideAgency.decodeLine,
 project=globalThis.SanbakLineMapV106.to5179;
const check=(test,msg)=>{if(!test)throw Error(msg)};
const len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const name=(file,row,part)=>String(file).split(/[\\/]/).at(-1)+'|'+row+'|'+part;
function sourceParts(graph,sourceFiles,displayRows){
 const map=new Map();
 for(const row of displayRows||[]){
  const [file,num,,,,polys]=row;
  if(!Array.isArray(polys))continue;
  for(let i=0;i<polys.length;i++)map.set(name(file,num,i),polys[i]);
 }
 const out=new Map();
 const edgeByPart=new Map();
 for(let i=0;i<graph.edges.length;i++){
  const e=graph.edges[i];
  if(!edgeByPart.has(e[3]))edgeByPart.set(e[3],[]);
  edgeByPart.get(e[3]).push({id:i,start:e[4],end:e[5],meters:e[2],from:e[0],to:e[1]});
 }
 for(let id=0;id<graph.source_parts.length;id++){
  const [file,row,part]=graph.source_parts[id];
  const encoded=map.get(name(sourceFiles[file],row,part));
  if(!encoded)continue;
  let points;
  try{points=decode(encoded).map(project)}catch{continue}
  const lengthAt=[0];
  for(let i=1;i<points.length;i++)lengthAt[i]=lengthAt[i-1]+len(points[i-1],points[i]);
  const edges=(edgeByPart.get(id)||[]).sort((a,b)=>a.start-b.start),cum=[0];
  for(let i=0;i<edges.length;i++)cum[i+1]=cum[i]+edges[i].meters;
  if(!edges.length||cum.at(-1)<=0||lengthAt.at(-1)<=0)continue;
  const rawStart=graph.nodes[edges[0].from].map(x=>x/10),
   reversed=len(rawStart,points.at(-1))<len(rawStart,points[0]);
  out.set(id,{id,points,lengthAt,edges,cum,displayLength:lengthAt.at(-1),
   originalLength:cum.at(-1),reversed});
 }
 return out;
}
export function materializeMountain(graph,sourceFiles,displayRows,candidates){
 check(graph?.summary?.navigable===false&&graph.summary.access_verified===false&&
  graph.summary.physical_junction_verified===false,'Unsigned original source graph');
 check(Array.isArray(sourceFiles)&&Array.isArray(graph.nodes)&&Array.isArray(graph.edges),
  'Original source entries missing');
 const source=sourceParts(graph,sourceFiles,displayRows);
 const nodes=graph.nodes.map(x=>x.slice()),edges=graph.edges.map(x=>x.slice()),added=[],cuts=new Map(),
  ref=new Map(),links=[];
 let attempted=0,discarded=0,alreadySame=0;
 function locate(sourcePart,segment,at){
  const p=source.get(sourcePart);
  if(!p||!Array.isArray(at)||segment<0||segment>=p.points.length-1)return null;
  const A=p.points[segment],B=p.points[segment+1],
   vx=B[0]-A[0],vy=B[1]-A[1],d=vx*vx+vy*vy;
  const t=d<1e-9?0:Math.max(0,Math.min(1,
   ((at[0]-A[0])*vx+(at[1]-A[1])*vy)/d));
  let sDisplay=p.lengthAt[segment]+t*(p.lengthAt[segment+1]-p.lengthAt[segment]);
  if(p.reversed)sDisplay=p.displayLength-sDisplay;
  const s=Math.min(p.originalLength,Math.max(0,sDisplay/p.displayLength*p.originalLength));
  let i=0;while(i<p.edges.length-1&&s>p.cum[i+1])i++;
  const e=p.edges[i],relative=Math.max(0,Math.min(e.meters,s-p.cum[i]));
  if(relative<=.08)return {node:e.from,edge:e.id,at:0};
  if(e.meters-relative<=.08)return {node:e.to,edge:e.id,at:e.meters};
  const cache=sourcePart+'|'+Math.round(s*10),was=ref.get(cache);
  if(Number.isInteger(was))return {node:was,edge:e.id,at:relative};
  const node=nodes.length;
  nodes.push(at.map(x=>Math.round(x*10)));
  ref.set(cache,node);
  if(!cuts.has(e.id))cuts.set(e.id,[]);
  cuts.get(e.id).push({node,at:relative});
  return {node,edge:e.id,at:relative};
 }
 for(const c of candidates){
  attempted++;
  if(!c?.proposedOnly||c.passageVerified!==false||c.gapMeters>35||
   c.gapMeters<0||c.sourceParts?.length!==2||c.sourceSegments?.length!==2||
   c.anchorsEPSG5179?.length!==2){discarded++;continue}
  const a=locate(c.sourceParts[0],c.sourceSegments[0],c.anchorsEPSG5179[0]);
  const b=locate(c.sourceParts[1],c.sourceSegments[1],c.anchorsEPSG5179[1]);
  if(!a||!b){discarded++;continue}
  if(a.node===b.node){alreadySame++;continue}
  const dist=Math.max(.01,+c.gapMeters.toFixed(2));
  links.push({from:a.node,to:b.node,dist,c});
 }
 for(const [edgeId,points]of cuts){
  const e=graph.edges[edgeId],pts=[{node:e[0],at:0},...points,
   {node:e[1],at:e[2]}].sort((a,b)=>a.at-b.at||a.node-b.node);
  const unique=[];
  for(const x of pts){
   const prior=unique.at(-1);
   if(prior&&Math.abs(prior.at-x.at)<.08&&prior.node===x.node)continue;
   unique.push(x);
  }
  for(let i=1;i<unique.length;i++){
   const a=unique[i-1],b=unique[i],length=+(b.at-a.at).toFixed(2);
   if(a.node===b.node||length<=0)continue;
   const id=edges.length;edges.push([a.node,b.node,length,e[3],e[4],e[5]]);
   added.push({id,type:'source_split_approx',originalEdgeId:edgeId,
    fromMeters:a.at,toMeters:b.at,sourcePart:e[3],
    originalVerticesUnchanged:true,sourceSimplified:true});
  }
 }
 for(const l of links){
  const id=edges.length;
  const sourcePart=l.c.sourceParts[0],sourceEdge=source.get(sourcePart)?.edges[0];
  if(!sourceEdge){discarded++;continue}
  const raw=graph.edges[sourceEdge.id];
  edges.push([l.from,l.to,l.dist,sourcePart,raw[4],raw[5]]);
  added.push({id,type:'provisional_gap_35m',sourceParts:l.c.sourceParts,
   gapMeters:l.c.gapMeters,kind:l.c.kind,
   anchorLocationsEPSG5179:l.c.anchorsEPSG5179,
   verifiedPassage:false,sourceSimplified:true});
 }
 const ds=Array.from({length:nodes.length},(_,i)=>i);
 const find=i=>{while(ds[i]!==i){ds[i]=ds[ds[i]];i=ds[i]}return i};
 for(const e of edges)if(e[0]!==e[1]&&e[2]>0)ds[find(e[0])]=find(e[1]);
 const componentCount=new Set(ds.map((_,i)=>find(i))).size;
 const gapEdges=added.filter(x=>x.type==='provisional_gap_35m').length;
 const overlay={schema:'sanbak-plan-only-35m-v127',status:'UNVERIFIED_DISPLAY_GEOMETRY',
  sourceGraphUnchanged:true,usableForNavigation:false,graph:{
   ...graph,nodes,edges,summary:{...graph.summary,nodes:nodes.length,
    edges:edges.length,geometric_components:componentCount,
    access_verified:false,navigable:false,physical_junction_verified:false}},
  originalNodeCount:graph.nodes.length,originalEdgeCount:graph.edges.length,
  added,stats:{attempted,discarded,alreadySame,gapEdges,
   splits:added.length-gapEdges,componentsBefore:graph.summary.geometric_components,
   componentsAfter:componentCount}};
 return overlay;
}
export async function build({sourceDir=join(ROOT,'site/data/nationwide-topology'),
 displayDir=join(ROOT,'site/data/nationwide'),outputDir=sourceDir}={}){
 const manifest=JSON.parse(await readFile(join(ROOT,'data/nationwide-topology/manifest.json'),'utf8'));
 const total={mountains:0,candidates:0,bridges:0,discarded:0,sameNode:0,
  splitEdges:0,originalGraphEdgesChanged:0,originalDEMChanged:0};
 await mkdir(outputDir,{recursive:true});
 for(let i=0;i<32;i++){
  const bucket=String(i).padStart(2,'0');
  const topo=JSON.parse(gunzipSync(await readFile(join(sourceDir,'bucket-'+bucket+'.json.gz'))));
  const display=JSON.parse(await readFile(join(displayDir,'bucket-'+bucket+'.json'),'utf8'));
  const audit=JSON.parse(gunzipSync(await readFile(join(sourceDir,'contacts-v125-bucket-'+bucket+'.json.gz'))));
  check(topo.source_zip_sha256===manifest.source_zip_sha256&&
   audit.sourceZipSHA256===manifest.source_zip_sha256,
   'Original topology/candidate provenance disagreement');
  const rows={};
  for(const [code,graph]of Object.entries(topo.mountains)){
   const candidates=audit.mountains?.[code]?.candidates||[];
   const m=materializeMountain(graph,topo.source_files,display.mountains?.[code]||[],candidates);
   rows[code]=m;total.mountains++;total.candidates+=m.stats.attempted;
   total.bridges+=m.stats.gapEdges;total.discarded+=m.stats.discarded;
   total.sameNode+=m.stats.alreadySame;total.splitEdges+=m.stats.splits;
   check(m.originalEdgeCount===graph.edges.length&&
    m.graph.edges.slice(0,graph.edges.length).every((e,j)=>e.every((v,k)=>v===graph.edges[j][k])),
    'Original edge unexpectedly modified');
  }
  await writeFile(join(outputDir,'preview-35m-v127-bucket-'+bucket+'.json.gz'),
   gzipSync(Buffer.from(JSON.stringify({schema:'sanbak-35m-plan-only-bucket-v127',
    bucket,sourceZipSHA256:manifest.source_zip_sha256,
    navigationApproved:false,physicalPassageVerified:false,mountains:rows})),{level:9,mtime:0}));
 }
 check(total.mountains===2902&&total.originalGraphEdgesChanged===0,'Incomplete graph creation');
 await writeFile(join(outputDir,'preview-35m-v127-index.json'),JSON.stringify({
  schema:'sanbak-35m-plan-only-index-v127',sourceZipSHA256:manifest.source_zip_sha256,
  note:'All candidate 35m plan-only connections, never authorize real hiking routes',
  originalDEMUnchanged:true,physicalPassageVerified:false,
  projection:'display geometries 3m simplified; source distance along original edge is approximate',
  counts:total})+'\n');
 return total;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const arg=flag=>{const i=process.argv.indexOf(flag);return i>=0?resolve(process.argv[i+1]):undefined};
 build({sourceDir:arg('--source-dir'),displayDir:arg('--display-dir'),outputDir:arg('--output-dir')})
 .then(x=>console.log('PASS v127 provisional 35m nationwide graph, source unmodified:',JSON.stringify(x)))
 .catch(e=>{console.error(e);process.exitCode=1});
}
