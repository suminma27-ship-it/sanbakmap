/* Sanbakmap v106 SVG trail presenter — no basemap/tile dependencies.
 * The v101 display network is a simplified visual guide. Only v102 original
 * graph segment IDs can be highlighted. Missing matches are NOT connected.
 */
(function(root){
'use strict';
const NS='http://www.w3.org/2000/svg',W=1000,H=640;
const tag=(type,attrs={},parent)=>{
 const x=document.createElementNS(NS,type);
 for(const [k,v]of Object.entries(attrs))x.setAttribute(k,String(v));
 if(parent)parent.append(x);
 return x;
};
function create(svg,{onPoiClick}={}){
 if(!svg||typeof svg.setAttribute!=='function')throw Error('SVG map target missing');
 let source=null,waypoints=[],pois=[],plan=null,scale=1,pan=[0,0],pointer=null;
 let transform=()=>null;
 const state={mapDataLoaded:false,renderedSegments:0,missingSegments:0};
 function project(paths){
  let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;
  for(const points of paths)for(const p of points){
   xmin=Math.min(xmin,p[0]);xmax=Math.max(xmax,p[0]);
   ymin=Math.min(ymin,p[1]);ymax=Math.max(ymax,p[1]);
  }
  if(!Number.isFinite(xmin))return null;
  const mx=(xmax+xmin)/2,my=(ymax+ymin)/2,dx=Math.max(30,xmax-xmin),dy=Math.max(30,ymax-ymin);
  const q=Math.min((W-66)/dx,(H-66)/dy);
  return p=>[W/2+(p[0]-mx)*q,H/2-(p[1]-my)*q];
 }
 function path(points,fn){
  let out='';
  for(let i=0;i<points.length;i++){
   const p=fn(points[i]);
   out+=(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);
  }
  return out;
 }
 function applyCamera(g){
  g.setAttribute('transform','translate('+pan[0]+' '+pan[1]+') translate(500 320) scale('+scale+') translate(-500 -320)');
 }
 function fit(){scale=1;pan=[0,0];render()}
 function zoom(n){scale=Math.min(25,Math.max(1,scale*n));render()}
 function render(){
  svg.replaceChildren();
  tag('rect',{width:W,height:H,fill:'#f0f4ef'},svg);
  if(!source?.paths?.length){
   const t=tag('text',{x:500,y:320,'text-anchor':'middle',fill:'#617b6a','font-size':18},svg);
   t.textContent='등산로 선형 자료를 불러오면 이곳에 표시돼';
   state.mapDataLoaded=false;return;
  }
  state.mapDataLoaded=true;
  const projector=project(source.paths);
  if(!projector)return;
  const stage=tag('g',{},svg);applyCamera(stage);
  const base=tag('g',{},stage);
  let d='';let segments=0;
  for(const pts of source.paths){
   if(pts.length<2)continue;
   d+=path(pts,projector)+' ';segments++;
  }
  tag('path',{d,fill:'none',stroke:'#598467','stroke-width':1.65,
    'stroke-linejoin':'round','stroke-linecap':'round','vector-effect':'non-scaling-stroke',
    'pointer-events':'none'},base);
  state.renderedSegments=segments;
  let highlight={paths:[],unmatchedEdges:0,drawnEdges:0};
  if(plan?.status==='geometry_preview_only'){
   highlight=source.overlay(plan);
   const g=tag('g',{},stage);let routeD='';
   for(const pts of highlight.paths)if(pts.length>=2)routeD+=path(pts,projector)+' ';
   if(routeD)tag('path',{d:routeD,fill:'none',stroke:'#186ac0','stroke-width':4,
    'stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke',
    'pointer-events':'none'},g);
  }
  state.missingSegments=highlight.unmatchedEdges;
  const labeled=new Map();
  for(const poi of pois){
   if(!Number.isInteger(poi.nodeId)||poi.nodeId>=source.nodesXY.length)continue;
   if(!labeled.has(poi.nodeId))labeled.set(poi.nodeId,poi);
  }
  let markers=0;
  for(const [id,poi]of labeled){
   if(markers++>=140)break;
   const p=projector(source.nodesXY[id]);
   const m=tag('circle',{cx:p[0].toFixed(1),cy:p[1].toFixed(1),r:3.2,
    fill:'#e0eac3',stroke:'#315f46','stroke-width':1.1,'vector-effect':'non-scaling-stroke',
    tabindex:0,role:'button','aria-label':'경유지 '+poi.label+' 선택'},stage);
   m.style.cursor='pointer';
   const t=tag('title',{},m);t.textContent=poi.label+' · 경유지 추가';
   if(typeof onPoiClick==='function'){
    m.addEventListener('click',e=>{e.stopPropagation();onPoiClick(id)});
    m.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPoiClick(id)}});
   }
  }
  waypoints.forEach((id,i)=>{
   const xy=source.nodesXY[id];if(!xy)return;
   const p=projector(xy);
   tag('circle',{cx:p[0].toFixed(1),cy:p[1].toFixed(1),r:10,fill:'#245a96',
     stroke:'#fff','stroke-width':2,'vector-effect':'non-scaling-stroke',
     'pointer-events':'none'},stage);
   const t=tag('text',{x:p[0].toFixed(1),y:(p[1]+4).toFixed(1),
     'text-anchor':'middle',fill:'white','font-size':12,'font-weight':'bold',
     'pointer-events':'none'},stage);t.textContent=String(i+1);
  });
  const marker=tag('text',{x:22,y:H-17,fill:'#516e5d','font-size':14},svg);
  marker.textContent=source.kind==='knps'?'공단 역사적 원본 · 위치 참고용':'산림청 역사적 선형 · 표시용 3m 단순화';
 }
 function update({model,points,selected,route}={}){
  if(model!==undefined){source=model;fit();return}
  if(points!==undefined)pois=points;
  if(selected!==undefined)waypoints=selected;
  if(route!==undefined)plan=route;
  render();
 }
 function setSource(data){
  source=data||null;waypoints=[];pois=[];plan=null;scale=1;pan=[0,0];render();
 }
 svg.addEventListener('wheel',e=>{
  if(!source?.paths?.length)return;
  e.preventDefault();zoom(e.deltaY<0?1.28:1/1.28);
 },{passive:false});
 svg.addEventListener('pointerdown',e=>{
  if(!source?.paths?.length||e.target?.getAttribute('role')==='button')return;
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,px:pan[0],py:pan[1]};
  svg.setPointerCapture(e.pointerId);
 });
 svg.addEventListener('pointermove',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  const bounds=svg.getBoundingClientRect();
  pan=[pointer.px+(e.clientX-pointer.x)*W/bounds.width,
   pointer.py+(e.clientY-pointer.y)*H/bounds.height];
  render();
 });
 svg.addEventListener('pointerup',()=>pointer=null);
 svg.addEventListener('pointercancel',()=>pointer=null);
 render();
 return Object.freeze({setSource,update,fit,zoom,getState:()=>({...state})});
}
root.SanbakTrailCanvasV106=Object.freeze({version:106,create});
})(typeof window!=='undefined'?window:globalThis);
