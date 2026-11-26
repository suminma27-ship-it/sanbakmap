
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const registryPath='data/mountain-course-index.json',registry=read(registryPath), additions=read('data/additional-named-course-guides.json'),national=read('data/nationwide/index.json').mountains;let total=0;
for(const [code,routes] of Object.entries(additions.mountains)){
 let c=registry.mountains[code];if(!c){
  const m=national[code];if(!m){console.log('NAMED_GUIDES_SKIP',code);continue}
  const dir='data/park-courses/'+code;mkdirSync(dir,{recursive:true});
  const name=m.name.replace(/_/g,' · '),catalogFile='./'+dir+'/catalog.json';
  c={code,name,catalogFile,sourceLabel:'공개 산행 안내 · 선형 미등록',sourceUrl:routes[0]?.sourceUrl||null};
  registry.mountains[code]=c;
  writeFileSync(dir+'/catalog.json',JSON.stringify({schema:'sanbak-predefined-route-catalog-v1',mountainCode:code,name,routes:[]})+'\n');
  console.log('NAMED_GUIDES_CATALOG_CREATED',code);
 }
 const path=c.catalogFile.replace(/^\.\//,''),cat=read(path);
 const known=new Set(cat.routes.map(r=>r.id));
 for(const r of routes){const {updateExisting,...entry}=r;const i=cat.routes.findIndex(x=>x.id===r.id);if(i<0){cat.routes.push(entry);total++;}else if(updateExisting&&!cat.routes[i].geometryFile&&!cat.routes[i].geometryData){cat.routes[i]={...cat.routes[i],...entry};console.log('NAMED_GUIDE_UPDATED',code,r.id);}}
 writeFileSync(path,JSON.stringify(cat)+'\n');
}
writeFileSync(registryPath,JSON.stringify(registry)+'\n');
const publicIndexPath='data/public-peak-gpx/index.json';
const peakIndex=existsSync(publicIndexPath)?read(publicIndexPath).mountains:{};
if(existsSync(publicIndexPath)){
 const publicIndex=read(publicIndexPath);
 for(const target of additions.publicPeakTargets||[]){
  const candidates=Object.values(publicIndex.mountains||{}).filter(p=>p.name.replace(/\s/g,'')===target.name&&Math.abs(p.center[0]-target.center[0])<=target.maxLatDelta&&Math.abs(p.center[1]-target.center[1])<=target.maxLonDelta);
  if(candidates.length!==1){console.log('PUBLIC_GUIDE_TARGET_SKIP',target.name,candidates.length);continue}
  const p=candidates[0],path=p.catalogFile.replace(/^\.\//,''),cat=read(path);
  let n=0;for(const r of target.routes){if(!cat.routes.some(x=>x.id===r.id)){cat.routes.push(r);n++;total++;}}
  writeFileSync(path,JSON.stringify(cat)+'\n');console.log('PUBLIC_GUIDE_TARGET_ADDED',target.name,p.code,n);
 }
}
const unifiedPath='data/unified-mountain-index.json',unified=read(unifiedPath);
unified.guideMountains={};
for(const t of additions.guideOnlyMountains||[]){
 if(!/^guide-[a-z]+$/.test(t.id))throw Error('invalid guide id');
 const dir='data/park-courses/'+t.id;mkdirSync(dir,{recursive:true});
 const catalogFile='./'+dir+'/catalog.json';
 // Expose geographically compatible public original tracks separately from the named guides.
 const normalize=n=>String(n).normalize('NFKC').replace(/[\s_·-]/g,'');
 const peaks=Object.values(peakIndex).filter(p=>normalize(p.name)===normalize(t.name)&&Array.isArray(p.center)&&Math.hypot((p.center[0]-t.center[0])*111,(p.center[1]-t.center[1])*91)<=12);
 const original=[];
 for(const p of peaks){const path=p.catalogFile.replace(/^\.\//,'');if(!existsSync(path))continue;
  for(const r of read(path).routes||[]){if(!r.geometryData?.geometry?.coordinates?.length)continue;const id='public-'+p.code+'-'+r.id;
   original.push({...r,id,group:'원본 참고구간',name:r.name+' (공공 GPX)',geometryData:{...r.geometryData,properties:{...r.geometryData.properties,routeId:id}},profileData:r.profileData?{...r.profileData,routeId:id}:null});
  }
 }
 writeFileSync(dir+'/catalog.json',JSON.stringify({schema:'sanbak-predefined-route-catalog-v1',mountainCode:t.id,name:t.name,routes:[...t.routes,...original]})+'\n');
 console.log('GUIDE_ONLY_GPX_REFERENCE',t.id,original.length);
 unified.guideMountains[t.id]={code:t.id,name:t.name,region:t.region,parkType:'국립',guideOnly:true,center:t.center,zoom:12,catalogFile,sourceUrl:t.sourceUrl,sourceLabel:'공개 기관 산행 안내',routeCount:t.routes.length};
 total+=t.routes.length;console.log('GUIDE_ONLY_MOUNTAIN',t.id,t.routes.length);
}
writeFileSync(unifiedPath,JSON.stringify(unified)+'\n');
console.log('NAMED_GUIDES_ADDED',total);
