import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v)+'\n');
const index=read('data/unified-mountain-index.json'),registry=read('data/mountain-course-index.json'),national=read('data/nationwide/index.json').mountains;
const root={};new vm.Script(readFileSync('core/nationwide-map-v106.js','utf8')).runInNewContext({window:root});
const project=root.SanbakLineMapV106.to5179;
root.atob=atob;
for(const p of ['core/mountain-line-profile.js','core/nationwide-source-loader.js'])new vm.Script(readFileSync(p,'utf8')).runInNewContext({window:root});
const prof=root.SanbakMountainProfiles,agency=root.SanbakNationwideAgency;
const rawCache=new Map(),demCache=new Map();
function bucketFile(cache,dir,bucket){
 if(!cache.has(bucket)){const p='data/'+dir+'/bucket-'+bucket+'.json';cache.set(bucket,existsSync(p)?read(p):null)}
 return cache.get(bucket);
}

// Reuse the already acquired source node coordinates solely as labeled points.
// No new graph creation, pathfinding, gap filling, or DEM resampling.
const chunks=Array.from({length:16},(_,i)=>{
 const p='data/nationwide-topology/pack-'+String(i).padStart(2,'0')+'.js';
 return JSON.parse(readFileSync(p,'utf8').match(/\)\[\d+\]=("[A-Za-z0-9+/=]+");?\s*$/)[1]);
});
const topo=JSON.parse(gunzipSync(Buffer.from(chunks.join(''),'base64')).toString('utf8'));
const poiCache=new Map();const norm=v=>String(v||'').normalize('NFKC').replace(/[\s_·()\-]/g,'');
const generic=new Set(['정상','분기점','시종점','대피소','등산로','입구','시작점','종점','원본출발점','원본도착점']);
const meters=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function pointsFor(code){
 const bucket=national[code]?.bucket;if(!bucket)return [];
 if(!poiCache.has(bucket))poiCache.set(bucket,JSON.parse(gunzipSync(readFileSync('data/nationwide-pois/bucket-'+bucket+'.json.gz')).toString('utf8')));
 const g=topo[bucket]?.mountains?.[code];if(!g)return [];
 const points=[];
 for(const r of poiCache.get(bucket).mountains?.[code]||[]){
  const [node,kind,label]=r,xy=g.nodes[node];if(!xy||![0,1,2,3].includes(kind))continue;
  const name=String(label||'').trim(),key=norm(name);
  if(kind!==2&&(!key||generic.has(key)||key.length<2))continue;
  points.push({node,kind,name:key&&!generic.has(key)?name:(kind===2?'정상(기관 기록)':''),key:key&&!generic.has(key)?key:'',xy:[xy[0]/10,xy[1]/10]});
 }
 return points;
}
function nearestEnd(points,xy,max=100,kind=null){
 const near=points.filter(p=>(kind===null||p.kind===kind)&&meters(p.xy,xy)<=max).sort((a,b)=>meters(a.xy,xy)-meters(b.xy,xy));
 if(!near.length)return null;
 const a=near[0];if(near.some(p=>p.name!==a.name&&meters(p.xy,xy)-meters(a.xy,xy)<20))return null;
 return a;
}
function matchesRoute(route,points,xy){
 if(route.via.length<2||xy.length<2)return false;
 const keys=route.via.map(norm);if(keys.some(k=>!k||generic.has(k)))return false;
 let cursor=0;
 for(let i=0;i<keys.length;i++){
  const candidates=points.filter(p=>p.key===keys[i]);if(!candidates.length)return false;
  let best=-1,bestD=Infinity;
  const lo=i===0?0:i===keys.length-1?xy.length-1:cursor+1;
  const hi=i===0?0:i===keys.length-1?xy.length-1:xy.length-2;
  for(let j=lo;j<=hi;j++)for(const p of candidates){const d=meters(p.xy,xy[j]);if(d<bestD&&d<=100){best=j;bestD=d}}
  if(best<0||i>0&&best<=cursor)return false;
  cursor=best;
 }
 return true;
}
function reverseTrack(r){
 const coords=r.geometryData.geometry.coordinates.slice().reverse();
 const total=r.profileData?.totalMeters;
 const profileData=r.profileData?{...r.profileData,points:r.profileData.points.slice().reverse().map(p=>({...p,distanceMeters:+(total-p.distanceMeters).toFixed(3)}))}:null;
 return {...r,geometryData:{...r.geometryData,geometry:{type:'LineString',coordinates:coords}},profileData};
}

