import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,o)=>writeFileSync(p,JSON.stringify(o)+'\n');
const root={atob};
const ctx={window:root};
for(const p of ['core/mountain-line-profile.js','core/nationwide-source-loader.js'])new vm.Script(readFileSync(p,'utf8')).runInNewContext(ctx);
const prof=root.SanbakMountainProfiles,agency=root.SanbakNationwideAgency;
const index=read('data/nationwide/index.json').mountains;
const registry=read('data/mountain-course-index.json');
const seeds=read('data/regional-mountain-course-guides.json');
const out='data/park-courses';mkdirSync(out,{recursive:true});
let totalGuide=0,totalRef=0,totalDem=0,totalMountains=0;
const rawCache=new Map(),demCache=new Map();
for(const park of seeds.mountains){
 const {code,name,sourceUrl}=park,entry=index[code];
 if(registry.mountains[code])continue;
 if(!entry)throw Error('Mountain source missing '+code);
 const dir=out+'/'+code;mkdirSync(dir,{recursive:true});
 const bucket=entry.bucket;
 if(!rawCache.has(bucket))rawCache.set(bucket,read('data/nationwide/bucket-'+bucket+'.json'));
 const raw=rawCache.get(bucket);
 const demPath='data/nationwide-elevation/bucket-'+bucket+'.json';
 if(!demCache.has(bucket))demCache.set(bucket,existsSync(demPath)?read(demPath):null);
 const packed=demCache.get(bucket)?.mountains?.[code]||null;
 const lines=prof.forestLines(raw,code,agency.decodeLine).filter(l=>!l.closed&&!l.restricted&&l.coords.length>1&&prof.lengthOf(l.coords)>0);
 const source='산림청 DATA002 기관 원본 (과거 자료)';
 if(!lines.length){console.log('REGIONAL_SKIP',code,name,'no unrestricted source lines');continue;}
 let minLon=Infinity,minLat=Infinity,maxLon=-Infinity,maxLat=-Infinity;for(const l of lines)for(const [lon,lat] of l.coords){minLon=Math.min(minLon,lon);maxLon=Math.max(maxLon,lon);minLat=Math.min(minLat,lat);maxLat=Math.max(maxLat,lat)}
 const center=[(minLat+maxLat)/2,(minLon+maxLon)/2];
 const catalog={schema:'sanbak-predefined-route-catalog-v1',mountainCode:code,name,notes:'공개 산행 안내와 산림청 원본 참고구간을 분리해서 제공. 현재 개방 여부는 관리기관 확인.',routes:park.routes.map(r=>({...r,source:'공개 산행 안내',sourceUrl,geometryStatus:'unverified',profileStatus:'unverified',geometryFile:null,profileFile:null,accessStatus:'unknown',notes:'공개 안내 코스명·경유지. 코스 전체 선형과 고도자료는 아직 등록하지 않음.'}))};
 const features=lines.map(l=>({type:'Feature',properties:{facility_type:'탐방로',name:l.recordName,sourceId:l.id},geometry:{type:'LineString',coordinates:l.coords}}));
 write(dir+'/reference.geojson',{type:'FeatureCollection',features,metadata:{source,currentAccessVerified:false}});
 // Do not invent a route or join segments. Prefer original longer records with
 // usable existing DEM; historical closed/restricted flags are excluded.
 const candidates=lines.filter(l=>!l.multipart&&prof.lengthOf(l.coords)>=400).map(l=>({l,p:prof.profile(l,packed),length:prof.lengthOf(l.coords)}));
 candidates.sort((a,b)=>Number(b.p.status==='ready')-Number(a.p.status==='ready')||b.length-a.length);
 const selected=candidates.slice(0,5);
 if(!selected.length&&lines.length){const l=lines.slice().sort((a,b)=>prof.lengthOf(b.coords)-prof.lengthOf(a.coords))[0];selected.push({l,p:prof.profile(l,packed),length:prof.lengthOf(l.coords)})}
 let ready=0;
 for(const {l,p,length} of selected){
  const id='ref-'+l.recordIndex+'-'+l.partIndex,sourceId=l.id;
  const geomFile=dir+'/'+id+'.geojson',demFile=dir+'/'+id+'-dem.json';
  const r={id,name:l.recordName+' · 원본 '+(l.recordIndex+1)+'번',group:'원본 참고구간',via:['원본 시작점','원본 종점'],source,coverage:'reference',geometryStatus:'reference',geometryFile:'./'+geomFile,profileStatus:'unverified',profileFile:null,accessStatus:'unknown',notes:'산림청 수록 선형 1개 그대로 표시. 특정 대표코스 전체 또는 현행 개방 탐방로라고 확정하지 않음.'};
  write(geomFile,{type:'Feature',properties:{routeId:id,sourceId,source,currentAccessVerified:false,startLabel:'원본 시작점',endLabel:'원본 종점'},geometry:{type:'LineString',coordinates:l.coords}});
  if(p.status==='ready'&&p.points.length>=2){
   write(demFile,{schema:'sanbak-predefined-dem-profile-v1',routeId:id,sourceId,sourceFile:'기존 전국 DEM v109',currentAccessVerified:false,totalMeters:p.distanceMeters,points:p.points});
   r.profileStatus='reference';r.profileFile='./'+demFile;ready++;
  }
  catalog.routes.push(r);
 }
 write(dir+'/catalog.json',catalog);
 registry.mountains[code]={code,name,catalogFile:'./'+dir+'/catalog.json',referenceFile:'./'+dir+'/reference.geojson',center,zoom:11,sourceLabel:'공개 산행 안내 · 산림청 원본 참고자료',sourceUrl};
 totalMountains++;totalGuide+=park.routes.length;totalRef+=selected.length;totalDem+=ready;
 console.log('REGIONAL_COURSES',name,'guides',park.routes.length,'original references',selected.length,'DEM',ready,'background',lines.length);
}
write('data/mountain-course-index.json',registry);
console.log('REGIONAL_BATCH_TOTAL',totalMountains,'mountain codes',totalGuide,'guide courses',totalRef,'original segments',totalDem,'DEM profiles');
