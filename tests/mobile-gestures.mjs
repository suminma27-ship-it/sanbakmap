// Regression tests for mobile gestures. From repository root:
// node tests/mobile-gestures.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function source(name){
 const a=html.indexOf('function '+name+'('),b=html.indexOf('\n}',a);
 assert(a>=0&&b>a,'Missing app function: '+name);
 return html.slice(a,b+2);
}
class Point{
 constructor(x,y){this.x=x;this.y=y}
 matrixTransform(matrix){return {x:this.x*(matrix.xScale??1)+(matrix.xOffset??0),y:this.y*(matrix.yScale??1)+(matrix.yOffset??0)}}
}
function eventHub(extra={}){
 const events={};
 return {element:{addEventListener:(name,fn)=>(events[name]??=[]).push(fn),...extra},
  send(name,id,x=160,y=100,attrs={}){
   const e={pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0,
    preventDefault(){},...attrs};
   for(const f of events[name]||[])f(e);
  }};
}
function timerHub(){
 let time=0,id=0;const pending=new Map();
 return {set(fn,delay){pending.set(++id,{fn,at:time+delay});return id},
  clear(id){pending.delete(id)},
  advance(ms){time+=ms;for(const [i,t] of [...pending])if(t.at<=time){pending.delete(i);t.fn()}}};
}
function planFixture(){
 const timers=timerHub(),selected=[];
 const h=eventHub({
  getScreenCTM:()=>({inverse:()=>({xScale:2,yScale:3,xOffset:-100,yOffset:-40})}),
  getBoundingClientRect:()=>({left:0,top:0,width:450,height:285}),
  setPointerCapture(){},hasPointerCapture:()=>true
 });
 const init=new Function('$','DOMPoint','setTimeout','clearTimeout','planPickAt',
  source('initializePlanMap')+'\nreturn initializePlanMap')(
  ()=>h.element,Point,timers.set.bind(timers),timers.clear.bind(timers),xy=>selected.push(xy));
 init();return {...h,selected,...timers};
}
{
 let h=planFixture();h.send('pointerdown',1);h.advance(600);
 assert.deepEqual(h.selected,[[220,260]],'Long hold must use SVG inverse transform');
 h.send('pointerup',1);h.advance(600);assert.equal(h.selected.length,1);
 h=planFixture();h.send('pointerdown',1);h.send('pointerup',1);h.advance(600);assert.equal(h.selected.length,0,'Short tap must not select');
 h=planFixture();h.send('pointerdown',1);h.send('pointermove',1,174);h.advance(600);assert.equal(h.selected.length,0,'Map movement must cancel hold');
 h=planFixture();h.send('pointerdown',1);h.send('pointerdown',2,180);
 h.send('pointerup',2,180);h.advance(600);assert.equal(h.selected.length,0,'Pinch cannot choose waypoint');
 h.send('pointerup',1);h.send('pointerdown',3);h.advance(600);assert.equal(h.selected.length,1,'Fresh hold should recover');
 h=planFixture();h.send('pointerdown',1);h.send('pointercancel',1);h.advance(600);assert.equal(h.selected.length,0);
 h=planFixture();h.send('pointerdown',1);h.send('lostpointercapture',1);h.advance(600);assert.equal(h.selected.length,0);
}
function geoFixture(build=true){
 const timers=timerHub(),chosen=[],added=[],draws=[];
 const h=eventHub({
  setPointerCapture(){},getScreenCTM:()=>({a:1,inverse:()=>({})}),
  getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),
  viewBox:{baseVal:{width:900,height:600}}
 });
 const maps={builderMap:{zoom:1,panX:0,panY:0,Q:{inverse:(x,y)=>[x,y],project:x=>x}},map:{zoom:1,panX:0,panY:0}};
 const init=new Function('$','maps','DOMPoint','requestAnimationFrame','drawMap',
  'mapViewport','mobileMapVerticalBounds','park','nearest','addWaypoint',
  'chooseGeoPoi','toast','setTimeout','clearTimeout',
  source('mapTouch')+'\nreturn mapTouch')(
  ()=>h.element,maps,Point,fn=>fn(),id=>draws.push(id),()=>({W:900,H:600}),
  ()=>({top:0,bottom:600}),()=>({net:{edges:[]}}),
  (net,lon,lat)=>({xy:[lon,lat],km:.04,edge:0,t:.5}),
  q=>added.push(q),name=>chosen.push(name),()=>{},
  timers.set.bind(timers),timers.clear.bind(timers));
 init(build?'builderMap':'map',build);return {...h,...timers,maps,added,chosen,draws};
}
const marker={closest:()=>({getAttribute:()=> '소청봉'})};
{
 let h=geoFixture();h.send('pointerdown',1,130,90,{target:marker});h.send('pointerup',1,130,90,{target:marker});
 assert.deepEqual(h.chosen,['소청봉'],'POI tap selects once');
 h=geoFixture();h.send('pointerdown',1,130,90,{target:marker});
 h.send('pointermove',1,200,90,{target:marker});h.send('pointerup',1,200,90,{target:marker});
 assert.equal(h.chosen.length,0,'POI dragging must pan, not select');
 assert.equal(h.maps.builderMap.panX,70);
 h=geoFixture();h.send('pointerdown',1,130,90);h.advance(600);h.send('pointerup',1,130,90);
 assert.equal(h.added.length,1,'Stationary trail hold adds waypoint');
 h=geoFixture();h.send('pointerdown',1,130,90);h.send('pointermove',1,150,90);h.advance(600);
 assert.equal(h.added.length,0,'Panning must not add waypoint');
 h=geoFixture();h.send('pointerdown',1,130,90,{target:marker});
 h.send('pointerdown',2,260,90);h.advance(600);h.send('pointermove',2,400,90);
 h.send('pointerup',2,400,90);h.send('pointerup',1,130,90,{target:marker});
 assert(h.maps.builderMap.zoom>1,'Two-finger zoom should work');
 assert.equal(h.chosen.length,0,'Pinch must not select POI');
 assert.equal(h.added.length,0,'Pinch must not add route');
 h.send('pointerdown',3,130,90,{target:marker});h.send('pointerup',3,130,90,{target:marker});
 assert.equal(h.chosen.length,1,'POI tap recovers after pinch');
 h=geoFixture();h.send('pointerdown',1);h.send('pointercancel',1);h.advance(600);
 assert.equal(h.added.length,0,'Cancelled hold must not add');
 h=geoFixture(false);h.send('pointerdown',1,130,90,{target:marker});h.send('pointerup',1,130,90,{target:marker});
 assert.equal(h.chosen.length,0,'Read-only map touch must not crash or edit');
}
function chartFixture(){
 const updates=[],builder={line:[[0,0,100],[.1,.1,200]],focusIndex:1,focusKm:null};
 const h=eventHub({getScreenCTM:()=>null,getBoundingClientRect:()=>({left:0,width:700})});
 const init=new Function('$','view','park','builder','metrics','DOMPoint','updateBuilder',
  source('bindRouteChart')+'\nreturn bindRouteChart')(
  ()=>h.element,{tab:'build'},()=>({plan_graph:null}),builder,
  ()=>({km:10}),Point,()=>updates.push(builder.focusKm));
 init();return {...h,updates,builder};
}
{
 let h=chartFixture();h.send('pointerdown',1,352);h.send('pointerup',1,352);
 assert.equal(h.updates.length,1);assert(Math.abs(h.updates[0]-5)<.01);
 h=chartFixture();h.send('pointerdown',1,352);h.send('pointermove',1,420);h.send('pointerup',1,420);
 assert.equal(h.updates.length,0,'Chart drag must not alter focus');
 h=chartFixture();h.send('pointerdown',1,352);h.send('pointerdown',2,450);
 h.send('pointerup',2,450);h.send('pointerup',1,352);
 assert.equal(h.updates.length,0,'Chart pinch must not alter focus');
 h=chartFixture();h.send('pointerdown',1,352);h.send('pointercancel',1);
 h.send('pointerup',1,352);assert.equal(h.updates.length,0,'Chart cancel must be safe');
}
function sheetFixture(initial,rowBounds){
 let label='',handleLabel='',aria='';
 const button={getBoundingClientRect:()=>({bottom:95}),
  setAttribute:(k,v)=>{if(k==='aria-expanded')aria=v},
  querySelector:()=>({set textContent(v){label=v}})};
 const row={getBoundingClientRect:()=>rowBounds};
 const shell={dataset:{sheetState:initial,detailsOpen:'false'},scrollTop:20,
  getBoundingClientRect:()=>({top:0,bottom:400}),
  querySelector:key=>key.startsWith('.waypoint-step')?row:
   {setAttribute:(k,v)=>{if(k==='aria-label')handleLabel=v}}};
 const init=new Function('$','window','builder','plan','requestAnimationFrame',
  source('revealReorderedSteps')+'\nreturn revealReorderedSteps')(
  id=>id==='geoDetailsShell'?shell:button,{matchMedia:()=>({matches:true})},
  {focusIndex:3},{focusIndex:2},fn=>fn());
 init('geo');return {sheet:shell,label,aria,handleLabel};
}
{
 let h=sheetFixture('half',{top:350,bottom:440});
 assert.equal(h.sheet.dataset.sheetState,'half','Reorder must keep half sheet');
 assert(h.sheet.scrollTop>20,'Reordered item should be scrolled into view');
 h=sheetFixture('peek',{top:150,bottom:190});
 assert.equal(h.sheet.dataset.sheetState,'half','Reorder must not force full sheet');
 assert.equal(h.aria,'true');assert.equal(h.label,'접기 −');assert(h.handleLabel.length>0);
 h=sheetFixture('full',{top:150,bottom:190});
 assert.equal(h.sheet.dataset.sheetState,'full','Already full sheet should remain full');
}
console.log('PASS: plan long-press, map pan/zoom/POI, chart taps, and reorder panel');
