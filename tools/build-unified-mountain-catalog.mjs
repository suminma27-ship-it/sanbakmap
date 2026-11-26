import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const root={};new vm.Script(readFileSync('core/nationwide-source-loader.js','utf8')).runInNewContext({window:root});
const agency=root.SanbakNationwideAgency;
const national=read('data/nationwide/index.json').mountains;
const peakPath='data/public-peak-gpx/index.json';
const peaks=existsSync(peakPath)?read(peakPath).mountains:{};
const normalize=n=>String(n).normalize('NFKC').replace(/[\s_·-]/g,'');
const nationalAliases=n=>[...new Set([normalize(n),...String(n).split('_').map(normalize)])].filter(x=>x.length>=2);
const peakAliases=n=>[...new Set([normalize(n),normalize(String(n).replace(/\([^)]*\)/g,'')),...Array.from(String(n).matchAll(/\(([^)]*)\)/g),m=>normalize(m[1]))])].filter(x=>x.length>=2);
const byName=new Map(),buckets=new Map(),bounds=new Map();
for(const [code,m] of Object.entries(national))for(const key of nationalAliases(m.name)){if(!byName.has(key))byName.set(key,new Set());byName.get(key).add(code);}
function boundsFor(code){
 if(bounds.has(code))return bounds.get(code);
 const bucket=national[code].bucket;if(!buckets.has(bucket))buckets.set(bucket,read('data/nationwide/bucket-'+bucket+'.json'));
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const row of buckets.get(bucket).mountains[code]||[])for(const enc of row[5]||[])for(const [x,y] of agency.decodeLine(enc)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 const box=[minX,minY,maxX,maxY];bounds.set(code,box);return box;
}
function distanceToBox(lat,lon,box){const [a,b,c,d]=box;const x=Math.max(a-lon,0,lon-c)*111.195*Math.cos(lat*Math.PI/180),y=Math.max(b-lat,0,lat-d)*111.195;return Math.hypot(x,y)}
const links={},unmatched={},mountains={};let matched=0,ambiguous=0,linkedRoutes=0;
for(const [code,p] of Object.entries(peaks)){
 const [lat,lon]=p.center||[];
 const candidates=[...new Set(peakAliases(p.name).flatMap(n=>[...(byName.get(n)||[])]))].map(k=>({code:k,km:distanceToBox(lat,lon,boundsFor(k))})).filter(x=>Number.isFinite(x.km)&&x.km<=1).sort((a,b)=>a.km-b.km);
 // Exact normalized name + compatible existing trail area; leave competing
 // nearby records separate rather than assigning a peak to the wrong mountain.
 const best=candidates[0],second=candidates[1];
 if(best&&(!second||second.km-best.km>=.5)){
  (links[best.code]??=[]).push({code,name:p.name,catalogFile:p.catalogFile,routeCount:p.routeCount,profileCount:p.profileCount});
  matched++;linkedRoutes+=p.routeCount;
 }else{if(best)ambiguous++;unmatched[code]={code,name:p.name,routeCount:p.routeCount,profileCount:p.profileCount,center:p.center,catalogFile:p.catalogFile};}
}
for(const [code,items] of Object.entries(links))mountains[code]={peaks:items,routeCount:items.reduce((n,p)=>n+p.routeCount,0),profileCount:items.reduce((n,p)=>n+p.profileCount,0)};
const out={schema:'sanbak-unified-mountain-index-v1',note:'이름과 원본 등산로 영역으로 연결한 참고 목록. 동일 산 여부가 모호한 자료는 독립 GPX 봉우리로 유지. 미연결 봉우리의 행정지역은 미확인.',mountains,unmatched,counts:{national:Object.keys(national).length,publicPeaks:Object.keys(peaks).length,matched,linkedMountains:Object.keys(mountains).length,unmatched:Object.keys(unmatched).length,ambiguous,linkedRoutes}};
writeFileSync('data/unified-mountain-index.json',JSON.stringify(out)+'\n');
console.log('UNIFIED_MOUNTAIN_TOTAL',JSON.stringify(out.counts));
