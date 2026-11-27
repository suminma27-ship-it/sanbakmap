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
 // Ensure named guide additions have a catalog even for mountains not in the initial regional seed list.
const named=read('data/additional-named-course-guides.json');
const seeded=new Set(seeds.mountains.map(m=>m.code));
for(const code of Object.keys(named.mountains||{})){
 if(seeded.has(code)||registry.mountains[code]||!index[code])continue;
 seeds.mountains.push({code,name:index[code].name.replace(/_/g,' · '),type:'미분류',sourceUrl:null,routes:[]});
 seeded.add(code);
}
// Process previously registered catalogs too, without adding new guide routes.
for(const [code,m] of Object.entries(registry.mountains)){
 if(code==='428302602'||seeded.has(code)||!index[code])continue;
 seeds.mountains.push({code,name:m.name,sourceUrl:m.sourceUrl||null,routes:[]});
 seeded.add(code);
}
const out='data/park-courses';mkdirSync(out,{recursive:true});
let totalGuide=0,totalRef=0,totalDem=0,totalMountains=0;
const rawCache=new Map(),demCache=new Map();
for(const park of seeds.mountains){
 const {code,name,sourceUrl}=park,entry=index[code];
 const existing=registry.mountains[code];
 if(code==='428302602')continue; // keep the completed Seorak catalog unchanged
 if(!entry){console.log('REGIONAL_SKIP',code,'no source index');continue;}
 const dir=out+'/'+code;
 const catalogPath=existing?.catalogFile?.replace(/^\.\//,'')||dir+'/catalog.json';
 if(existing&&!existsSync(catalogPath)){console.log('REGIONAL_SKIP',code,'catalog missing',catalogPath);continue;}
 const previous=existing?read(catalogPath):null;
 if(previous&&!previous.routes.some(r=>!r.geometryFile&&!r.geometryData&&Array.isArray(r.via)&&r.via.length>=2))continue;
 mkdirSync(dir,{recursive:true});
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
 const catalog=previous||{schema:'sanbak-predefined-route-catalog-v1',mountainCode:code,name,notes:'공개 산행 안내와 산림청 원본 참고구간을 분리해서 제공. 현재 개방 여부는 관리기관 확인.',routes:park.routes.map(r=>({...r,source:'공개 산행 안내',sourceUrl,geometryStatus:'unverified',profileStatus:'unverified',geometryFile:null,profileFile:null,accessStatus:'unknown',notes:'공개 안내 코스명·경유지. 코스 전체 선형과 고도자료는 아직 등록하지 않음.'}))};
 const features=lines.map(l=>({type:'Feature',properties:{facility_type:'탐방로',name:l.recordName,sourceId:l.id},geometry:{type:'LineString',coordinates:l.coords}}));
 if(!previous)write(dir+'/reference.geojson',{type:'FeatureCollection',features,metadata:{source,currentAccessVerified:false}});
 // Do not invent a route or join segments. Prefer original longer records with
 // usable existing DEM; historical closed/restricted flags are excluded.
 const candidates=lines.filter(l=>!l.multipart&&prof.lengthOf(l.coords)>=400).map(l=>({l,p:prof.profile(l,packed),length:prof.lengthOf(l.coords)}));
 candidates.sort((a,b)=>Number(b.p.status==='ready')-Number(a.p.status==='ready')||b.length-a.length);
 // A named guide can use an individual existing source line only when its
 // source title itself contains the guide's explicit start, end and via labels in order.
 // A generic source title is never used to claim a named summit course.
 const norm=v=>String(v).normalize('NFKC').replace(/[^가-힣a-zA-Z0-9]/g,'').toLowerCase();
 let linked=0;
 for(const route of catalog.routes){
  if(route.geometryFile||route.geometryData||!Array.isArray(route.via)||route.via.length<2)continue;
  const tokens=route.via.map(norm);
  if(tokens.some(t=>t.length<2))continue;
  const matches=candidates.filter(({l})=>{
   const n=norm(l.recordName);let at=0;
   for(const t of tokens){const i=n.indexOf(t,at);if(i<0)return false;at=i+t.length}return true;
  });
  if(matches.length!==1)continue;
  const {l,p}=matches[0],id=route.id,geomFile=dir+'/'+id+'.geojson',demFile=dir+'/'+id+'-dem.json';
  write(geomFile,{type:'Feature',properties:{routeId:id,sourceId:l.id,source,currentAccessVerified:false,startLabel:'원본 시작점',endLabel:'원본 종점'},geometry:{type:'LineString',coordinates:l.coords}});
  Object.assign(route,{coverage:'partial',geometryStatus:'reference',geometryFile:'./'+geomFile,notes:'공개 안내 경유지와 원본 레코드 명칭이 일치하는 참고선. 전체 공식 코스와 동일하거나 현행 개방됨을 확정하지 않음.'});
  if(p.status==='ready'&&p.points.length>=2){write(demFile,{routeId:id,totalMeters:p.distanceMeters,points:p.points});route.profileStatus='reference';route.profileFile='./'+demFile;}
  linked++;console.log('REGIONAL_GUIDE_LINK',code,id,l.recordName,'DEM',route.profileStatus);
 }
 if(park.routes.length)console.log('REGIONAL_SOURCE_NAMES',code,JSON.stringify([...new Set(lines.map(l=>l.recordName))].slice(0,60)));
 if(previous){
  if(linked)write(catalogPath,catalog);
  console.log('REGIONAL_BACKFILL',code,linked);
  continue;
 }
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
 write(catalogPath,catalog);
 registry.mountains[code]={code,name,catalogFile:'./'+dir+'/catalog.json',referenceFile:'./'+dir+'/reference.geojson',center,zoom:11,sourceLabel:'공개 산행 안내 · 산림청 원본 참고자료',sourceUrl};
 totalMountains++;totalGuide+=park.routes.length;totalRef+=selected.length;totalDem+=ready;
 console.log('REGIONAL_COURSES',name,'guides',park.routes.length,'guide links',linked,'original references',selected.length,'DEM',ready,'background',lines.length);
}
write('data/mountain-course-index.json',registry);
console.log('REGIONAL_BATCH_TOTAL',totalMountains,'mountain codes',totalGuide,'guide courses',totalRef,'original segments',totalDem,'DEM profiles');
