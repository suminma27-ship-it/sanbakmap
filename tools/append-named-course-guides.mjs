
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const registry=read('data/mountain-course-index.json'), additions=read('data/additional-named-course-guides.json');let total=0;
for(const [code,routes] of Object.entries(additions.mountains)){
 const c=registry.mountains[code];if(!c){console.log('NAMED_GUIDES_SKIP',code);continue}
 const path=c.catalogFile.replace(/^\.\//,''),cat=read(path);
 const known=new Set(cat.routes.map(r=>r.id));
 for(const r of routes)if(!known.has(r.id)){cat.routes.push(r);total++;}
 writeFileSync(path,JSON.stringify(cat)+'\n');
}
console.log('NAMED_GUIDES_ADDED',total);
