// v82: keep original OSM source archives while excluding facility-scale walking network from hiking map.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const extract=(name,key)=>{
 const match=read(name).match(new RegExp(key+"='([^']+)'"));
 assert(match,'missing original OSM archive '+name);
 return JSON.parse(gunzipSync(Buffer.from(match[1],'base64')).toString('utf8'));
};
const v77=extract('seorak-v77-extra.js','SANBAK_SEORAK_V77_B64');
const v78=extract('seorak-v78-extra.js','SANBAK_SEORAK_V78_B64');
const scope=JSON.parse(read('audits/seorak-v82-facility-path-scope.json'));
const ids=new Set(scope.excluded_way_ids);
assert.equal(scope.version,82);
assert.equal(scope.original_v77_source_fragments,27);
assert.equal(scope.source_fragment_count,8);
assert.equal(ids.size,7);
assert.equal(scope.originally_displayed_seorak_lines,707);
assert.equal(scope.new_displayed_seorak_lines,699);
assert.equal(scope.original_source_data_modified,false);
assert.equal(scope.routing_allowed,false);
assert.equal(scope.field_verified,false);
assert.equal(v77.a.length,27,'v77 raw OSM source must remain unchanged');
assert.equal(v78.paths.length,9,'v78 raw OSM source must remain unchanged');
const removed=v77.a.filter(row=>ids.has(row.i));
const retained=v77.a.filter(row=>!ids.has(row.i));
assert.equal(removed.length,8);
assert.equal(retained.length,19);
assert.deepEqual([...new Set(removed.map(row=>row.i))].sort((a,b)=>a-b),
  [...ids].sort((a,b)=>a-b));
assert.equal(retained.filter(row=>ids.has(row.i)).length,0);
const encodeCoords=encoded=>{
 const coords=[],last=[0,0];let index=0;
 while(index<encoded.length){
  const point=[];
  for(let axis=0;axis<2;axis++){
   let v=0,shift=0,part;
   do{
    assert(index<encoded.length,'truncated polyline');
    part=encoded.charCodeAt(index++)-63;
    assert(part>=0&&part<64,'invalid polyline character');
    v+=(part%32)*2**shift;shift+=5;
    assert(shift<62);
   }while(part>=32);
   last[axis]+=v%2?-(Math.floor(v/2)+1):v/2;
   point.push(last[axis]/1e7);
  }
  coords.push(point);
 }
 return coords;
};
const vertexSet=new Set(retained.flatMap(row=>encodeCoords(row.e).map(p=>p.join(','))));
for(const track of v78.paths.filter(row=>row.h==='track')){
 assert(vertexSet.has(track.j.join(',')),
   'v82 filter must not orphan retained forest track '+track.i);
}
assert.equal(v78.paths.filter(row=>row.h==='track').length,3);
assert.equal(v78.paths.filter(row=>row.h==='footway').length,6);
const html=read('national-parks-trails.html');
assert(html.includes("excludedFacilityPathIds=new Set(["));
assert(html.includes("v77.a.filter(r=>!excludedFacilityPathIds.has(r.i)).map(r=>{"));
assert(html.includes("v78.paths.filter(r=>r.h==='track').map(r=>{"));
assert(!html.includes('reviewToggle')&&!html.includes('seorak-v80-review'));
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
assert(read('README.md').includes('## v82 업데이트'),'v82 audit history remains available');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);
for(const m of scripts)new Function(m[1]);
console.log('PASS v82: 7 facility paths / 8 fragments omitted, 19 v77 source fragments and all 3 forest tracks retained; 699 display lines');
