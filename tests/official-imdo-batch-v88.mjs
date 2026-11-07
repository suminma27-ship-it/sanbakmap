// v88: synthetic-only batch official-GIS screen for all 125 held OSM ways.
// No authenticated KFS GIS file is present in the repo, and this test does NOT claim official matches.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeOfficialGeoJSON} from '../tools/compare-official-imdo.mjs';
import {validateHeldCandidateSource,compareHeldBatch} from '../tools/compare-official-imdo-batch.mjs';
const root=new URL('../',import.meta.url),read=name=>readFileSync(new URL(name,root),'utf8');
const baseline=JSON.parse(read('audits/seorak-v83-grade1-track-gpx-review.json'));
const manifest=JSON.parse(read('audits/seorak-v88-imdo-batch-preparation.json'));
assert.equal(baseline.remaining_held_way_ids.length,125);
const held=baseline.remaining_held_way_ids;
const features=[];
for(let i=0;i<held.length;i++){
 const lon=128.3+i*.004;
 features.push({type:'Feature',properties:{
  osm_way_id:held[i],exterior_part:1,highway:'track',exterior_length_m:87,
  field_verified:false,display_in_map:false,route_allowed:false
 },geometry:{type:'LineString',coordinates:[[lon,38.1],[lon+.001,38.1]]}});
 if(i===1||i===2){
  features.push({type:'Feature',properties:{
   osm_way_id:held[i],exterior_part:2,highway:'track',exterior_length_m:9,
   field_verified:false,display_in_map:false,route_allowed:false
  },geometry:{type:'LineString',coordinates:[[lon,38.101],[lon+.0001,38.101]]}});
 }
}
const candidates={type:'FeatureCollection',source_osm_boundary_relation:'17335482',
 exterior_buffer_m:1500,coordinate_reference_system:'WGS84 EPSG:4326 longitude latitude',
 way_count:125,part_count:127,field_verified:false,display_in_map:false,route_allowed:false,features};
const validated=validateHeldCandidateSource(candidates,held);
assert.equal(validated.size,125);
assert.equal(validated.get(held[1]).length,2);
const first=features[0].geometry.coordinates;
const official={type:'FeatureCollection',features:[
 {type:'Feature',properties:{FRRD_NM:'SYNTHETIC_TEST_ONLY_NOT_KFS'},
  geometry:{type:'LineString',coordinates:first}}
]};
assert.equal(normalizeOfficialGeoJSON(official).length,1);
const report=compareHeldBatch(candidates,official,baseline);
assert.equal(report.version,88);
assert.equal(report.compared_held_ways,125);
assert.equal(report.compared_geometry_fragments,127);
assert.equal(report.results.length,125);
assert.equal(report.official_dataset_authenticity_independently_verified,false);
assert.equal(report.approved_map_lines,0);
assert.equal(report.approved_routing_lines,0);
assert.equal(report.public_access_verified,false);
assert.equal(report.current_open_status_verified,false);
assert.equal(report.original_map_display_lines_unchanged,703);
assert(report.geometry_screening_counts.possible_alignment_only>=1);
assert.equal(Object.values(report.geometry_screening_counts).reduce((sum,x)=>sum+x,0),125);
assert.equal(report.results[0].screening_verdict,'possible_geometry_alignment_only_requires_manual_review');
assert(report.results.every(r=>r.map_display_approved===false&&r.routing_allowed===false));
const bad={...candidates,features:features.slice(0,-1),part_count:126};
assert.throws(()=>validateHeldCandidateSource(bad,held),/count|Nonconsecutive|Missing/);
const duplicate={...candidates,features:[...features.slice(0,-1),features[0]]};
assert.throws(()=>validateHeldCandidateSource(duplicate,held),/Repeated OSM way\/part/);
const badCrs={...candidates,coordinate_reference_system:'EPSG:5179'};
assert.throws(()=>validateHeldCandidateSource(badCrs,held),/WGS84/);
const incorrectlyPromoted={...candidates,display_in_map:true};
assert.throws(()=>validateHeldCandidateSource(incorrectlyPromoted,held),/may NOT be displayed/);
const officialPolygon={type:'FeatureCollection',features:[{
 type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[128,38],[129,38],[128,38]]]}}]};
assert.throws(()=>compareHeldBatch(candidates,officialPolygon,baseline),/only centerline/);
assert.equal(manifest.version,88);
assert.equal(manifest.held_osm_ways,125);
assert.equal(manifest.exterior_line_fragments,127);
assert.equal(manifest.official_imdo_geometry_acquired,false);
assert.equal(manifest.displayed_seorak_lines_unchanged,703);
assert(manifest.original_source_file_sha256.length===64);
const py=read('tools/prepare-seorak-candidates.py');
assert(py.includes('park.buffer(1500'));
assert(py.includes('remaining_held_way_ids'));
const html=read('national-parks-trails.html');
assert(html.includes('국립공원 등산로 원본 · v88'));
assert(html.includes("v77.a.filter(r=>!excludedFacilityPathIds.has(r.i))"));
assert(html.includes("v78.paths.filter(r=>r.h==='track')"));
assert(html.includes('outerSeorak.features.push(...added83)'));
assert(!html.includes('seorak-v88-extra.js'));
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);for(const s of scripts)new Function(s[1]);
assert(read('README.md').includes('**현재 버전: v88**'));
console.log('PASS v88: 125 held OSM roads / 127 exterior parts, no official GIS assumed or map/routing promotion');
