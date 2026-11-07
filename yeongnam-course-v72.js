/* Sanbakmap v72: courses from exact, contiguous OSM source legs only. */
(function(root){
'use strict';
const R=6371008.8;
function dist(a,b){
 const p1=a[1]*Math.PI/180,p2=b[1]*Math.PI/180;
 const d=(b[1]-a[1])*Math.PI/180,l=(b[0]-a[0])*Math.PI/180;
 const h=Math.sin(d/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(l/2)**2;
 return 2*R*Math.asin(Math.min(1,Math.sqrt(Math.max(0,h))));
}
function compose(legs,start,end){
 if(!Array.isArray(legs)||!legs.length)throw Error('원본 구간이 없어.');
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<0||start>legs.length||end>legs.length||start===end)
  throw Error('출발점과 도착점은 서로 달라야 해.');
 const sign=start<end?1:-1,coords=[];
 for(let i=start;sign>0?i<end:i>end;i+=sign){
  const part0=legs[sign>0?i:i-1]?.coordinates;
  if(!Array.isArray(part0)||part0.length<2)throw Error('선택한 원본 경로가 부족해.');
  const part=sign>0?part0:part0.slice().reverse();
  if(coords.length){
   const p=coords.at(-1),q=part[0];
   if(p[0]!==q[0]||p[1]!==q[1])throw Error('원본 좌표가 끊어진 구간은 연결하지 않아.');
  }
  for(const p of (coords.length?part.slice(1):part)){
   if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))throw Error('잘못된 경로 좌표야.');
   coords.push(p.slice(0,2));
  }
 }
 let m=0;for(let i=1;i<coords.length;i++)m+=dist(coords[i-1],coords[i]);
 return {start,end,coordinates:coords,km:m/1000,legs:Math.abs(end-start),fieldVerified:false,accessVerified:false};
}
function xml(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function gpx(route,name){
 if(!route?.coordinates?.length)throw Error('저장할 경로가 없어.');
 return '<?xml version="1.0" encoding="UTF-8"?>\n'
 +'<gpx version="1.1" creator="Sanbakmap v72 OSM planning" xmlns="http://www.topografix.com/GPX/1/1">'
 +'<metadata><name>'+xml(name)+'</name><desc>Source OSM 2026-11-05; field and access unverified. Elevation unavailable.</desc></metadata>'
 +'<trk><name>'+xml(name)+'</name><trkseg>'
 +route.coordinates.map(p=>'<trkpt lat="'+p[1]+'" lon="'+p[0]+'"></trkpt>').join('')
 +'</trkseg></trk></gpx>';
}
function geojson(route,name){
 if(!route?.coordinates?.length)throw Error('저장할 경로가 없어.');
 return {type:'FeatureCollection',metadata:{source:'OpenStreetMap',source_date:'2026-11-05',
  attribution:'© OpenStreetMap contributors (ODbL)',field_verified:false,current_access_verified:false,
  elevation_data_available:false,allow_in_verified_routing:false},features:[{type:'Feature',
  properties:{name,route_kind:'osm_ridge_selection',length_km:+route.km.toFixed(3),
   field_verified:false,current_access_verified:false},
  geometry:{type:'LineString',coordinates:route.coordinates}}]};
}
root.SanbakAlpsCourses={dist,compose,gpx,geojson};
})(window);
