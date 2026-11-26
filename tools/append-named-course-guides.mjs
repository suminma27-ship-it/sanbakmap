
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const registry=read('data/mountain-course-index.json'), additions=read('data/additional-named-course-guides.json');let total=0;
for(const [code,routes] of Object.entries(additions.mountains)){
 const c=registry.mountains[code];if(!c){console.log('NAMED_GUIDES_SKIP',code);continue}
 const path=c.catalogFile.replace(/^\.\//,''),cat=read(path);
 const known=new Set(cat.routes.map(r=>r.id));
 for(const r of routes){const {updateExisting,...entry}=r;const i=cat.routes.findIndex(x=>x.id===r.id);if(i<0){cat.routes.push(entry);total++;}else if(updateExisting&&!cat.routes[i].geometryFile&&!cat.routes[i].geometryData){cat.routes[i]={...cat.routes[i],...entry};console.log('NAMED_GUIDE_UPDATED',code,r.id);}}
 writeFileSync(path,JSON.stringify(cat)+'\n');
}
console.log('NAMED_GUIDES_ADDED',total);
