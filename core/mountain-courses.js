(()=>{'use strict';
const $=id=>document.getElementById(id);
const COURSE_RELEASE='20261127-r17';
function freshFile(file){return file+(file.includes('?')?'&':'?')+'v='+COURSE_RELEASE}
function fetchCourse(file){return fetch(freshFile(file),{cache:'no-store'})}
$('courseRelease').textContent='코스 데이터 버전 '+COURSE_RELEASE;
const defaultMountain={"name":"설악산","code":"428302602","catalogFile":"./data/seorak-predefined-routes.json","referenceFile":"./data/knps-seorak-2018.geojson","referenceCount":21,"center":[38.12,128.45],"zoom":10,"preferredRoute":"s3","sourceLabel":"2018년 국립공원공단"};
let mountain=defaultMountain;
let catalog=null,selected=null,group='',map=null,layer=null,referenceLayer=null,referencePaths=[],baseLayer=null,baseMode='normal';let selectionGeneration=0;let activePoi=[],poiMap=new Map(),poiGraph=new Map(),poiButtons=new Map();
function hasGeometry(r){return Boolean(r?.geometryFile||r?.geometryData)&&['verified','reference'].includes(r.geometryStatus)}
function hasProfile(r){return Boolean(r?.profileFile||r?.profileData)&&['verified','reference'].includes(r.profileStatus)}
function isReady(r){return hasGeometry(r)&&hasProfile(r)}
function preferredSample(){return catalog?.routes.find(r=>r.id===mountain.preferredRoute&&isReady(r))||catalog?.routes.find(isReady)}
function updateCatalogSummary(){
 if(!catalog)return;
 const total=catalog.routes.length,ready=catalog.routes.filter(isReady).length;
 $('catalogSummary').textContent=mountain.name+': '+total+'개 등록 · 경로·고도 참고자료 '+ready+'개';
 $('catalogDescription').textContent=(mountain.catalogFile?'기관 원본 및 DEM·GPX 기반 산행 참고정보. ':'사전등록 코스는 아직 없으며, 기존 등산로 중 긴 원본 참고구간을 제공해. ')+(total-ready)+'개는 경로 또는 고도자료 미확인. 실제 통행 여부와 별개.';
}
function showMapState(text){$('mapState').hidden=!text;if(text)$('mapState').textContent=text}
function trySample(){const sample=preferredSample();if(!sample){$('status').textContent='현재 전체 경로·고도자료가 검증된 코스가 없어.';return}group=sample.group;choose(sample);document.querySelector('#map').scrollIntoView?.({block:'nearest',behavior:'smooth'})}
$('tryVerified').addEventListener('click',trySample);
function svgMessage(message){const svg=$('graph');svg.replaceChildren();const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x','350');t.setAttribute('y','98');t.setAttribute('text-anchor','middle');t.setAttribute('fill','#607969');t.setAttribute('font-size','15');t.textContent=message;svg.append(t)}
function setBase(mode){
 if(mode!=='normal'&&mode!=='terrain')return;
 baseMode=mode;
 document.querySelectorAll('.basemap').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.base===mode)));
 if(!map||!window.L){$('baseStatus').textContent='배경지도 미연결 · 원본 좌표 참고도 사용';return}
 if(baseLayer)map.removeLayer(baseLayer);
 const options=mode==='terrain'
 ?{url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',attribution:'© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)',maxZoom:17,maxNativeZoom:17}
 :{url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'© OpenStreetMap contributors',maxZoom:18};
 baseLayer=L.tileLayer(options.url,{attribution:options.attribution,maxZoom:options.maxZoom,maxNativeZoom:options.maxNativeZoom}).addTo(map);
 if(baseLayer.bringToBack)baseLayer.bringToBack();
 $('baseStatus').textContent=mode==='terrain'?'지형지도 · OpenTopoMap':'일반지도 · OpenStreetMap';
}
document.querySelectorAll('.basemap').forEach(b=>b.onclick=()=>setBase(b.dataset.base));
function mapInit(){
 if(!window.L){$('fallback').style.display='block';setBase(baseMode);return}
 map=L.map('map',{zoomControl:true}).setView(mountain.center||[36.5,127.8],mountain.zoom||7);
 setBase(baseMode);
}
function refSvg(paths,warning,highlight=false,endpointNames=null,markers=[]){
 const root=$('map');root.replaceChildren();
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 900 550');svg.setAttribute('role','img');svg.setAttribute('aria-label',mountain.name+' 기관 원본 등산로 좌표 참고도');
 const back=document.createElementNS(svg.namespaceURI,'rect');back.setAttribute('width','900');back.setAttribute('height','550');back.setAttribute('fill','#e7f0e7');svg.append(back);
 if(!paths.length){const t=document.createElementNS(svg.namespaceURI,'text');t.setAttribute('x','18');t.setAttribute('y','70');t.textContent=warning||'원본 선형 자료 로드 실패';svg.append(t);root.append(svg);return}
 let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
 for(const a of paths)for(const p of a){left=Math.min(left,p[0]);right=Math.max(right,p[0]);bottom=Math.min(bottom,p[1]);top=Math.max(top,p[1])}
 const cos=Math.cos((bottom+top)/2*Math.PI/180),dx=Math.max(.000001,(right-left)*cos),dy=Math.max(.000001,top-bottom),scale=Math.min(840/dx,490/dy),ox=(900-dx*scale)/2,oy=(550-dy*scale)/2;
 for(const a of paths){const d=a.map((p,i)=>(i?'L':'M')+(ox+(p[0]-left)*cos*scale).toFixed(2)+' '+(550-oy-(p[1]-bottom)*scale).toFixed(2)).join(' ');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',d);p.setAttribute('fill','none');p.setAttribute('stroke',highlight?'#146b3e':'#749b7a');p.setAttribute('stroke-width',highlight?'5':'2');svg.append(p)}
 if(highlight&&endpointNames&&paths.length===1&&paths[0].length>1){
  const first=paths[0][0],last=paths[0].at(-1);
  for(const [point,name] of [[first,endpointNames[0]],[last,endpointNames[1]]]){
   const cx=ox+(point[0]-left)*cos*scale,cy=550-oy-(point[1]-bottom)*scale;
   const dot=document.createElementNS(svg.namespaceURI,'circle');
   dot.setAttribute('cx',cx);dot.setAttribute('cy',cy);dot.setAttribute('r','7');dot.setAttribute('fill','#fff');dot.setAttribute('stroke','#146b3e');dot.setAttribute('stroke-width','3');svg.append(dot);
   const label=document.createElementNS(svg.namespaceURI,'text');
   label.setAttribute('x',Math.max(12,Math.min(780,cx+12)));label.setAttribute('y',Math.max(20,cy-12));
   label.setAttribute('font-size','17');label.setAttribute('font-weight','700');label.setAttribute('fill','#12492d');
   label.textContent=name;svg.append(label);
  }
 }
 for(const marker of markers){
  const [lon,lat]=marker.routeCoord,cx=ox+(lon-left)*cos*scale,cy=550-oy-(lat-bottom)*scale;
  const dot=document.createElementNS(svg.namespaceURI,'circle');
  dot.setAttribute('cx',cx);dot.setAttribute('cy',cy);dot.setAttribute('r','6');dot.setAttribute('fill','#e9a13b');dot.setAttribute('stroke','#fff');dot.setAttribute('stroke-width','2');dot.setAttribute('data-poi',marker.id);dot.setAttribute('tabindex','0');dot.setAttribute('role','button');dot.setAttribute('aria-label',marker.label);
  dot.addEventListener('click',()=>focusPoi(marker.id));dot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')focusPoi(marker.id)});svg.append(dot);poiMap.set(marker.id,dot);
  const label=document.createElementNS(svg.namespaceURI,'text');label.setAttribute('x',Math.max(12,Math.min(780,cx+9)));label.setAttribute('y',Math.max(20,cy-9));label.setAttribute('font-size','15');label.setAttribute('fill','#12492d');label.textContent=marker.label;svg.append(label);
 }
 root.append(svg);
}
async function loadReference(){
 try{
  if(!mountain.referenceFile&&!mountain.referenceData)return;
  let geo=mountain.referenceData;
  if(!geo){const r=await fetchCourse(mountain.referenceFile);if(!r.ok)throw Error('HTTP '+r.status);geo=await r.json();}
  const paths=[];
  if(geo?.type!=='FeatureCollection'||!Array.isArray(geo.features))throw Error('기관 원본 형식 오류');
  for(const feature of geo.features){if(feature.properties?.facility_type&&feature.properties.facility_type!=='탐방로')continue;
   const g=feature.geometry,parts=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
   for(const coords of parts){if(coords.length>1&&coords.every(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])))paths.push(coords)}
  }
  if(!paths.length)throw Error('기관 원본 선형 없음');
  referencePaths=paths;
  if(map&&window.L){
   referenceLayer=L.featureGroup();
   for(const coords of paths)L.polyline(coords.map(p=>[p[1],p[0]]),{color:'#8da78f',weight:2,opacity:.65,interactive:false}).addTo(referenceLayer);
   referenceLayer.addTo(map);
   if(layer){if(layer.bringToFront)layer.bringToFront();map.fitBounds(layer.getBounds(),{padding:[24,24]})}
   else map.fitBounds(referenceLayer.getBounds(),{padding:[15,15]});
  }else if(selected&&hasGeometry(selected)){/* Keep the selected verified route above reference lines in SVG fallback. */}else refSvg(paths,'배경지도 연결 실패 · 원본 좌표 참고선은 표시');
 }catch(error){
  console.warn(mountain.name+' 원본 참고선형 표시 실패',error);
  if(!map&&(!selected||!hasGeometry(selected)))refSvg([],error.message);
 }
}
function choose(route){
 const generation=++selectionGeneration;
 selected=route;activePoi=[];poiMap.clear();poiGraph.clear();poiButtons.clear();$('poiList').replaceChildren();$('poiFocus').textContent='경유지 위치 자료 확인 중…';
 $('title').textContent=route.name;
 $('via').textContent='출발: '+route.via[0]+(route.via.length>2?' · 경유: '+route.via.slice(1,-1).join(' → '):'')+' · 도착: '+route.via.at(-1);
 const detail=$('routeSource');if(detail){detail.replaceChildren();if(route.sourceUrl&&/^https:\/\//.test(route.sourceUrl)){const a=document.createElement('a');a.href=route.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=(route.source||'코스 출처')+' 원문';detail.append(a);if(route.sourceExtra&&/^https:\/\//.test(route.sourceExtra)){const b=document.createElement('a');b.href=route.sourceExtra;b.target='_blank';b.rel='noopener noreferrer';b.textContent=' · 추가 코스 자료';detail.append(b)}}else detail.textContent=route.source||'';}
 const guideInfo=$('guideDistance');if(guideInfo)guideInfo.textContent=Number.isFinite(route.guideKm)?'안내 거리: '+route.guideKm.toFixed(2)+' km'+(route.guideDirection?' ('+route.guideDirection+')':'')+' · 출처 안내 기준':Array.isArray(route.guideDistanceRange)?'공개 기록 거리: '+route.guideDistanceRange.map(n=>n.toFixed(1)).join('~')+' km · 편도':'';
 if(layer&&map){map.removeLayer(layer);layer=null}
 if(!map){
  if(referencePaths.length)refSvg(referencePaths,'기관 원본 참고선');
  else refSvg([],'선택 코스의 전체 선형 미확인');
 }
 const ready=isReady(route);
 $('tryVerified').hidden=ready;
 $('distance').textContent=hasGeometry(route)?'거리 불러오는 중…':Number.isFinite(route.guideKm)?'출처 안내거리: '+route.guideKm.toFixed(2)+' km · 원본 선형 미등록':'전체 거리: 미확인';
 svgMessage(hasProfile(route)?'고도자료 읽는 중…':'고도자료 미확인');
 showMapState(hasGeometry(route)?'공식 원본 참고경로 읽는 중…':'선택 코스의 경로자료 미확인');
 $('status').textContent=hasGeometry(route)||hasProfile(route)?'기관 자료 기반 참고정보 · 실제 통행 여부는 별도 확인':(route.notes||'경로 및 고도자료 미확인');
 if(hasGeometry(route)||hasProfile(route))loadReferenceCourse(route,generation);
 render();
}
async function loadReferenceCourse(route,generation){
 const read=async file=>{const r=await fetchCourse(file);if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
 const current=()=>selected===route&&selectionGeneration===generation;
 const errs=[];
 const tasks=[];let loadedGeometry=null,loadedProfile=null;
 if(hasGeometry(route))tasks.push((route.geometryData?Promise.resolve(route.geometryData):read(route.geometryFile)).then(geometry=>{
  if(selected!==route||selectionGeneration!==generation)return;
  if(geometry.properties?.routeId!==route.id||geometry.geometry?.type!=='LineString')throw Error('경로 형식 오류');
  const coords=geometry.geometry.coordinates;
  if(!Array.isArray(coords)||coords.length<2||coords.some(c=>!Array.isArray(c)||!Number.isFinite(c[0])||!Number.isFinite(c[1])))throw Error('경로 좌표 오류');
  const R=6371008.8,rad=Math.PI/180;let metres=0;
  for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i],dLat=(b[1]-a[1])*rad,dLon=(b[0]-a[0])*rad,h=Math.sin(dLat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dLon/2)**2;metres+=2*R*Math.asin(Math.min(1,Math.sqrt(h)))}
  loadedGeometry={geometry,coords,metres};drawRoute(route,geometry,coords,metres);showMapState('');
 }).catch(err=>{if(selected===route&&selectionGeneration===generation){errs.push('지도: '+err.message);showMapState('경로자료 로드 실패');$('distance').textContent='거리 미확인'}}));
 if(hasProfile(route))tasks.push((route.profileData?Promise.resolve(route.profileData):read(route.profileFile)).then(profile=>{
  if(!current())return;
  if(profile.routeId!==route.id||!Array.isArray(profile.points)||profile.points.length<2||!Number.isFinite(profile.totalMeters)||profile.totalMeters<=0||profile.points.some((p,i)=>!Number.isFinite(p.distanceMeters)||!Number.isFinite(p.elevationMeters)||p.distanceMeters<0||(i&&p.distanceMeters<=profile.points[i-1].distanceMeters)))throw Error('고도표본 형식 오류');
  loadedProfile=profile;drawProfile(route,profile);
 }).catch(err=>{if(current()){errs.push('고도: '+err.message);svgMessage('고도자료 로드 실패')}}));
 await Promise.all(tasks);
 if(current()&&loadedGeometry){activePoi=matchPoi(route,loadedGeometry.coords);if(loadedProfile)attachPoiElevations(activePoi,loadedProfile,loadedGeometry.metres);if(map&&layer){map.removeLayer(layer);layer=null}drawRoute(route,loadedGeometry.geometry,loadedGeometry.coords,loadedGeometry.metres,activePoi);if(loadedProfile)drawProfile(route,loadedProfile,activePoi);renderPoiList(route,activePoi);}
 if(current())$('status').textContent=(route.profileSource==='gpx'?route.source:(mountain.sourceLabel||route.source||'기관 원본'))+' · '+(hasProfile(route)?(route.profileSource==='gpx'?'GPX 기록 고도 참고정보. ':'DEM 기반 참고정보. '):'경로 참고정보 · 고도자료 미확인. ')+(route.notes||'실제 통행 여부는 최신 공단 안내 확인.')+(errs.length?' · '+errs.join(' / '):'');
}
// Reusable display-only POI projection. Does not edit any source line or create routes.
function metreDistance(a,b){const r=Math.PI/180,h=Math.sin((b[1]-a[1])*r/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin((b[0]-a[0])*r/2)**2;return 12742017.6*Math.asin(Math.min(1,Math.sqrt(h)))}
function matchPoi(route,coords){
 const refs=new Map((catalog?.poiReference?.points||[]).map(p=>[p.name,p]));
 const ds=[0];for(let i=1;i<coords.length;i++)ds.push(ds.at(-1)+metreDistance(coords[i-1],coords[i]));
 const out=[];let previous=0;
 for(let k=0;k<route.via.length;k++){
  const name=route.via[k],ref=refs.get(name==='양폭'?'양폭대피소':name);if(!ref||!Array.isArray(ref.lonlat))continue;
  // Route endpoints already have their own labels. Do not double-label them.
  if(k===0||k===route.via.length-1)continue;
  const p=ref.lonlat,cos=Math.cos(p[1]*Math.PI/180);let best=null;
  for(let i=1;i<coords.length;i++){
   const a=coords[i-1],b=coords[i],dx=(b[0]-a[0])*cos,dy=b[1]-a[1],px=(p[0]-a[0])*cos,py=p[1]-a[1],den=dx*dx+dy*dy;
   const t=den?Math.max(0,Math.min(1,(px*dx+py*dy)/den)):0,routeCoord=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];
   const distanceMeters=ds[i-1]+t*(ds[i]-ds[i-1]),offset=metreDistance(p,routeCoord);
   if(distanceMeters<previous+20||distanceMeters<20||distanceMeters>ds.at(-1)-20||offset>150)continue;
   if(!best||offset<best.offset)best={distanceMeters,offset,routeCoord};
  }
  if(best){out.push({...best,id:'via-'+k,name,label:ref.label||name,source:ref.source});previous=best.distanceMeters}
 }
 return out;
}
function attachPoiElevations(markers,profile,metres){
 for(const marker of markers){
  const d=marker.distanceMeters*profile.totalMeters/metres;const i=profile.points.findIndex(p=>p.distanceMeters>=d);
  if(i<1)continue;const a=profile.points[i-1],b=profile.points[i],gap=b.distanceMeters-a.distanceMeters;
  if(gap>250||gap<=0)continue;
  marker.profileDistance=d;marker.elevation=a.elevationMeters+(b.elevationMeters-a.elevationMeters)*(d-a.distanceMeters)/gap;
 }
}
function focusPoi(id){
 const p=activePoi.find(x=>x.id===id);if(!p)return;
 for(const [key,m] of poiMap){if(m.setStyle)m.setStyle({fillColor:key===id?'#b64d19':'#e9a13b',radius:key===id?9:6});else{m.setAttribute('fill',key===id?'#b64d19':'#e9a13b');m.setAttribute('r',key===id?'10':'6')}}
 for(const [key,m] of poiGraph){m.setAttribute('fill',key===id?'#b64d19':'#e9a13b');m.setAttribute('r',key===id?'7':'4')}
 for(const [key,b] of poiButtons)b.setAttribute('aria-pressed',String(key===id));
 $('poiFocus').textContent=p.label+' · '+(p.distanceMeters/1000).toFixed(2)+' km'+(Number.isFinite(p.elevation)?' · 약 '+Math.round(p.elevation)+' m':'')+' · 경로상 참고 위치';
 if(map){map.panTo([p.routeCoord[1],p.routeCoord[0]]);poiMap.get(id)?.openTooltip?.()}
}
function renderPoiList(route,markers){
 const root=$('poiList');root.replaceChildren();poiButtons.clear();
 for(const p of markers){const b=document.createElement('button');b.type='button';b.className='poi-chip';b.textContent=p.label+' '+(p.distanceMeters/1000).toFixed(1)+'km';b.setAttribute('aria-pressed','false');b.onclick=()=>focusPoi(p.id);root.append(b);poiButtons.set(p.id,b)}
 const missing=route.via.filter((name,i)=>i>0&&i<route.via.length-1&&!markers.some(p=>p.id==='via-'+i));
 $('poiFocus').textContent='경유지 참고 위치 '+markers.length+'개'+(missing.length?' · 위치 미표시: '+missing.join(', '):'')+' · 경유지를 누르면 지도와 그래프에서 강조';
}
function drawRoute(route,geometry,coords,metres,markers=[]){
 // Endpoint labels come from the catalog, while positions are the actual verified geometry.
 const startLabel=geometry.properties.startLabel||route.via[0],endLabel=geometry.properties.endLabel||route.via.at(-1);
 if(map){
  layer=L.featureGroup().addTo(map);
  L.geoJSON(geometry,{style:{color:'#146b3e',weight:5,opacity:1}}).addTo(layer);
  L.circleMarker([coords[0][1],coords[0][0]],{radius:6,color:'#175b3b',fillColor:'#fff',fillOpacity:1,weight:3}).bindTooltip(startLabel+' (원본 출발점)',{permanent:false}).addTo(layer);
  const last=coords.at(-1);
  L.circleMarker([last[1],last[0]],{radius:7,color:'#bd5035',fillColor:'#fff',fillOpacity:1,weight:3}).bindTooltip(endLabel+' (원본 종점)',{permanent:false}).addTo(layer);
  for(const p of markers){const marker=L.circleMarker([p.routeCoord[1],p.routeCoord[0]],{radius:6,color:'#fff',weight:2,fillColor:'#e9a13b',fillOpacity:1}).bindTooltip(p.label+' · '+(p.distanceMeters/1000).toFixed(1)+' km',{permanent:true,direction:'top'}).addTo(layer);marker.on('click',()=>focusPoi(p.id));poiMap.set(p.id,marker)}
  map.fitBounds(layer.getBounds(),{padding:[24,24]});
 }
 else refSvg([coords],'검증된 과거 원본 코스 선형 · 원본 좌표만 표시',true,[startLabel,endLabel],markers);
 $('distance').textContent=(route.coverage==='partial'?'자료 제공 구간 거리: ':'기관 원본 참고거리: ')+((geometry.properties.sourceDistanceMeters||metres)/1000).toFixed(2)+' km'+(geometry.properties.officialCourseGuideKm?' · 출처 안내거리 '+geometry.properties.officialCourseGuideKm+' km':'');
}
function drawProfile(route,profile,markers=[]){
 const metres=profile.totalMeters,startLabel=profile.startLabel||(mountain.code==='428302602'&&route.id==='s1'?'신흥사 인근(원본 시작)':route.via[0]),endLabel=profile.endLabel||route.via.at(-1);
 const svg=$('graph');svg.replaceChildren();
 const ns='http://www.w3.org/2000/svg';const el=(tag,attrs,text)=>{const node=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=String(text);return node};
 const pts=profile.points;let lo=Infinity,hi=-Infinity;for(const point of pts){lo=Math.min(lo,point.elevationMeters);hi=Math.max(hi,point.elevationMeters)}lo-=30;hi+=30;
 const x=d=>50+610*d/metres,y=z=>155-125*(z-lo)/(hi-lo||1);
 for(let i=0;i<=3;i++){const elev=lo+(hi-lo)*i/3,Y=y(elev);
  svg.append(el('line',{x1:50,y1:Y,x2:660,y2:Y,stroke:'#dce7dd','stroke-width':1}));
  svg.append(el('text',{x:44,y:Y+4,fill:'#607969','font-size':11,'text-anchor':'end'},Math.round(elev)));
 }
 for(let i=0;i<=4;i++){const X=x(metres*i/4);
  svg.append(el('text',{x:X,y:179,fill:'#607969','font-size':11,'text-anchor':'middle'},(metres*i/4000).toFixed(1)));
 }
 svg.append(el('text',{x:660,y:191,'text-anchor':'end','font-size':10},'km'));
 const line=document.createElementNS('http://www.w3.org/2000/svg','path');
 line.setAttribute('d',pts.map((p,i)=>(i&&p.distanceMeters-pts[i-1].distanceMeters<=250?'L':'M')+x(p.distanceMeters).toFixed(1)+','+y(p.elevationMeters).toFixed(1)).join(' '));
 line.setAttribute('stroke','#187449');line.setAttribute('stroke-width','3');line.setAttribute('fill','none');svg.append(line);
 const a=pts[0],b=pts.at(-1);
 for(const [point,name,offset] of [[a,startLabel,17],[b,endLabel,-12]]){
  svg.append(el('circle',{cx:x(point.distanceMeters),cy:y(point.elevationMeters),r:4,fill:'#187449',stroke:'#fff','stroke-width':2}));
  svg.append(el('text',{x:x(point.distanceMeters),y:y(point.elevationMeters)+offset,fill:'#1c5b3a','font-size':12,'text-anchor':point===a?'start':'end'},name));
 }
 let lastX=-Infinity,lane=0;
 for(const p of markers){
  if(!Number.isFinite(p.elevation)||!Number.isFinite(p.profileDistance))continue;
  const X=x(p.profileDistance),Y=y(p.elevation);
  const dot=el('circle',{cx:X,cy:Y,r:4,fill:'#e9a13b',stroke:'#fff','stroke-width':1.5,'data-poi':p.id,tabindex:0,role:'button','aria-label':p.label,class:'poi-mark'});
  dot.addEventListener('click',()=>focusPoi(p.id));dot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')focusPoi(p.id)});svg.append(dot);poiGraph.set(p.id,dot);
  if(X-lastX<70)lane=(lane+1)%3;else lane=0;lastX=X;
  const labelY=24+lane*14;
  svg.append(el('line',{x1:X,y1:Y-5,x2:X,y2:labelY+3,stroke:'#bca46d','stroke-dasharray':'3 3'}));
  const label=el('text',{x:X,y:labelY,'text-anchor':'middle',fill:'#734d1e','font-size':10,class:'poi-mark'},p.label);label.addEventListener('click',()=>focusPoi(p.id));svg.append(label);
 }
}

function render(){
 if(!catalog)return;
 const inGroup=catalog.routes.filter(r=>r.group===group);const readyCount=inGroup.filter(isReady).length;
 $('count').textContent=inGroup.length+'개 코스 · 경로·고도자료 '+readyCount+'개 / 미확인 '+(inGroup.length-readyCount)+'개';
 document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===group)));
 const list=$('courses');list.replaceChildren();
 for(const r of catalog.routes.filter(r=>r.group===group)){
  const b=document.createElement('button');b.className='course';b.type='button';b.setAttribute('aria-pressed',String(selected?.id===r.id));
  const title=document.createElement('strong');title.textContent=r.name;
  const desc=document.createElement('small');desc.textContent=isReady(r)?(r.profileSource==='gpx'?(r.wholeOriginalTrack?'● 공공 GPX 연속 전체 트랙·고도':'● 공공 GPX 지도·거리·기록 고도그래프'):r.coverage==='partial'?'● 일부 구간 지도·거리·DEM 고도그래프':'● 지도·거리·DEM 고도그래프 참고자료'):(hasGeometry(r)?'경로 참고자료 · 고도 미확인':hasProfile(r)?'고도 참고자료 · 경로 미확인':(Number.isFinite(r.guideKm)?'출처 안내거리 '+r.guideKm.toFixed(1)+' km · 지도/고도 준비 중':'○ 경유지 목록 · 자료 미확인'));
  b.dataset.ready=String(isReady(r));
  b.append(title,desc);b.onclick=()=>choose(r);list.append(b);
 }
}
function configureTabs(){
 const groups=[...new Set(catalog.routes.map(r=>r.group))];
 const buttons=[...document.querySelectorAll('.tab')];
 // The three default tabs are reused; additional catalog-defined groups can be appended.
 for(let i=buttons.length;i<groups.length;i++){const b=document.createElement('button');b.className='tab';$('tabs').append(b);buttons.push(b)}
 buttons.forEach((b,i)=>{b.hidden=i>=groups.length;if(b.hidden)return;b.dataset.group=groups[i];b.textContent=groups[i];b.onclick=()=>{group=b.dataset.group;const first=catalog.routes.find(r=>r.group===group);if(first)choose(first);else render()}});
}
function noCatalog(message){
 $('catalogSummary').textContent=mountain.name+' 산행코스';$('catalogDescription').textContent=message;
 const link=document.createElement('a');link.href='./mountains-20261127-r17.html?mountain='+mountain.code;link.textContent=' · 이 산의 실제 원본 등산로와 고도그래프 보기';$('catalogDescription').append(link);
 $('count').textContent='등록된 사전 코스 없음';$('status').textContent=message;
 $('tryVerified').hidden=true;$('poiFocus').textContent='경유지 자료 없음';showMapState(message);svgMessage('고도자료 미등록');
 document.querySelectorAll('.tab').forEach(b=>b.hidden=true);
}
$('agree').onclick=()=>{$('gate').hidden=true};
$('decline').onclick=()=>{document.body.replaceChildren();document.body.textContent='LNT 원칙에 동의하지 않아 종료했어.'};
svgMessage('코스를 선택하면 고도 참고자료 표시');
function acceptCatalog(d){
 if(d.schema!=='sanbak-predefined-route-catalog-v1'||String(d.mountainCode)!==mountain.code||!Array.isArray(d.routes)||d.routes.some(r=>!r.id||!r.name||!r.group||!Array.isArray(r.via)||r.via.length<2))throw Error('코스 목록 형식 또는 산코드 오류');
 if(mountain.code==='428302602'&&d.routes.filter(isReady).length!==23)throw Error('이전 또는 누락된 설악산 코스 데이터가 제공됐어. 최신 화면으로 다시 접속해 줘.');
 catalog=d;updateCatalogSummary();configureTabs();
 if(!d.routes.length){noCatalog('표시할 원본 등산로가 없어.');return}
 const initial=preferredSample()||d.routes.find(hasGeometry)||d.routes[0];group=initial.group;render();choose(initial);
}
async function originalCatalog(config){
 const agency=window.SanbakNationwideAgency,prof=window.SanbakMountainProfiles;
 if(!agency||!prof||!config.bucket)throw Error('전국 원본 자료 연결 불가');
 const read=async path=>{const r=await fetchCourse(path);if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
 const bucket=config.bucket,code=config.code;
 const [raw,dem]=await Promise.all([read('./data/nationwide/bucket-'+bucket+'.json'),read('./data/nationwide-elevation/bucket-'+bucket+'.json').catch(()=>null)]);
 const all=prof.forestLines(raw,code,agency.decodeLine);
 const lines=all.filter(l=>!l.closed&&!l.restricted&&l.coords.length>1&&prof.lengthOf(l.coords)>0);
 if(!lines.length)throw Error('기존 자료상 표시 가능한 등산로가 없어');
 const packed=dem?.mountains?.[code]||null;
 const source='산림청 DATA002 기관 원본 (과거 자료)';
 config.referenceData={type:'FeatureCollection',features:lines.map(l=>({type:'Feature',properties:{facility_type:'탐방로',name:l.recordName},geometry:{type:'LineString',coordinates:l.coords}}))};
 // Only use the existing individual records. No invented endpoints, connecting segments or route finding.
 const ranked=lines.map(l=>({l,length:prof.lengthOf(l.coords)})).sort((a,b)=>b.length-a.length);
 const selected=ranked.filter(x=>x.length>=400).slice(0,12);
 if(!selected.length)selected.push(ranked[0]);
 const routes=selected.map(({l,length})=>{
  const id='source-'+l.recordIndex+'-'+l.partIndex;
  const p=prof.profile(l,packed),ready=p.status==='ready'&&p.points.length>=2;
  return {id,name:l.recordName+' · 원본 '+(l.recordIndex+1)+'번',group:'원본 참고구간',via:['원본 시작점','원본 종점'],source,coverage:'reference',geometryStatus:'reference',geometryData:{type:'Feature',properties:{routeId:id,sourceId:l.id,startLabel:'원본 시작점',endLabel:'원본 종점'},geometry:{type:'LineString',coordinates:l.coords}},profileStatus:ready?'reference':'unverified',profileData:ready?{routeId:id,totalMeters:p.distanceMeters,points:p.points}:null,notes:'기존 산림청 원본 등산로 1개. 별도의 대표 정상·종주코스 전체가 아니며 현재 통행 여부는 관리기관 확인.'};
 });
 return {schema:'sanbak-predefined-route-catalog-v1',mountainCode:code,name:config.name,routes};
}
async function appendPublicRoutes(){
 if(mountain.code.length!==9)return;
 try{
  const r=await fetchCourse('./data/unified-mountain-index.json');if(!r.ok)return;
  const index=await r.json(),entry=index.mountains?.[mountain.code];if(!entry?.peaks?.length)return;
  const fetched=await Promise.allSettled(entry.peaks.map(async p=>{const response=await fetchCourse(p.catalogFile);if(!response.ok)throw Error('HTTP '+response.status);return {p,d:await response.json()}}));
  const extra=[];
  for(const result of fetched){if(result.status!=='fulfilled')continue;
   const {p,d}=result.value;if(d.schema!=='sanbak-predefined-route-catalog-v1'||String(d.mountainCode)!==p.code||!Array.isArray(d.routes))continue;
   for(const original of d.routes){
    const id='public-'+p.code+'-'+original.id;
    const route={...original,id,group:original.group==='정상코스'?'정상코스':'기타코스',name:original.name+' (공공 GPX)',geometryData:original.geometryData?{...original.geometryData,properties:{...original.geometryData.properties,routeId:id}}:null,profileData:original.profileData?{...original.profileData,routeId:id}:null};
    // Keep curated GPX versions separate from archive originals, except an identical ID.
    if(!catalog?.routes.some(x=>x.id===id))extra.push(route);
   }
  }
  if(!extra.length)return;
  if(!catalog){acceptCatalog({schema:'sanbak-predefined-route-catalog-v1',mountainCode:mountain.code,name:mountain.name,routes:extra});return}
  catalog.routes.push(...extra);updateCatalogSummary();configureTabs();render();
 }catch(e){console.warn('통합 GPX 목록 연결 불가',e);}
}
function startMountain(config){
 mountain=config;
 $('mountainHeading').textContent=mountain.name+' 산행 코스';
 if(typeof document.title==='string')document.title='산박지도 · '+mountain.name+' 산행 코스';
 if(mountain.code!=='428302602'){
  $('localNotice').textContent='기관 자료 기반 참고정보. 방문 전 최신 출입통제 안내를 확인해 줘.';
  $('source').replaceChildren();
  $('source').textContent=mountain.publicPeak?'공공 GPX 원본 · 기록 고도 · 실제 개방 및 통제는 별도 확인':'기관 원본 선형·DEM 참고자료 · 실제 개방 및 통제는 별도 확인';
  if(mountain.sourceUrl){const a=document.createElement('a');a.href=mountain.sourceUrl;a.target='_blank';a.rel='noopener';a.textContent=' · 출처 산행 안내';$('source').append(a)}
 }
 mapInit();loadReference();
 if(!mountain.catalogFile){originalCatalog(config).then(d=>{loadReference();acceptCatalog(d);appendPublicRoutes()}).catch(e=>{noCatalog('사전등록 코스 없음 · '+e.message);appendPublicRoutes()});return}
 fetchCourse(mountain.catalogFile).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{
  if(config.publicPeak){config.referenceData={type:'FeatureCollection',features:d.routes.map(r=>r.geometryData).filter(Boolean)};loadReference();}
  acceptCatalog(d);appendPublicRoutes();
 }).catch(err=>noCatalog('코스 목록 로드 실패: '+err.message));
}
const search=window.location?.search||'';
const requested=/(?:^|[?&])mountain=(\d{9,10})(?:&|$)/.exec(search)?.[1];
if(!requested||requested===defaultMountain.code)startMountain(defaultMountain);
else if(requested.length===10)fetchCourse('./data/public-peak-gpx/index.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(index=>{const c=index.mountains?.[requested];if(!c)throw Error('GPX 봉우리 없음');startMountain({...c,publicPeak:true})}).catch(e=>startMountain({code:requested,name:'공공 GPX 봉우리'}));
else fetchCourse('./data/mountain-course-index.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(index=>{
 const config=index.schema==='sanbak-mountain-course-index-v1'&&index.mountains?.[requested];
 if(config&&config.code===requested){startMountain(config);return}
 return fetchCourse('./data/nationwide/index.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(national=>startMountain({code:requested,name:national.mountains?.[requested]?.name?.replace(/_/g,' · ')||'선택한 산',bucket:national.mountains?.[requested]?.bucket})).catch(()=>startMountain({code:requested,name:'선택한 산'}));
}).catch(()=>startMountain({code:requested,name:'선택한 산'}));
})();