function forestReference(code,guides,points){
 const bucket=national[code]?.bucket;if(!bucket||!guides.length)return 0;
 const raw=bucketFile(rawCache,'nationwide',bucket);if(!raw)return 0;
 const packed=bucketFile(demCache,'nationwide-elevation',bucket)?.mountains?.[code]||null;
 let lines;
 try{lines=prof.forestLines(raw,code,agency.decodeLine).filter(l=>!l.closed&&!l.restricted&&!l.multipart&&l.coords.length>=2)}catch(e){console.log('NAMED_FOREST_SKIP',code,e.message);return 0}
 const candidates=lines.map(l=>({l,metres:prof.lengthOf(l.coords),xy:l.coords.map(project)})).filter(x=>Number.isFinite(x.metres)&&x.metres>0);
 let count=0;
 for(const guide of guides){
  const matches=[];
  for(const c of candidates){
   if(Number.isFinite(guide.guideKm)&&Math.abs(c.metres/1000-guide.guideKm)>Math.max(.5,guide.guideKm*.25))continue;
   const forward=matchesRoute(guide,points,c.xy);
   const backward=!forward&&matchesRoute(guide,points,c.xy.slice().reverse());
   // A source title alone does not establish coordinate direction or endpoint identity.
   // Only a point-based ordered match can assign the named route.
   if(forward||backward)matches.push({...c,backward});
  }
  if(matches.length!==1)continue;
  const {l,metres,backward}=matches[0],p=prof.profile(l,packed),ready=p.status==='ready'&&p.points.length>=2;
  const coords=backward?l.coords.slice().reverse():l.coords;
  const samples=ready?(backward?p.points.slice().reverse().map(pt=>({...pt,distanceMeters:p.distanceMeters-pt.distanceMeters})):p.points):null;
  Object.assign(guide,{
   geometryStatus:'reference',geometryFile:null,
   geometryData:{type:'Feature',properties:{routeId:guide.id,sourceId:l.id,source:'산림청 DATA002 원본',sourceDistanceMeters:metres,startLabel:guide.via[0],endLabel:guide.via.at(-1),currentAccessVerified:false},geometry:{type:'LineString',coordinates:coords}},
   profileStatus:ready?'reference':'unverified',profileFile:null,
   profileData:ready?{routeId:guide.id,totalMeters:p.distanceMeters,points:samples}:null,
   profileSource:'dem',coverage:'reference',
   notes:'산림청 원본 등산로 단일 기록의 양끝·안내 경유지 위치가 대응하는 참고 경로. 선형을 이어 붙이지 않았으며 현행 통행 여부는 별도 확인.'+(ready?' 기존 DEM 고도표본 사용.':' 기존 DEM 고도표본 미확인.')
  });
  count++;console.log('NAMED_FOREST_MATCH',code,guide.id,guide.name,l.id,'DEM',ready);
 }
 return count;
}

 // Offline reference-course generation only. Use exact shared vertices of
 // historical source polylines; no distance-based joining or inserted edges.
