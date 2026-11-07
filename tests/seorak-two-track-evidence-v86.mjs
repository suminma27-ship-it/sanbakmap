// v86: audit-only OSM road evidence. Exact topology and historic GPX proximity are not proof of permitted access.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url),read=name=>readFileSync(new URL(name,root),'utf8');
const a=JSON.parse(read('audits/seorak-v86-two-road-evidence.json'));
const prev=JSON.parse(read('audits/seorak-v85-track-connections.json'));
const v83=JSON.parse(read('seorak-v83-gpx-tracks.js').match(/window\.SANBAK_SEORAK_V83_GPX_TRACKS=(\{.*\});/)?.[1]||'null');
const compressed=read('seorak-v77-extra.js').match(/SANBAK_SEORAK_V77_B64='([^']+)'/)?.[1];
assert(compressed,'original v77 OSM dataset must exist');
const v77=JSON.parse(gunzipSync(Buffer.from(compressed,'base64')).toString('utf8'));
const decode=s=>{
 const arr=[],last=[0,0];let idx=0;
 while(idx<s.length){
  const pt=[];
  for(let k=0;k<2;k++){
   let val=0,shift=0,chunk;
   do{
    assert(idx<s.length,'truncated source polyline');
    chunk=s.charCodeAt(idx++)-63;assert(chunk>=0&&chunk<64);
    val+=(chunk%32)*2**shift;shift+=5;assert(shift<=60);
   }while(chunk>=32);
   last[k]+=(val%2?-(Math.floor(val/2)+1):val/2);
   pt.push(last[k]/1e7);
  }
  arr.push(pt);
 }
 return arr;
};
const pointKey=p=>p.join(',');
const v77Path=id=>v77.a.filter(r=>r.i===id).flatMap(r=>decode(r.e));
const v83Track=id=>v83.paths.filter(r=>r.i===id).flatMap(r=>r.p);
const hav=(p,q)=>{
 const dr=Math.PI/180,lat=(q[1]-p[1])*dr,lon=(q[0]-p[0])*dr;
 const h=Math.sin(lat/2)**2+Math.cos(p[1]*dr)*Math.cos(q[1]*dr)*Math.sin(lon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
};
assert.equal(a.version,86);
assert.equal(a.previous_release_version,85);
assert.equal(a.historic_gpx_archive_file_count,6748);
assert.equal(a.review_outcome.candidate_ways,2);
assert.equal(a.review_outcome.approved_for_addition,0);
assert.equal(a.review_outcome.new_map_lines,0);
assert.equal(a.review_outcome.displayed_seorak_lines_unchanged,703);
assert.equal(a.review_outcome.retained_paved_grade1_candidates_held,125);
assert.equal(a.review_outcome.auto_routing_changes,false);
assert.equal(a.review_outcome.source_way_geometries_modified,false);
assert.equal(a.candidates.length,2);
assert.deepEqual(new Set(a.candidates.map(x=>x.osm_way_id)),new Set([658252273,1496520172]));
assert.deepEqual(new Set(a.review_outcome.held_way_ids),new Set([658252273,1496520172]));
assert.deepEqual(new Set(prev.exact_shared_osm_vertices.map(x=>x.held_way_id)),new Set(a.candidates.map(x=>x.osm_way_id)));
for(const row of a.candidates){
 assert.equal(row.osm_highway,'track');
 assert.equal(row.osm_name,'');
 assert.deepEqual(row.osm_tags,{surface:'concrete',tracktype:'grade1'});
 assert.equal(row.decision,'hold_not_displayed');
 assert.equal(row.archived_gpx_samples_within_30m,0);
 assert.equal(row.official_vector_geometry_matched,false);
 assert.equal(row.field_verified,false);
 assert.equal(row.currently_open_for_public_hiking_verified,false);
 assert(row.nearest_archived_gpx_distance_to_exterior_m>30);
 assert(row.reviewed_exterior_length_m>0&&row.reviewed_exterior_length_m<=row.original_way_length_m);
 const osm=prev.source_geometry_fixtures[String(row.osm_way_id)];
 assert(osm&&osm.length>=2,'missing raw 2026 OSM source vertices');
 assert(osm.some(p=>pointKey(p)===pointKey(row.exact_shared_original_vertex)),
   'claimed junction must be a raw source vertex');
 const shown=row.shared_vertex_with_displayed_way_id===1198859144?
   v77Path(1198859144):v83Track(1000552594);
 assert(shown.length>=2&&shown.some(p=>pointKey(p)===pointKey(row.exact_shared_original_vertex)),
   'claimed junction must exist in original displayed-source geometry');
 const gp=row.nearest_archived_gpx_sample_lonlat,origin=row.nearest_point_on_reviewed_osm_way_lonlat;
 assert(gp.length===2&&origin.length===2&&gp.every(Number.isFinite)&&origin.every(Number.isFinite));
 assert(Math.abs(hav(gp,origin)-row.nearest_archived_gpx_distance_to_exterior_m)<20,
   'nearest GPX evidence distance inconsistent with stored source coordinates');
}
assert(a.earlier_distance_correction.exterior_clipped_nearest_archived_gpx_m_approx
 >a.earlier_distance_correction.full_way_nearest_archived_gpx_m_approx);
assert(a.candidates.find(x=>x.osm_way_id===658252273).nearest_archived_gpx_distance_to_exterior_m>1000);
const nine=a.candidates.find(x=>x.osm_way_id===1496520172);
assert(nine.reviewed_exterior_length_m<10&&nine.nearest_archived_gpx_distance_to_exterior_m>60);
const html=read('national-parks-trails.html');
assert(html.includes('국립공원 등산로 원본 · v'),'map release label must remain present');
assert(html.includes('outerSeorak.features.push(...added83)'));
assert(html.includes("v77.a.filter(r=>!excludedFacilityPathIds.has(r.i))"));
assert(html.includes("v78.paths.filter(r=>r.h==='track')"));
assert(!html.includes('seorak-v86-extra.js')&&!html.includes('reviewToggle'));
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,2);
for(const s of inline)new Function(s[1]);
assert(read('README.md').includes('## v86 업데이트'),'v86 road evidence history remains intact');
console.log('PASS v86: 2 OSM grade1 tracks held; 2022 GPX nearest ~1.09km/65m, no source promotion; 703 map lines unchanged');
