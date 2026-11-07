// v85: exact OSM shared vertices are not equivalent to approximate geometric proximity or confirmed access.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url),read=name=>readFileSync(new URL(name,root),'utf8');
const audit=JSON.parse(read('audits/seorak-v85-track-connections.json'));
const prev=JSON.parse(read('audits/seorak-v83-grade1-track-gpx-review.json'));
const source=read('seorak-v83-gpx-tracks.js');
const v83=JSON.parse(source.match(/window\.SANBAK_SEORAK_V83_GPX_TRACKS=(\{.*\});/)?.[1]||'null');
const v77raw=read('seorak-v77-extra.js').match(/SANBAK_SEORAK_V77_B64='([^']+)'/)?.[1];
assert(v77raw);
const v77=JSON.parse(gunzipSync(Buffer.from(v77raw,'base64')).toString('utf8'));
const decode=s=>{
 const pts=[],last=[0,0];let idx=0;
 while(idx<s.length){
  const xy=[];
  for(let k=0;k<2;k++){
   let val=0,shift=0,part;
   do{
    assert(idx<s.length,'broken polyline');
    part=s.charCodeAt(idx++)-63;assert(part>=0&&part<64);
    val+=(part%32)*2**shift;shift+=5;assert(shift<=60);
   }while(part>=32);
   last[k]+=(val%2?-(Math.floor(val/2)+1):val/2);
   xy.push(last[k]/1e7);
  }
  pts.push(xy);
 }
 return pts;
};
const sourceV77=id=>v77.a.filter(r=>r.i===id).flatMap(r=>decode(r.e));
const sourceV83=id=>v83.paths.filter(r=>r.i===id).flatMap(r=>r.p);
const fixture=id=>audit.source_geometry_fixtures[String(id)];
const pointKey=p=>JSON.stringify(p);
const contains=(pts,vertex)=>pts.some(p=>pointKey(p)===pointKey(vertex));
assert.equal(audit.version,85);
assert.equal(audit.source_candidate_count,129);
assert.equal(audit.held_candidate_count,125);
assert.equal(audit.displayed_gpx_aligned_ways.length,4);
assert.deepEqual(audit.displayed_gpx_aligned_ways,prev.shown_way_ids);
assert.deepEqual(audit.held_candidate_way_ids,prev.remaining_held_way_ids);
assert.equal(new Set(audit.held_candidate_way_ids).size,125);
assert.equal(audit.comparisons.displayed_exterior_distinct_osm_way_ids,155);
assert.equal(audit.comparisons.source_vertex_shared_with_displayed_exterior,2);
assert.equal(audit.comparisons.no_exact_vertex_but_nearest_5_to_15m,2);
assert.equal(audit.comparisons.no_exact_vertex_and_no_displayed_exterior_within_60m,121);
assert.equal(2+2+121,125);
assert.equal(audit.add_to_map_count,undefined); // no map-promotion field or side effects
assert.equal(audit.new_display_lines,0);
assert.equal(audit.v84_display_lines_unchanged,703);
assert.equal(audit.automatic_routing_allowed,false);
assert.equal(audit.actual_access_and_current_closure_verified,false);
assert.equal(audit.paved_grade1_source_components_total,47);
assert.deepEqual([...new Set(audit.exact_shared_osm_vertices.map(x=>x.held_way_id))].sort((a,b)=>a-b),[658252273,1496520172]);
assert.deepEqual([...new Set(audit.nearby_but_not_exact_osm_vertices.map(x=>x.held_way_id))].sort((a,b)=>a-b),[1000552593,1496520173]);
for(const entry of audit.exact_shared_osm_vertices){
 const src=fixture(entry.held_way_id);
 assert(src?.length>=2,'source geometry fixture absent');
 assert(contains(src,entry.node_lonlat),'held OSM way does not contain claimed exact source vertex');
 const display=entry.displayed_way_id===1198859144?sourceV77(1198859144):sourceV83(1000552594);
 assert(display.length>=2,'displayed source missing');
 assert(contains(display,entry.node_lonlat),'displayed OSM way missing exact source vertex');
 assert.equal(entry.display_decision,'keep_held');
}
for(const entry of audit.nearby_but_not_exact_osm_vertices){
 const held=fixture(entry.held_way_id),display=sourceV83(entry.nearest_displayed_way_id);
 assert(held?.length>=2&&display.length>=2);
 const shownPoints=new Set(display.map(pointKey));
 assert(!held.some(p=>shownPoints.has(pointKey(p))),'near-only way accidentally shares exact vertex');
 assert(entry.source_geometry_distance_m_approx>5&&entry.source_geometry_distance_m_approx<15);
 assert.equal(entry.display_decision,'keep_held');
}
const components=audit.gpx_displayed_road_components_in_paved_grade1_subset;
assert.equal(components.length,4);
for(const group of components){
 assert(prev.shown_way_ids.includes(group.displayed_way_id));
 assert.equal(group.component_way_ids?.length||1,group.component_way_count);
}
assert.equal(components.find(x=>x.displayed_way_id===1000552594).held_adjacent_in_component,8);
const html=read('national-parks-trails.html');
assert(html.includes('국립공원 등산로 원본 · v85'));
assert(html.includes("v77.a.filter(r=>!excludedFacilityPathIds.has(r.i))"));
assert(html.includes("v78.paths.filter(r=>r.h==='track')"));
assert(html.includes('outerSeorak.features.push(...added83)'));
assert(!html.includes('seorak-v85-extra.js')&&!html.includes('reviewToggle'));
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);
for(const x of scripts)new Function(x[1]);
assert(read('README.md').includes('**현재 버전: v85**'));
console.log('PASS v85: 129 source roads, 125 held, 2 exact shared-node contacts, 2 near-only gaps; 703 drawn lines remain');
