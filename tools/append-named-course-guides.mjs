
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const registry=read('data/mountain-course-index.json'), additions=read('data/additional-named-course-guides.json');let total=0;
for(const [code,routes] of Object.entries(additions.mountains)){
 const c=registry.mountains[code];if(!c){console.log('NAMED_GUIDES_SKIP',code);continue}
 const path=c.catalogFile.replace(/^\.\//,''),cat=read(path);
 const known=new Set(cat.routes.map(r=>r.id));
 for(const r of routes){const {updateExisting,...entry}=r;const i=cat.routes.findIndex(x=>x.id===r.id);if(i<0){cat.routes.push(entry);total++;}else if(updateExisting&&!cat.routes[i].geometryFile&&!cat.routes[i].geometryData){cat.routes[i]={...cat.routes[i],...entry};console.log('NAMED_GUIDE_UPDATED',code,r.id);}}
 writeFileSync(path,JSON.stringify(cat)+'\n');
}
const publicIndexPath='data/public-peak-gpx/index.json';
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
 writeFileSync(dir+'/catalog.json',JSON.stringify({schema:'sanbak-predefined-route-catalog-v1',mountainCode:t.id,name:t.name,routes:t.routes})+'\n');
 unified.guideMountains[t.id]={code:t.id,name:t.name,region:t.region,parkType:'국립',guideOnly:true,center:t.center,zoom:12,catalogFile,sourceUrl:t.sourceUrl,sourceLabel:'공개 기관 산행 안내',routeCount:t.routes.length};
 total+=t.routes.length;console.log('GUIDE_ONLY_MOUNTAIN',t.id,t.routes.length);
}
writeFileSync(unifiedPath,JSON.stringify(unified)+'\n');
console.log('NAMED_GUIDES_ADDED',total);
