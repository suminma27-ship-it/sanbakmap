/* v125: nationwide source-contact DATA AUDIT, never auto-create routes.
 * Compare 3m-simplified display lines to original EPSG:5179 graph lineage.
 * Output candidates ONLY; 2D crossing and proximity do not prove passage.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';
import '../core/nationwide-source-loader.js';
import '../core/nationwide-map-v106.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ensure=(x,msg)=>{if(!x)throw Error(msg)};
const dec=globalThis.SanbakNationwideAgency.decodeLine;
const xy=globalThis.SanbakLineMapV106.to5179;
const length=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
const pair=(a,b)=>a<b?a+'|'+b:b+'|'+a;
function closest(A,B,C,D){
 const u=[B[0]-A[0],B[1]-A[1]],v=[D[0]-C[0],D[1]-C[1]];
 const z=u[0]*v[1]-u[1]*v[0],w=[C[0]-A[0],C[1]-A[1]];
 if(Math.abs(z)>1e-12){
  const t=(w[0]*v[1]-w[1]*v[0])/z,r=(w[0]*u[1]-w[1]*u[0])/z;
  if(t>=0&&t<=1&&r>=0&&r<=1)
   return {d:0,p:[A[0]+u[0]*t,A[1]+u[1]*t]};
 }
 let best=null;
 const offer=(P,Q)=>{const d=length(P,Q);if(!best||d<best.d)best={d,p:[(P[0]+Q[0])/2,(P[1]+Q[1])/2]}};
 const clamp=t=>Math.max(0,Math.min(1,t));
 for(const P of [A,B]){
  const den=v[0]*v[0]+v[1]*v[1];if(den<1e-12)continue;
  const t=clamp(((P[0]-C[0])*v[0]+(P[1]-C[1])*v[1])/den);
  offer(P,[C[0]+t*v[0],C[1]+t*v[1]]);
 }
 for(const Q of [C,D]){
  const den=u[0]*u[0]+u[1]*u[1];if(den<1e-12)continue;
  const t=clamp(((Q[0]-A[0])*u[0]+(Q[1]-A[1])*u[1])/den);
  offer([A[0]+t*u[0],A[1]+t*u[1]],Q);
 }
 return best;
}
const kind=(a,b,c,d,dist)=>{
 if(dist<.15)return 'crossing_or_overlap';
 const ux=b[0]-a[0],uy=b[1]-a[1],vx=d[0]-c[0],vy=d[1]-c[1];
 const denom=Math.hypot(ux,uy)*Math.hypot(vx,vy);
 return denom>0&&Math.abs((ux*vx+uy*vy)/denom)>.92
  ?'parallel_or_duplicate':'transverse_gap_candidate';
};
/* parts: [{part,component,points:[metric XY]}]. Cell index avoids all-pair scans. */
export function scanDisplayContacts(parts,{maxMeters=35,maxShown=15}={}){
 ensure(maxMeters>0&&maxMeters<=50,'Diagnostic radius must be <=50m');
 const size=50,cells=new Map(),segments=[],candidates=new Map();
 let skippedLong=0;
 const keys=(box,margin=0)=>{
  const ax=Math.floor((box[0]-margin)/size),ay=Math.floor((box[1]-margin)/size),
   bx=Math.floor((box[2]+margin)/size),by=Math.floor((box[3]+margin)/size);
  if((bx-ax+1)*(by-ay+1)>1000)return null;
  const ret=[];for(let x=ax;x<=bx;x++)for(let y=ay;y<=by;y++)ret.push(x+'|'+y);
  return ret;
 };
 for(const part of parts)for(let i=1;i<part.points.length;i++){
  const A=part.points[i-1],B=part.points[i];if(length(A,B)<.01)continue;
  const box=[Math.min(A[0],B[0]),Math.min(A[1],B[1]),Math.max(A[0],B[0]),Math.max(A[1],B[1])];
  const look=keys(box,maxMeters);
  if(!look){skippedLong++;continue}
  const seen=new Set();
  for(const name of look)for(const ix of cells.get(name)||[]){
   if(seen.has(ix))continue;seen.add(ix);
   const s=segments[ix];if(s.part===part.part)continue;
   if(s.box[0]>box[2]+maxMeters||s.box[2]<box[0]-maxMeters||
    s.box[1]>box[3]+maxMeters||s.box[3]<box[1]-maxMeters)continue;
   const p=closest(A,B,s.A,s.B);
   if(!p||p.d>maxMeters)continue;
   const id=pair(part.part,s.part),old=candidates.get(id);
   if(!old||p.d<old.gapMeters-.001)candidates.set(id,{
    sourceParts:[part.part,s.part].sort((a,b)=>a-b),
    gapMeters:+p.d.toFixed(2),
    relation:part.component===s.component?'already_connected':'different_components',
    kind:kind(A,B,s.A,s.B,p.d),
    centerEPSG5179:p.p.map(x=>+x.toFixed(1)),
    originalFullVerticesRechecked:false,passageVerified:false});
  }
  const at=segments.length;segments.push({A,B,box,part:part.part});
  const insert=keys(box);if(!insert){skippedLong++;continue}
  for(const k of insert){if(!cells.has(k))cells.set(k,[]);cells.get(k).push(at)}
 }
 const all=[...candidates.values()];
 const stats={total:all.length,alreadyConnected:0,differentComponents:0,
  transverse:0,crossingOrOverlap:0,parallelOrDuplicate:0};
 for(const p of all){
  stats[p.relation==='already_connected'?'alreadyConnected':'differentComponents']++;
  stats[p.kind==='transverse_gap_candidate'?'transverse':
   p.kind==='crossing_or_overlap'?'crossingOrOverlap':'parallelOrDuplicate']++;
 }
 const priority=p=>p.kind==='transverse_gap_candidate'?0:
  p.kind==='crossing_or_overlap'?1:2;
 all.sort((a,b)=>priority(a)-priority(b)||a.gapMeters-b.gapMeters||
  a.sourceParts[0]-b.sourceParts[0]);
 return {stats,topCandidates:all.slice(0,maxShown),segments:segments.length,skippedLong};
}
const name=(file,row,part)=>String(file).split(/[\\/]/).at(-1)+'|'+row+'|'+part;
export function auditMountain(code,graph,display){
 ensure(graph?.summary?.navigable===false&&graph.summary.access_verified===false&&
  graph.summary.physical_junction_verified===false,'Unverified original graph required');
 ensure(display?.schema==='sanbak-national-institutional-lines-v1'&&
  display.agency==='산림청','Display source mismatch');
 const parent=graph.nodes.map((_,i)=>i),find=i=>{
  while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i;
 };
 for(const e of graph.edges)if(e[0]!==e[1]&&e[2]>0)parent[find(e[0])]=find(e[1]);
 const comp=new Map();
 for(const e of graph.edges)if(!comp.has(e[3]))comp.set(e[3],find(e[0]));
 const lookup=new Map();
 for(let i=0;i<graph.source_parts.length;i++){
  const [file,row,part]=graph.source_parts[i];
  ensure(typeof graph.source_files?.[file]==='string','Original source files missing');
  lookup.set(name(graph.source_files[file],row,part),i);
 }
 let matched=0,unmatched=0;const parts=[];
 for(const record of display.mountains?.[code]||[]){
  const [file,row,,,,sequences]=record;
  if(!Array.isArray(sequences))continue;
  for(let j=0;j<sequences.length;j++){
   const p=lookup.get(name(file,row,j));
   if(!Number.isInteger(p)){unmatched++;continue}
   let coordinates;
   try{coordinates=dec(sequences[j]).map(xy)}catch{unmatched++;continue}
   if(coordinates.length<2)continue;
   parts.push({part:p,component:comp.get(p),points:coordinates});matched++;
  }
 }
 const diagnostic=scanDisplayContacts(parts);
 return {graphComponents:graph.summary.geometric_components,
  sourceParts:graph.source_parts.length,displayMatchedParts:matched,
  displayUnmatchedParts:unmatched,displaySegments:diagnostic.segments,
  skippedLong:diagnostic.skippedLong,contact:diagnostic.stats,
  candidates:diagnostic.topCandidates,createdConnectingEdges:0,
  sourceFullVerticesRechecked:false,currentAccessVerified:false};
}
export async function build({sourceDir=join(ROOT,'site/data/nationwide-topology'),
 displayDir=join(ROOT,'site/data/nationwide'),outputDir=sourceDir}={}){
 const manifest=JSON.parse(await readFile(join(ROOT,'data/nationwide-topology/manifest.json'),'utf8'));
 const index=JSON.parse(await readFile(join(sourceDir,'index.json'),'utf8'));
 ensure(index.schema==='sanbak-topology-audit-index-v102'&&
  index.source_zip_sha256===manifest.source_zip_sha256,'Signed graph source mismatch');
 const total={mountains:0,mountainsWithCandidates:0,candidates:0,
  alreadyConnected:0,differentComponents:0,transverse:0,
  crossingOrOverlap:0,parallelOrDuplicate:0,matchedParts:0,
  unmatchedDisplayParts:0,createdConnectingEdges:0};
 await mkdir(outputDir,{recursive:true});
 const summary={};
 for(let i=0;i<32;i++){
  const bucket=String(i).padStart(2,'0');
  const topo=JSON.parse(gunzipSync(await readFile(join(sourceDir,'bucket-'+bucket+'.json.gz'))));
  const display=JSON.parse(await readFile(join(displayDir,'bucket-'+bucket+'.json'),'utf8'));
  ensure(topo.schema==='sanbak-geometric-topology-v1'&&
   topo.source_zip_sha256===manifest.source_zip_sha256,'Original bucket mismatch '+bucket);
  const results={};
  for(const [code,graph] of Object.entries(topo.mountains)){
   ensure(index.mountains?.[code]?.bucket===bucket,'Mountain bucket mismatch '+code);
   const audit=auditMountain(code,graph,display);
   results[code]=audit;total.mountains++;
   if(audit.contact.total)total.mountainsWithCandidates++;
   total.candidates+=audit.contact.total;
   total.alreadyConnected+=audit.contact.alreadyConnected;
   total.differentComponents+=audit.contact.differentComponents;
   total.transverse+=audit.contact.transverse;
   total.crossingOrOverlap+=audit.contact.crossingOrOverlap;
   total.parallelOrDuplicate+=audit.contact.parallelOrDuplicate;
   total.matchedParts+=audit.displayMatchedParts;
   total.unmatchedDisplayParts+=audit.displayUnmatchedParts;
   summary[code]={bucket,components:audit.graphComponents,
    candidatePairs:audit.contact.total,alreadyConnected:audit.contact.alreadyConnected,
    differentComponents:audit.contact.differentComponents};
  }
  await writeFile(join(outputDir,'contacts-v125-bucket-'+bucket+'.json.gz'),
   gzipSync(Buffer.from(JSON.stringify({schema:'sanbak-contacts-v125-bucket',
    bucket,sourceZipSHA256:manifest.source_zip_sha256,confirmedLinks:0,mountains:results})),
   {level:9,mtime:0}));
 }
 ensure(total.mountains===2902&&total.createdConnectingEdges===0,
  'Incomplete nationwide original topology audit');
 const report={schema:'sanbak-national-contacts-v125',
  sourceZipSHA256:manifest.source_zip_sha256,
  source:'0.1m original graph + 3m simplified display candidate discovery',
  scope:'per mountain; no cross-mountain links',
  fullSourceVerticesAvailable:false,
  warning:'Display lines are 3m simplified. These are unverified candidates, not connections.',
  sourceAccessVerified:false,physicalJunctionVerified:false,createdConnectingEdges:0,
  reportOnly:true,radiusMeters:35,totals:total,mountains:summary};
 await writeFile(join(outputDir,'contacts-v125-index.json'),JSON.stringify(report)+'\n');
 return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const arg=flag=>{const i=process.argv.indexOf(flag);return i<0?undefined:resolve(process.argv[i+1])};
 build({sourceDir:arg('--source-dir'),displayDir:arg('--display-dir'),outputDir:arg('--output-dir')})
 .then(r=>console.log('PASS v125 nationwide candidate-only audit:',JSON.stringify(r.totals)))
 .catch(e=>{console.error(e);process.exitCode=1});
}
