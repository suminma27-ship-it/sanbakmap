import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v)+'\n');
const seeds=read('data/peak-gpx-course-seeds.json'),registry=read('data/mountain-course-index.json');
let count=0;
for(const r of seeds.routes){
 try{
  const b=Buffer.from(r.encoded,'base64');
  if(createHash('sha256').update(b).digest('hex')!==r.sha)throw Error('source sample checksum');
  let i=0,last=[0,0,0,0],pts=[];
  while(i<b.length){const next=[];for(let k=0;k<4;k++){let n=0,shift=0;while(true){if(i>=b.length||shift>35)throw Error('truncated sample');const x=b[i++];n+=(x&127)*2**shift;if(!(x&128))break;shift+=7}last[k]+=n%2?-(Math.floor(n/2)+1):n/2;next.push(last[k])}pts.push(next);}
  if(pts.length!==r.count||pts.at(-1)[3]!==r.metres||pts.some((p,i)=>p[0]<124e6||p[0]>132e6||p[1]<33e6||p[1]>39e6||(i&&p[3]<=pts[i-1][3])))throw Error('source sample length/coordinate');
  const conf=registry.mountains[r.code];if(!conf)throw Error('catalog not available');
  const catPath=conf.catalogFile.replace(/^\.\//,''),cat=read(catPath);
  const dir='data/peak-gpx-courses';mkdirSync(dir,{recursive:true});
  const geomFile=dir+'/'+r.id+'.geojson',profileFile=dir+'/'+r.id+'-profile.json';
  const source=seeds.source,coords=pts.map(p=>[p[0]/1e6,p[1]/1e6]);
  const points=pts.map(p=>({distanceMeters:p[3],elevationMeters:p[2]/10}));
  write(geomFile,{type:'Feature',properties:{routeId:r.id,source,sourceUrl:seeds.sourceUrl,sourceFile:r.sourceFile,sourceDistanceMeters:r.metres,startLabel:r.via[0],endLabel:r.via[1],currentAccessVerified:false,sampling:seeds.sampling},geometry:{type:'LineString',coordinates:coords}});
  write(profileFile,{schema:'sanbak-predefined-dem-profile-v1',routeId:r.id,sourceType:'gpx',source,sourceFile:r.sourceFile,totalMeters:r.metres,points});
  cat.routes=cat.routes.filter(x=>x.id!==r.id);
  cat.routes.unshift({id:r.id,name:r.name+' (공공 GPX)',group:r.group,via:r.via,source,sourceUrl:seeds.sourceUrl,sourceFile:r.sourceFile,coverage:'reference',geometryStatus:'reference',geometryFile:'./'+geomFile,profileStatus:'reference',profileFile:'./'+profileFile,profileSource:'gpx',accessStatus:'unknown',notes:'기관 제공 2022년 GPX 원본 참고코스. 출발·도착의 지명은 방면 또는 원본점 기준이며 현재 개방이나 정확한 정상 도달을 확정하지 않음. '+seeds.sampling});
  write(catPath,cat);count++;
  console.log('PEAK_GPX',r.code,r.id,r.metres+'m',pts.length+' points');
 }catch(e){console.log('::warning::PEAK_GPX '+r.id+' '+e.message);}
}
console.log('PEAK_GPX_TOTAL',count,'of',seeds.routes.length);
