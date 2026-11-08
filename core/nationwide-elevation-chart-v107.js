/* Sanbakmap v107: SVG DEM elevation profile display.
 * Render heights only when a strictly validated original-edge profile is ready.
 */
(function(root){
'use strict';
const NS='http://www.w3.org/2000/svg',W=1000,H=245;
function create(svg){
 if(!svg||typeof svg.setAttribute!=='function')throw Error('고도그래프 SVG 대상 없음');
 let last={status:'no_route',points:[],note:'코스를 먼저 계산해 줘'};
 const add=(kind,attrs={},parent=svg)=>{
  const node=document.createElementNS(NS,kind);
  for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
  parent.append(node);return node;
 };
 const label=(text,x,y,attrs={})=>{
  const item=add('text',{x,y,fill:'#536b5c','font-size':14,...attrs});
  item.textContent=String(text);return item;
 };
 function show(profile){
  last=profile||{status:'no_dem',points:[],note:'고도자료 없음'};
  svg.replaceChildren();add('rect',{x:0,y:0,width:W,height:H,fill:'#f8faf7'});
  // v119: partial profile uses only source-backed DEM segments. Never bridge a missing gap.
  if((last.status==='partial'||last.status==='ready_partial')&&Array.isArray(last.segments)){
   const pts=last.segments.flat(),meters=last.totalMeters;
   if(pts.length<2||!Number.isFinite(meters)||meters<=0){
    label('확인된 원본 DEM 표본이 없어',W/2,H/2,{'text-anchor':'middle'});return 'missing_samples';
   }
   const heights=pts.map(p=>p.elevationMeters),lo=Math.min(...heights),hi=Math.max(...heights),
    margin=Math.max(10,(hi-lo)*.09),min=Math.floor((lo-margin)/10)*10,
    max=Math.ceil((hi+margin)/10)*10,left=68,right=970,top=17,bottom=200;
   const xp=m=>left+(m/meters)*(right-left);
   const yp=h=>bottom-(h-min)/(max-min||1)*(bottom-top);
   for(let i=0;i<=4;i++){
    const h=min+(max-min)*i/4,y=yp(h);
    add('line',{x1:left,y1:y,x2:right,y2:y,stroke:'#dee8df','stroke-width':1});
    label(Math.round(h)+'m',left-9,y+4,{'text-anchor':'end','font-size':12});
   }
   for(const gap of last.gaps||[]){
    const x=xp(gap.fromMeters),width=Math.max(0,xp(gap.toMeters)-x);
    add('rect',{x,y:top,width,height:bottom-top,fill:'#f5d48a','fill-opacity':.32});
    add('line',{x1:x,y1:top,x2:x,y2:bottom,stroke:'#d48923','stroke-dasharray':'4 4','stroke-width':1});
   }
   for(const points of last.segments){
    if(points.length<2)continue;
    const d=points.map((p,i)=>(i?'L':'M')+xp(p.distanceMeters).toFixed(2)+' '+yp(p.elevationMeters).toFixed(2)).join(' ');
    add('path',{d,fill:'none',stroke:'#25704c','stroke-width':2.6,
     'stroke-linecap':'round','stroke-linejoin':'round'});
   }
   add('line',{x1:left,y1:bottom,x2:right,y2:bottom,stroke:'#8ca799'});
   for(let i=0;i<=4;i++){
    const m=meters*i/4;
    label((m/1000).toFixed(1)+'km',xp(m),H-19,{'text-anchor':'middle','font-size':12});
   }
   label('검증 원본 DEM 구간만 표시 · 주황 영역 높이 미확인',right,19,
    {'text-anchor':'end','font-size':12});
   return last.status;
  }
  if(last.status!=='ready'||!Array.isArray(last.points)||last.points.length<2){
   label(last.note||'검증된 고도자료가 없어',W/2,H/2,{'text-anchor':'middle','font-size':17});
   return last.status;
  }
  const pts=last.points,meters=last.totalMeters,
    heights=pts.map(p=>p.elevationMeters);
  if(!Number.isFinite(meters)||meters<=0||
     pts.some(p=>!Number.isFinite(p.distanceMeters)||!Number.isFinite(p.elevationMeters))) {
   show({status:'invalid',points:[],note:'고도값 범위가 올바르지 않아'});return 'invalid';
  }
  const lo=Math.min(...heights),hi=Math.max(...heights),
   yMin=Math.floor((lo-Math.max(10,(hi-lo)*.09))/10)*10,
   yMax=Math.ceil((hi+Math.max(10,(hi-lo)*.09))/10)*10,
   left=68,right=970,top=17,bottom=200;
  const xp=m=>left+(m/meters)*(right-left);
  const yp=h=>bottom-(h-yMin)/(yMax-yMin)*(bottom-top);
  for(let i=0;i<=4;i++){
   const h=yMin+(yMax-yMin)*i/4,y=yp(h);
   add('line',{x1:left,y1:y,x2:right,y2:y,stroke:'#dee8df','stroke-width':1});
   label(Math.round(h)+'m',left-9,y+4,{'text-anchor':'end','font-size':12});
  }
  let d='';
  for(let i=0;i<pts.length;i++){
   const p=pts[i];d+=(i?'L':'M')+xp(p.distanceMeters).toFixed(2)+' '+yp(p.elevationMeters).toFixed(2)+' ';
  }
  add('path',{d,fill:'none',stroke:'#25704c','stroke-width':2.6,
   'stroke-linecap':'round','stroke-linejoin':'round'});
  add('line',{x1:left,y1:bottom,x2:right,y2:bottom,stroke:'#8ca799'});
  for(let i=0;i<=4;i++){
   const m=meters*i/4,x=xp(m);
   label((m/1000).toFixed(1)+'km',x,H-19,{'text-anchor':'middle','font-size':12});
  }
  label('DEM 원본 표본 · 상세 통행 여부 미확인',right,19,
   {'text-anchor':'end','font-size':12});
  return 'ready';
 }
 show(last);
 return Object.freeze({show,getState:()=>({status:last.status,points:last.points?.length||0})});
}
root.SanbakElevationChartV107=Object.freeze({version:107,create});
})(typeof window!=='undefined'?window:globalThis);
