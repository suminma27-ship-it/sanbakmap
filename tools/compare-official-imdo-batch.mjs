#!/usr/bin/env node
// v88: compare all 125 held OSM exterior track ways with user-supplied, reprojected
// official-centerline GeoJSON. An alignment is only a geometric screening result.
// Never promote lines or infer current public access/permission from this script.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeOfficialGeoJSON,compareOneRoad} from './compare-official-imdo.mjs';

function assert(condition,message){if(!condition)throw Error(message);}
export function validateHeldCandidateSource(data,expectedIds){
 assert(data?.type==='FeatureCollection','Held source must be a GeoJSON FeatureCollection');
 assert(data.source_osm_boundary_relation==='17335482','Wrong OSM park boundary');
 assert(data.exterior_buffer_m===1500,'Held source must be clipped to park exterior 1500m');
 assert(data.route_allowed===false&&data.display_in_map===false
   &&data.field_verified===false,'Held source may NOT be displayed or routed');
 assert(data.coordinate_reference_system==='WGS84 EPSG:4326 longitude latitude',
   'Held source must be WGS84, with longitude before latitude');
 assert(Array.isArray(data.features)&&data.features.length>=expectedIds.length,
   'Held source lacks ways or geometry');
 assert(data.way_count===expectedIds.length&&data.part_count===data.features.length,
   'Held source counters do not match source features');
 const expected=new Set(expectedIds.map(Number)),seenWays=new Set(),partKeys=new Set();
 const byWay=new Map();
 for(const feature of data.features){
  const x=feature?.properties||{},id=Number(x.osm_way_id);
  assert(feature?.type==='Feature'&&expected.has(id),'Unexpected or missing held OSM way '+id);
  assert(x.highway==='track'&&x.route_allowed===false
    &&x.field_verified===false&&x.display_in_map===false,
    'A source way is not safely classified for map or routing');
  assert(Number.isInteger(x.exterior_part)&&x.exterior_part>=1,'Invalid source fragment number');
  const k=id+':'+x.exterior_part;
  assert(!partKeys.has(k),'Repeated OSM way/part '+k);partKeys.add(k);
  const g=feature.geometry;
  assert(g?.type==='LineString'&&Array.isArray(g.coordinates)&&g.coordinates.length>=2,
    'Exterior source geometry must be actual LineString fragments');
  const pts=g.coordinates;
  assert(pts.every(p=>Array.isArray(p)&&p.length===2
      &&p.every(Number.isFinite)&&p[0]>124&&p[0]<132&&p[1]>33&&p[1]<39.9),
      'Invalid or non-WGS84 source coordinates');
  assert(x.exterior_length_m>0,'Missing source exterior length');
  seenWays.add(id);
  if(!byWay.has(id))byWay.set(id,[]);
  byWay.get(id).push({part:x.exterior_part,coords:pts,lengthM:x.exterior_length_m});
 }
 assert(seenWays.size===expected.size,'Held OSM way count mismatch');
 for(const id of expected)assert(byWay.has(id),'Missing held OSM way '+id);
 for(const [id,parts] of byWay){
  parts.sort((a,b)=>a.part-b.part);
  parts.forEach((p,i)=>assert(p.part===i+1,'Nonconsecutive parts for '+id));
 }
 return byWay;
}
export function compareHeldBatch(candidateGeoJSON,officialGeoJSON,previousV83Audit){
 const expected=previousV83Audit?.remaining_held_way_ids;
 assert(Array.isArray(expected)&&expected.length===125&&new Set(expected).size===125,
   'Original v83 audit with 125 distinct held OSM way IDs is required');
 const held=validateHeldCandidateSource(candidateGeoJSON,expected);
 const official=normalizeOfficialGeoJSON(officialGeoJSON);
 let possible=0,short=0,unaligned=0,partial=0;
 const rows=[];
 for(const id of expected){
  const parts=held.get(id).map(fragment=>({
   exterior_part:fragment.part,source_length_m:fragment.lengthM,
   ...compareOneRoad(fragment.coords,official)
  }));
  const statuses=parts.map(x=>x.geometry_conclusion);
  let verdict='no_coordinate_alignment';
  if(statuses.includes('possible_official_geometry_alignment_only')){
   verdict='possible_geometry_alignment_only_requires_manual_review';possible++;
  }else if(statuses.includes('short_segment_requires_independent_review')){
   verdict='short_source_segment_requires_independent_review';short++;
  }else if(statuses.includes('partial_proximity_only')){
   verdict='partial_geometry_proximity_only';partial++;
  }else{unaligned++;}
  rows.push({
   osm_way_id:id,exterior_fragments:parts.length,
   exterior_length_m:+parts.reduce((s,p)=>s+p.source_length_m,0).toFixed(2),
   screening_verdict:verdict,
   fragments:parts,
   map_display_approved:false,
   legally_accessible_verified:false,
   routing_allowed:false
  });
 }
 return {
  version:88,
  official_source_user_supplied:true,
  official_dataset_authenticity_independently_verified:false,
  candidate_source:'Geofabrik South Korea OSM PBF 2026-11-05, clipped exterior 1500m',
  compared_held_ways:rows.length,compared_geometry_fragments:candidateGeoJSON.features.length,
  screened_against_official_centerline_fragments:official.length,
  geometry_screening_counts:{
   possible_alignment_only:possible,
   short_requires_review:short,
   partial_proximity_only:partial,
   no_alignment:unaligned
  },
  geometry_screening_only:true,approved_map_lines:0,approved_routing_lines:0,
  public_access_verified:false,current_open_status_verified:false,
  original_map_display_lines_unchanged:703,
  warning:'This program does NOT authenticate the submitted forestry GeoJSON. Coordinate alignment is NOT evidence of current public access, legal permission, or verified hiking trail.',
  results:rows
 };
}
function cli(){
 const arg=flag=>{const i=process.argv.indexOf(flag);return i>=0?process.argv[i+1]:null;};
 const official=arg('--geojson'),candidates=arg('--candidates'),output=arg('--output');
 if(!official||!candidates||!output){
  process.stderr.write('Usage: node tools/compare-official-imdo-batch.mjs --geojson official-imdo-wgs84-lines.geojson --candidates seorak-v88-held-125-exterior.geojson --output compare-v88.json\n'
  +'Official SHP must be obtained legitimately; inspect .prj and centerline type, then reproject to WGS84 with ogr2ogr. No official files ship with this repository.\n');
  process.exitCode=2;return;
 }
 const source=JSON.parse(readFileSync(resolve(candidates),'utf8'));
 const imported=JSON.parse(readFileSync(resolve(official),'utf8'));
 const baseline=JSON.parse(readFileSync(new URL('../audits/seorak-v83-grade1-track-gpx-review.json',import.meta.url),'utf8'));
 const result=compareHeldBatch(source,imported,baseline);
 writeFileSync(resolve(output),JSON.stringify(result,null,2)+'\n','utf8');
 process.stdout.write('Compared '+result.compared_held_ways+' held OSM ways / '+result.compared_geometry_fragments+
   ' exterior fragments. Geometric screening only; no automatic map/routing promotion. Saved '+output+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli();
