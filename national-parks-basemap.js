/* v74: shared Web Mercator coordinates for public raster tiles and original OSM paths. */
(function(root){
'use strict';
const RAD=Math.PI/180,MAX=85.05112878;
function merc(point){
 const lon=point[0],lat=Math.max(-MAX,Math.min(MAX,point[1])),phi=lat*RAD;
 return [(lon+180)/360,(1-Math.log(Math.tan(Math.PI/4+phi/2))/Math.PI)/2];
}
function fit(bbox,W=1000,H=700){
 const nw=merc([bbox[0],bbox[3]]),se=merc([bbox[2],bbox[1]]);
 const dx=Math.max(1e-9,se[0]-nw[0]),dy=Math.max(1e-9,se[1]-nw[1]);
 return {mx:(nw[0]+se[0])/2,my:(nw[1]+se[1])/2,scale:Math.min((W-100)/dx,(H-90)/dy)};
}
function xy(coord,projection,W=1000,H=700){
 const [x,y]=merc(coord);
 return [W/2+(x-projection.mx)*projection.scale,H/2+(y-projection.my)*projection.scale];
}
function tiles(projection,pan,mode,W=1000,H=700){
 if(mode==='lines')return {key:'lines',tiles:[]};
 if(mode!=='standard'&&mode!=='topo')throw Error('지원되지 않는 바탕지도');
 const zScale=projection.scale*Math.max(.01,pan.z)/256;
 let z=Math.max(6,Math.min(mode==='topo'?16:17,Math.floor(Math.log2(zScale))));
 const worldAt=(x,y)=>[
  projection.mx+(x-W/2-pan.x)/pan.z/projection.scale,
  projection.my+(y-H/2-pan.y)/pan.z/projection.scale
 ];
 const one=worldAt(0,0),two=worldAt(W,H);
 const l=Math.min(one[0],two[0]),r=Math.max(one[0],two[0]);
 const t=Math.min(one[1],two[1]),b=Math.max(one[1],two[1]);
 function span(zoom){const n=2**zoom;return {n,z:zoom,
  minX:Math.max(0,Math.floor(l*n)),maxX:Math.min(n-1,Math.floor(r*n)),
  minY:Math.max(0,Math.floor(t*n)),maxY:Math.min(n-1,Math.floor(b*n))};}
 let bounds=span(z);
 const count=q=>Math.max(0,q.maxX-q.minX+1)*Math.max(0,q.maxY-q.minY+1);
 while(count(bounds)>48&&z>6)bounds=span(--z);
 const result=[];
 for(let x=bounds.minX;x<=bounds.maxX;x++)for(let y=bounds.minY;y<=bounds.maxY;y++){
  const n=bounds.n;
  const url=mode==='topo'
   ?'https://'+['a','b','c'][(x+y)%3]+'.tile.opentopomap.org/'+z+'/'+x+'/'+y+'.png'
   :'https://tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png';
  result.push({z,x,y,url,svgX:W/2+(x/n-projection.mx)*projection.scale,
   svgY:H/2+(y/n-projection.my)*projection.scale,side:projection.scale/n});
 }
 return {key:[mode,z,bounds.minX,bounds.maxX,bounds.minY,bounds.maxY].join('|'),tiles:result};
}
root.SanbakParkBasemap={merc,fit,xy,tiles};
})(window);
