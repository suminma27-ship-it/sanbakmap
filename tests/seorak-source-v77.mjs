// v77: source-only OSM hiking paths are geographically valid and never inferred joins.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('national-parks-trails.html',root),'utf8');
const js=readFileSync(new URL('seorak-v77-extra.js',root),'utf8');
const base64=js.match(/SANBAK_SEORAK_V77_B64='([^']+)'/)?.[1];
assert(base64,'v77 source extension missing');
const data=JSON.parse(gunzipSync(Buffer.from(base64,'base64')).toString('utf8'));
assert.equal(data.v,77);
assert.equal(data.b,1500);
assert.equal(data.r,false);
assert.equal(data.s,'OSM 2026-11-05');
assert.equal(data.a.length,27);
assert.equal(new Set(data.a.map(x=>x.i)).size,26);
const v75=JSON.parse(html.match(/<script id="seorak-border-v75" type="application\/json">([\s\S]*?)<\/script>/)?.[1]);
const old=new Set(v75.features.map(f=>String(f.properties.osm_id)));
const v76raw=readFileSync(new URL('seorak-v76-extra.js',root),'utf8');
const v76=JSON.parse(gunzipSync(Buffer.from(v76raw.match(/SANBAK_SEORAK_V76_B64='([^']+)'/)?.[1],'base64')).toString('utf8'));
for(const f of v76.paths)old.add(String(f.i));
const decode=encoded=>{
 let pos=0;const last=[0,0],out=[];
 while(pos<encoded.length){
  const point=[];
  for(let k=0;k<2;k++){
   let value=0,shift=0,part;
   do{
    assert(pos<encoded.length,'truncated point');
    part=encoded.charCodeAt(pos++)-63;
    assert(part>=0&&part<64,'invalid polyline character');
    value+=(part%32)*2**shift;shift+=5;
    assert(shift<=60,'overlong coordinate');
   }while(part>=32);
   last[k]+=(value%2?-(Math.floor(value/2)+1):value/2);
   point.push(last[k]/1e7);
  }
  out.push(point);
 }
 return out;
};
let totalMeters=0;const identity=new Set();
const hav=(a,b)=>{
 const dLat=(b[1]-a[1])*Math.PI/180,dLon=(b[0]-a[0])*Math.PI/180;
 const z=Math.sin(dLat/2)**2+Math.cos(a[1]*Math.PI/180)*Math.cos(b[1]*Math.PI/180)*Math.sin(dLon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(z)));
};
for(const row of data.a){
 assert.equal(row.h,'path');
 assert(Number.isInteger(row.i)&&row.i>0);
 assert(!old.has(String(row.i)),'duplicate OSM way '+row.i);
 const pts=decode(row.e);
 assert(pts.length>=2,'empty path');
 const k=JSON.stringify(pts);
 assert(!identity.has(k),'duplicate geometry');
 identity.add(k);
 for(const xy of pts)assert(xy[0]>128.1&&xy[0]<128.75&&xy[1]>37.9&&xy[1]<38.38);
 for(let j=1;j<pts.length;j++)totalMeters+=hav(pts[j-1],pts[j]);
}
assert(totalMeters>8150&&totalMeters<8500,'unexpected total OSM path length '+totalMeters);
assert(html.includes('seorak-v77-extra.js'));
assert(html.includes('outerSeorak.features.push(...added77)'));
assert(html.includes('v77Warning'));
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
const sw=readFileSync(new URL('sw.js',root),'utf8');
assert(sw.includes('sanbakmap-v77-fresh-1'));
assert(sw.includes('./seorak-v77-extra.js'));
const workflow=readFileSync(new URL('.github/workflows/deploy-pages.yml',root),'utf8');
assert(workflow.includes('seorak-v77-extra.js'));
console.log('PASS v77: 26 distinct source-only OSM path ways / 27 exterior fragments, '+(totalMeters/1000).toFixed(3)+' km, no inferred joins');