function buildStaticReference(code,guides,points){
 if(!guides.length||!points.length)return 0;
 const bucket=national[code]?.bucket;if(!bucket)return 0;
 const raw=bucketFile(rawCache,'nationwide',bucket);if(!raw)return 0;
 const packed=bucketFile(demCache,'nationwide-elevation',bucket)?.mountains?.[code]||null;
 let lines;try{lines=prof.forestLines(raw,code,agency.decodeLine).filter(l=>!l.closed&&!l.restricted&&l.coords.length>=2)}catch(e){console.log('STATIC_REFERENCE_SKIP',code,e.message);return 0}
 const vertices=[],ids=new Map(),adj=[],sourceLines=[];
 const vertex=c=>{const key=c[0]+','+c[1];if(ids.has(key))return ids.get(key);const i=vertices.length;ids.set(key,i);vertices.push({c,xy:project(c)});adj.push([]);return i};
 for(const l of lines){
  const idx=sourceLines.length,cum=[0],v=l.coords.map(vertex);
  for(let i=1;i<v.length;i++){
   const a=v[i-1],b=v[i],w=meters(vertices[a].xy,vertices[b].xy);
   cum.push(cum.at(-1)+w);if(a===b||!Number.isFinite(w)||w<=0)continue;
   adj[a].push({to:b,w,idx,a:i-1,b:i});adj[b].push({to:a,w,idx,a:i,b:i-1});
  }
  sourceLines.push({l,cum,total:cum.at(-1),p:undefined});
 }
 const mountainNames=String(national[code]?.name||'').split('_').map(norm);
 const alias=k=>norm(k).replace(/(?:정상|탐방지원센터|탐방안내소|관리사무소|주차장|입구)$/,'');
 function candidateNodes(label){
  const k=norm(label);if(!k||generic.has(k)&&k!=='정상')return [];
  let matches=points.filter(p=>p.key===k);
  if(!matches.length&&alias(k).length>=2)matches=points.filter(p=>p.key&&alias(p.key)===alias(k));
  if(!matches.length&&(k==='정상'||mountainNames.some(n=>k===n||k===n+'정상'))){
   const tops=points.filter(p=>p.kind===2);
   if(tops.length&&tops.every(p=>meters(p.xy,tops[0].xy)<=100))matches=tops;
  }
  const found=new Map();
  for(const p of matches){
   let best=-1,dist=100;
   for(let i=0;i<vertices.length;i++){const d=meters(vertices[i].xy,p.xy);if(d<dist){dist=d;best=i}}
   if(best>=0)found.set(best,Math.min(found.get(best)??Infinity,dist));
  }
  // A named point can be attached to a nearby existing vertex for display,
  // but no connector from that point to the vertex is drawn.
  return [...found].sort((a,b)=>a[1]-b[1]).map(x=>x[0]);
 }
 function shortest(start,end){
  if(start===end)return [];
  const d=new Float64Array(vertices.length);d.fill(Infinity);d[start]=0;
  const prev=new Array(vertices.length),heap=[];
  function push(x){let i=heap.length;heap.push(x);while(i){const j=(i-1)>>1;if(heap[j][0]<=x[0])break;heap[i]=heap[j];i=j}heap[i]=x}
  function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let j=2*i+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(heap[j][0]>=last[0])break;heap[i]=heap[j];i=j}heap[i]=last}return top}
  push([0,start]);
  while(heap.length){const [cost,u]=pop();if(cost!==d[u])continue;if(u===end)break;
   for(const e of adj[u]){const nd=cost+e.w;if(nd<d[e.to]){d[e.to]=nd;prev[e.to]={from:u,e};push([nd,e.to])}}
  }
  if(!Number.isFinite(d[end]))return null;
  const out=[];for(let u=end;u!==start;){const p=prev[u];if(!p)return null;out.push(p.e);u=p.from}return out.reverse();
 }
 function samplesAt(record){
  if(record.p===undefined)record.p=prof.profile(record.l,packed);
  return record.p.status==='ready'&&record.p.points.length>=2?record.p:null;
 }
 function altitude(profile,dist){
  const p=profile.points;let lo=0,hi=p.length-1;
  while(hi-lo>1){const m=(hi+lo)>>1;if(p[m].distanceMeters<=dist)lo=m;else hi=m}
  const a=p[lo],b=p[hi],t=Math.max(0,Math.min(1,(dist-a.distanceMeters)/(b.distanceMeters-a.distanceMeters||1)));
  return a.elevationMeters+(b.elevationMeters-a.elevationMeters)*t;
 }
 let linked=0;
 for(const guide of guides){
  const nodes=guide.via.map(candidateNodes);
  if(nodes.some(a=>a.length!==1))continue;
  const ordered=nodes.map(a=>a[0]),edges=[];let missing=false;
  for(let i=1;i<ordered.length;i++){
   if(ordered[i]===ordered[i-1]){missing=true;break}
   const leg=shortest(ordered[i-1],ordered[i]);if(!leg||!leg.length){missing=true;break}edges.push(...leg);
  }
  if(missing||!edges.length)continue;
  const total=edges.reduce((n,e)=>n+e.w,0);
  if(total<=0||Number.isFinite(guide.guideKm)&&Math.abs(total/1000-guide.guideKm)>Math.max(1,guide.guideKm*.35))continue;
  const coords=[vertices[ordered[0]].c,...edges.map(e=>vertices[e.to].c)];
  const elevation=[];let offset=0,full=true;
  for(const e of edges){
   const source=sourceLines[e.idx],p=samplesAt(source);
   if(!p||source.total<=0){full=false;break}
   const a=source.cum[e.a]/source.total*p.distanceMeters,b=source.cum[e.b]/source.total*p.distanceMeters;
   if(a===b){full=false;break}
   const internal=p.points.filter(q=>q.distanceMeters>Math.min(a,b)&&q.distanceMeters<Math.max(a,b)).map(q=>q.distanceMeters);
   if(b<a)internal.reverse();
   for(const q of [a,...internal,b]){
    const distanceMeters=offset+e.w*Math.abs((q-a)/(b-a)),elevationMeters=altitude(p,q);
    if(elevation.length&&distanceMeters<=elevation.at(-1).distanceMeters+1e-6)continue;
    elevation.push({distanceMeters,elevationMeters});
   }
   offset+=e.w;
  }
  full=full&&elevation.length>=2;
  const sourceIds=[...new Set(edges.map(e=>sourceLines[e.idx].l.id))];
  Object.assign(guide,{geometryStatus:'reference',geometryFile:null,
   geometryData:{type:'Feature',properties:{routeId:guide.id,sourceIds,source:'산림청 DATA002 기존 선형',sourceDistanceMeters:total,startLabel:guide.via[0],endLabel:guide.via.at(-1),currentAccessVerified:false},geometry:{type:'LineString',coordinates:coords}},
   profileStatus:full?'reference':'unverified',profileFile:null,profileData:full?{routeId:guide.id,totalMeters:total,points:elevation}:null,
   profileSource:'dem',coverage:'reference',staticReference:true,
   notes:'공개 안내 경유지 순서에 맞춰 기존 산림청 등산로의 동일 좌표 접점으로 구성한 고정 참고코스. 공식 전체 코스와 일치하거나 현재 통행 가능함을 보장하지 않음. '+(full?'기존 DEM 표본을 선형 거리 기준 보간.':'일부 원본 DEM 미확보로 전체 고도 미표시.')});
  linked++;console.log('STATIC_REFERENCE_MATCH',code,guide.id,sourceIds.length,'DEM',full);
 }
 return linked;
}
let summit=0,endpoint=0,named=0,changedPeaks=0,processed=0,forestNamed=0,staticNamed=0;
for(const code of new Set([...Object.keys(registry.mountains||{}),...Object.keys(index.mountains||{})])){
 const link=index.mountains?.[code]||{};
 const points=pointsFor(code);if(!points.length)continue;
 const conf=registry.mountains[code],catPath=conf?.catalogFile?.replace(/^\.\//,''),cat=catPath&&existsSync(catPath)?read(catPath):null;
 const pendingGuides=(cat?.routes||[]).filter(r=>!r.geometryFile&&!r.geometryData&&r.via?.length>=2);
 const linkedForest=forestReference(code,pendingGuides,points);forestNamed+=linkedForest;
 const namedGuides=pendingGuides.filter(r=>!r.geometryFile&&!r.geometryData);
 const matchedGuides=new Map();
 for(const peak of link.peaks||[]){
  const path=peak.catalogFile.replace(/^\.\//,'');if(!existsSync(path))continue;
  const d=read(path);let dirty=false;
  for(const r of d.routes||[]){
   const coords=r.geometryData?.geometry?.coordinates;if(!Array.isArray(coords)||coords.length<2)continue;
   let xy;try{xy=coords.map(project)}catch{continue}
   processed++;
   const first=nearestEnd(points,xy[0],100),last=nearestEnd(points,xy.at(-1),100);
   const firstTop=nearestEnd(points,xy[0],100,2),lastTop=nearestEnd(points,xy.at(-1),100,2);
   if(firstTop||lastTop){
    r.group='정상코스';
    r.name=r.name+' · 정상 인접 참고구간';
    r.notes+=' 산림청 기록 정상 지점에서 100m 이내인 끝점이 있는 GPX 구간. 전체 정상코스 또는 실제 정상 도달 보장은 아님.';
    summit++;dirty=true;
   }
   const start=firstTop||first,end=lastTop||last;
   if(start||end){
    r.via=[start?.name||'원본 출발점',end?.name||'원본 도착점'];
    r.geometryData.properties.startLabel=r.via[0];r.geometryData.properties.endLabel=r.via[1];
    r.notes+=' 끝점 명칭은 100m 이내의 기관 주요지점 참고 명칭.';
    endpoint++;dirty=true;
   }
   for(const guide of namedGuides){
    if(Number.isFinite(guide.guideKm)&&Math.abs((r.geometryData.properties.sourceDistanceMeters||0)/1000-guide.guideKm)>Math.max(.5,guide.guideKm*.25))continue;
    const forward=matchesRoute(guide,points,xy),backward=!forward&&matchesRoute(guide,points,xy.slice().reverse());
    if(!forward&&!backward)continue;
    const list=matchedGuides.get(guide.id)||[];list.push(backward?reverseTrack(r):r);matchedGuides.set(guide.id,list);
   }
  }
  if(dirty){write(path,d);changedPeaks++;}
 }
 if(cat){
  for(const guide of namedGuides){
   const matches=matchedGuides.get(guide.id)||[];if(matches.length!==1)continue;
   const r=matches[0];
   Object.assign(guide,{geometryStatus:'reference',geometryData:{...r.geometryData,properties:{...r.geometryData.properties,routeId:guide.id,startLabel:guide.via[0],endLabel:guide.via.at(-1)}},profileStatus:r.profileStatus,profileData:r.profileData?{...r.profileData,routeId:guide.id}:null,profileSource:'gpx',coverage:'reference',notes:'공공 GPX 단일 원본 구간의 양끝·안내 경유지가 산림청 주요지점 명칭 및 위치와 대응하는 참고 경로. 실제 개방 여부는 별도 확인. 기록 고도 사용.'});
   named++;console.log('NAMED_GPX_MATCH',code,guide.id,guide.name);
  }
  const staticMatches=buildStaticReference(code,namedGuides.filter(r=>!r.geometryFile&&!r.geometryData),points);staticNamed+=staticMatches;
  if(linkedForest||matchedGuides.size||staticMatches)write(catPath,cat);
 }
}
console.log('GPX_CLASSIFICATION_TOTAL',JSON.stringify({processed,changedPeaks,summit,endpoint,named,forestNamed,staticNamed}));
