// v78: only exact-source-node-linked OSM footways and unpaved/non-grade1 tracks are displayed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const file=name=>readFileSync(new URL(name,root),'utf8');
const extract=(name,key)=>JSON.parse(gunzipSync(Buffer.from(file(name).match(new RegExp(key+"='([^']+)'"))?.[1]||'','base64')).toString('utf8'));
const v77=extract('seorak-v77-extra.js','SANBAK_SEORAK_V77_B64');
const v78=extract('seorak-v78-extra.js','SANBAK_SEORAK_V78_B64');
assert.equal(v78.v,78);
assert.equal(v78.source,'OSM 2026-11-05');
assert.equal(v78.boundary_id,'17335482');
assert.equal(v78.buffer_m,1500);
assert.equal(v78.route_allowed,false);
assert.equal(v78.paths.length,9);
assert.equal(new Set(v78.paths.map(r=>r.i)).size,9);
const v75=JSON.parse(file('national-parks-trails.html').match(/<script id="seorak-border-v75" type="application\/json">([\s\S]*?)<\/script>/)?.[1]);
const v76=extract('seorak-v76-extra.js','SANBAK_SEORAK_V76_B64');
const old=new Set([...v75.features.map(f=>String(f.properties.osm_id)),...v76.paths.map(f=>String(f.i)),...v77.a.map(f=>String(f.i))]);
const decode=encoded=>{
 const out=[],last=[0,0];let pos=0;
 while(pos<encoded.length){
  const point=[];
  for(let k=0;k<2;k++){
   let value=0,shift=0,part=0;
   do{
    assert(pos<encoded.length,'truncated source polyline');
    part=encoded.charCodeAt(pos++)-63;
    assert(part>=0&&part<64);
    value+=(part%32)*2**shift;shift+=5;
    assert(shift<=60);
   }while(part>=32);
   last[k]+=(value%2?-(Math.floor(value/2)+1):value/2);
   point.push(last[k]/1e7);
  }
  out.push(point);
 }
 return out;
};
const shared=new Set(v77.a.flatMap(row=>decode(row.e).map(p=>p.join(','))));
const types={};let metres=0;
const distance=(a,b)=>{
 const dr=Math.PI/180,lat=(b[1]-a[1])*dr,lon=(b[0]-a[0])*dr;
 const k=Math.sin(lat/2)**2+Math.cos(a[1]*dr)*Math.cos(b[1]*dr)*Math.sin(lon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(k)));
};
for(const row of v78.paths){
 assert(Number.isInteger(row.i)&&row.i>0&&!old.has(String(row.i)),'existing way duplicated');
 assert(['footway','track'].includes(row.h),'unexpected road type');
 assert(Array.isArray(row.p)&&row.p.length>=2,'invalid way geometry');
 assert(Array.isArray(row.j)&&row.j.length===2,'missing evidence junction');
 assert(shared.has(row.j.join(',')),'junction absent from exact v77 source geometry');
 assert(row.p.some(p=>p[0]===row.j[0]&&p[1]===row.j[1]),'junction absent from added way');
 types[row.h]=(types[row.h]||0)+1;
 for(const p of row.p)assert(p.length===2&&p.every(Number.isFinite)&&p[0]>128.1&&p[0]<128.75&&p[1]>37.9&&p[1]<38.38);
 for(let i=1;i<row.p.length;i++)metres+=distance(row.p[i-1],row.p[i]);
}
assert.deepEqual(types,{track:3,footway:6});
assert(metres>1900&&metres<2200,'unexpected new source line length '+metres);
const html=file('national-parks-trails.html');
assert(html.includes('seorak-v78-extra.js'));
assert(html.includes('outerSeorak.features.push(...added78)'));
assert(html.includes('v77SourceNodes.has(r.j.join'));
assert(!html.includes('window.SanbakNationalRoutes.shortest'),'no new routing allowed');
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,2);
for(const script of inline)new Function(script[1]);
assert(file('sw.js').includes('./seorak-v78-extra.js'));
assert(file('.github/workflows/deploy-pages.yml').includes('seorak-v78-extra.js'));
console.log('PASS v78: 9 source-only OSM ways, 6 footways + 3 tracks, exact displayed v77 source junctions; no synthetic join');
