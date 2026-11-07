// v87: a deliberately SYNTHETIC fixture tests the comparator; it is NOT a downloaded official GIS match.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeOfficialGeoJSON,compareOneRoad,compareOfficial} from '../tools/compare-official-imdo.mjs';
const root=new URL('../',import.meta.url),read=f=>readFileSync(new URL(f,root),'utf8');
const audit=JSON.parse(read('audits/seorak-v87-official-gis-acquisition.json'));
const prev=JSON.parse(read('audits/seorak-v85-track-connections.json'));
const wayA=prev.source_geometry_fixtures["658252273"];
const wayB=prev.source_geometry_fixtures["1496520172"];
assert(wayA.length>30&&wayB.length===2);
const syntheticFixture={
 type:'FeatureCollection',
 name:'SYNTHETIC_TEST_ONLY_NOT_OFFICIAL_IMDO',
 features:[
  {type:'Feature',properties:{FRRD_NM:'SYNTHETIC_TEST_ONLY'},geometry:{type:'LineString',coordinates:wayA}},
  {type:'Feature',properties:{FRRD_NM:'SYNTHETIC_9M'},geometry:{type:'LineString',coordinates:wayB}}
 ]
};
const normalized=normalizeOfficialGeoJSON(syntheticFixture);
assert.equal(normalized.length,2);
const aligned=compareOneRoad(wayA,normalized);
assert.equal(aligned.geometry_conclusion,'possible_official_geometry_alignment_only');
assert(aligned.fraction_within_15m>.95);
assert(aligned.longest_consecutive_fraction>.95);
assert.equal(aligned.nearest_feature_name,'SYNTHETIC_TEST_ONLY');
assert.equal(aligned.route_allowed,false);
assert.equal(aligned.legal_access_verified,false);
const short=compareOneRoad(wayB,normalized);
assert.equal(short.geometry_conclusion,'short_segment_requires_independent_review');
assert(short.input_osm_length_m<30);
assert.equal(short.official_current_status_verified,false);
const far={type:'FeatureCollection',features:[
 {type:'Feature',properties:{name:'FAR_AWAY'},geometry:{type:'LineString',coordinates:[[129,37],[129.001,37.001]]}}
]};
const farRoad=compareOneRoad(wayA,normalizeOfficialGeoJSON(far));
assert.equal(farRoad.geometry_conclusion,'no_coordinate_alignment');
assert.equal(farRoad.nearby_official_feature_count,0);
assert.equal(farRoad.nearest_official_m,null);
assert.throws(()=>normalizeOfficialGeoJSON({type:'FeatureCollection',features:[
 {type:'Feature',geometry:{type:'Polygon',coordinates:[[[128,38],[128.1,38],[128,38]]]},properties:{}}
]}),/only centerline/);
assert.throws(()=>normalizeOfficialGeoJSON({type:'FeatureCollection',crs:{type:'name',properties:{name:'EPSG:5179'}},
 features:syntheticFixture.features}),/non-WGS84 CRS/);
assert.throws(()=>normalizeOfficialGeoJSON({type:'FeatureCollection',features:[
 {type:'Feature',geometry:{type:'LineString',coordinates:[[1000000,2000000],[1000001,2000001]]},properties:{}}
]}),/not WGS84/);
assert.throws(()=>normalizeOfficialGeoJSON({type:'FeatureCollection',features:[]}),/nonempty/);
const syntheticRun=compareOfficial(prev,syntheticFixture);
assert.equal(syntheticRun.comparisons.length,2);
assert.equal(syntheticRun.automatically_promoted_to_map,0);
assert.equal(syntheticRun.confirmed_public_access,0);
assert.equal(syntheticRun.geometry_comparison_only,true);
assert.equal(audit.version,87);
assert.equal(audit.official_imdo_geometry_acquired,false);
assert.equal(audit.official_geometry_coordinate_match_results,null);
assert.deepEqual(audit.candidate_osm_way_ids,[658252273,1496520172]);
assert.equal(audit.added_map_segments,0);
assert.equal(audit.displayed_seoraksan_segments_unchanged,703);
assert.equal(audit.held_paved_or_grade1_osm_ways_unchanged,125);
assert.equal(audit.official_current_public_access_or_closure_verified,false);
const source=read('tools/compare-official-imdo.mjs');
assert(source.includes('ogr2ogr -f GeoJSON -t_srs EPSG:4326'));
assert(source.includes('short_segment_requires_independent_review'));
assert(source.includes('Polygon boundaries'));
const html=read('national-parks-trails.html');
assert(html.includes('국립공원 등산로 원본 · v'),'keep a visible map release marker, independent of v87 source checks');
assert(!html.includes('seorak-v87-extra.js'),'no official shape data was obtained and drawn');
assert(html.includes('outerSeorak.features.push(...added83)'));
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);for(const s of scripts)new Function(s[1]);
assert(read('README.md').includes('## v87 업데이트'),'keep v87 official GIS acquisition history');
console.log('PASS v87: official-GIS acquisition not claimed, synthetic geometry comparator fails closed, two held roads and 703 map lines unchanged');
