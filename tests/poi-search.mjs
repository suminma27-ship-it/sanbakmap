// Run from repository root: node tests/poi-search.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const dataPrefix='<script id="parkData" type="application/json">';
const i=html.indexOf(dataPrefix)+dataPrefix.length,j=html.indexOf('</script>',i);
const parks=JSON.parse(html.slice(i,j));
function source(name){
 const a=html.indexOf('function '+name+'('),b=html.indexOf('\n}',a);
 assert(a>=0&&b>a,'Missing function: '+name);
 return html.slice(a,b+2);
}
const hav=(a,b)=>111.195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);
const api=new Function('majorPoiList','hav',source('searchablePoiLocations')+'\n'+source('findPoiLocations')+
 '\nreturn {searchablePoiLocations,findPoiLocations};')(p=>p.poiLabels||[],hav);
assert.equal(parks.length,24);
const seorak=parks.find(p=>p.id==='seorak');
assert(seorak?.net);
const daechung=api.findPoiLocations(seorak,'대청');
assert(daechung.length>0&&daechung[0].name.includes('대청'),'Partial-name search fails');
assert(api.findPoiLocations(seorak,'대 청').length>0,'Whitespace-insensitive search fails');
assert.equal(api.findPoiLocations(seorak,'')[0],undefined,'Empty query must not suggest a location');
assert.equal(api.searchablePoiLocations(parks.find(p=>p.name==='한라산')).length,0,'Schematic map must not claim GPS search');
assert(html.includes('id="poiSearch"'));
assert(html.includes('id="poiSearchGo"'));
assert(html.includes('id="poiSearchHints"'));
const target=daechung[0],draws=[],toasts=[];
const maps={map:{zoom:1,panX:0,panY:0,fit:'route'},builderMap:{zoom:1,panX:0,panY:0,fit:'course'}};
const builder={choices:[{name:'original'}],line:[[128.4,38.1],[128.5,38.2]]};
const input={value:''},mapEl={scrollIntoView(){}};
const focus=new Function('park','searchablePoiLocations','hav','view','maps','projection',
 'mapViewport','mobileMapVerticalBounds','drawMap','$','toast',
 source('focusMapOnPoi')+'\nreturn focusMapOnPoi;')(
 ()=>seorak,api.searchablePoiLocations,hav,{tab:'build'},maps,
 ()=>({project:()=>[120,160]}),()=>({W:900,H:600}),()=>({top:60,bottom:540}),
 id=>draws.push(id),id=>id==='poiSearch'?input:mapEl,s=>toasts.push(s));
assert.equal(focus(target),true,'Known point should be found');
assert.equal(maps.builderMap.zoom,3);
assert.equal(maps.builderMap.fit,'all');
assert.equal(maps.builderMap.panX,330);
assert.equal(maps.builderMap.panY,140);
assert.deepEqual(draws,['builderMap']);
assert.equal(input.value,target.name);
assert.deepEqual(builder.choices,[{name:'original'}],'Search must not alter selected waypoints');
assert.equal(focus({name:'unregistered',lon:1,lat:1}),false);
assert.equal(draws.length,1,'Unknown point must not redraw the map');
console.log('PASS: POI search, schematic safeguard, map centering and non-mutating lookup');
