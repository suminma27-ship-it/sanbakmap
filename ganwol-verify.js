// v67: independent WGS84 reference overlay. Never used for route creation.
(function(root){
'use strict';
const k=111195,c=Math.cos(35.55*Math.PI/180),step=150;
function pt(p){if(!Array.isArray(p)||p.length<2)return null;const x=Number(p[0]),y=Number(p[1]);return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=180&&Math.abs(y)<=90?[x,y]:null}
function clean(items){
 const paths=[];let count=0;
 const add=arr=>{if(!Array.isArray(arr))return;const p=arr.map(pt).filter(Boolean);if(p.length<2)return;count+=p.length;if(count>150000)throw Error('좌표가 너무 많아. 간월산 주변만 분리해 줘.');paths.push(p)};
 for(const item of items){
  const g=item?.geometry||item;
  if(g?.type==='LineString')add(g.coordinates);
  if(g?.type==='MultiLineString')for(const p of g.coordinates||[])add(p);
 }
 if(!paths.length)throw Error('유효한 LineString 등산로가 없어. WGS84로 변환해 줘.');
 if(!paths.some(p=>p.some(q=>q[0]>128.93&&q[0]<129.19&&q[1]>35.47&&q[1]<35.64)))
  throw Error('간월산과 다른 지역의 좌표야. 파일과 좌표계를 확인해 줘.');
 return paths;
}
function geojson(data){
 const d=typeof data==='string'?JSON.parse(data):data;
 if(d?.crs?.properties?.name&&!/4326|CRS84/i.test(String(d.crs.properties.name)))throw Error('WGS84(EPSG:4326)만 지원해.');
 return clean(d.type==='FeatureCollection'?d.features:d.type==='Feature'?[d]:[d]);
}
function gpx(data,parse){
 const doc=parse(data),parts=[];
 if(doc.getElementsByTagName('parsererror').length)throw Error('GPX XML이 올바르지 않아.');
 for(const node of doc.getElementsByTagNameNS('*','trkseg')){
  const coordinates=Array.from(node.getElementsByTagNameNS('*','trkpt')).map(x=>[x.getAttribute('lon'),x.getAttribute('lat')]);
  parts.push({type:'LineString',coordinates});
 }
 for(const node of doc.getElementsByTagNameNS('*','rte')){
  const coordinates=Array.from(node.getElementsByTagNameNS('*','rtept')).map(x=>[x.getAttribute('lon'),x.getAttribute('lat')]);
  parts.push({type:'LineString',coordinates});
 }
 return clean(parts);
}
function index(paths){
 const cells=new Map();let segments=0;
 for(const path of paths)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],x=a[0]*k*c,y=a[1]*k,X=b[0]*k*c,Y=b[1]*k;
  if(Math.hypot(X-x,Y-y)<.01)continue;
  const seg=[x,y,X,Y];segments++;
  const u=Math.floor(Math.min(x,X)/step),v=Math.floor(Math.max(x,X)/step);
  const m=Math.floor(Math.min(y,Y)/step),n=Math.floor(Math.max(y,Y)/step);
  if((v-u+1)*(n-m+1)>2500)throw Error('비정상적으로 긴 선형이 있어.');
  for(let j=u;j<=v;j++)for(let l=m;l<=n;l++){
   const key=j+','+l;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(seg);
  }
 }
 return {cells,segments};
}
function nearest(point,graph){
 const x=point[0]*k*c,y=point[1]*k,u=Math.floor(x/step),v=Math.floor(y/step);
 let d=101;const seen=new Set();
 for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)
  for(const s of graph.cells.get((u+a)+','+(v+b))||[]){
   if(seen.has(s))continue;seen.add(s);
   const dx=s[2]-s[0],dy=s[3]-s[1],t=Math.max(0,Math.min(1,((x-s[0])*dx+(y-s[1])*dy)/(dx*dx+dy*dy||1)));
   d=Math.min(d,Math.hypot(x-s[0]-t*dx,y-s[1]-t*dy));
  }
 return d;
}
function compare(points,paths,firstGap=5){
 const net=index(paths),dist=points.map(p=>nearest(p,net));
 return {total:dist.length,segments:net.segments,
  near30:dist.filter(x=>x<=30).length,near50:dist.filter(x=>x<=50).length,
  gapTotal:dist.length-firstGap,gapNear30:dist.slice(firstGap).filter(x=>x<=30).length,
  gapNear50:dist.slice(firstGap).filter(x=>x<=50).length,verified:false};
}
root.SanbakGanwolVerify={geojson,gpx,index,nearest,compare};
})(window);
