/* Sanbakmap nationwide data contract v1.
 * One source-independent classification gate for all mountains.
 * This module does NOT add routing edges, infer park access, or modify source geometry.
 * Works in Node and browser without a bundler.
 */
(function(root){
'use strict';
const VERSION=1;
const KINDS=Object.freeze(['trail','forest_road','uncertain_footway','excluded','review']);
const koreanCoord=p=>Array.isArray(p)&&p.length>=2&&
 Number.isFinite(p[0])&&Number.isFinite(p[1])&&
 p[0]>=124&&p[0]<=132&&p[1]>=32&&p[1]<=40;
function asText(x){return typeof x==='string'?x.trim():''}
function classify(tags={}){
 if(tags.access==='no'||tags.footway==='sidewalk')return 'excluded';
 if(tags.highway==='track')return 'forest_road';
 if(tags.highway==='path'||tags.highway==='steps')return 'trail';
 if(tags.highway==='footway'||tags.highway==='pedestrian')return 'uncertain_footway';
 if(tags.source_kind==='national_trail')return 'trail';
 if(tags.source_kind==='national_forest_road')return 'forest_road';
 return 'review';
}
function normalizeLine(feature,{dataset,sourceID,mountainCode}={}){
 if(!feature||feature.type!=='Feature'||feature.geometry?.type!=='LineString')return {ok:false,reason:'not_linestring'};
 const points=feature.geometry.coordinates;
 if(!Array.isArray(points)||points.length<2||!points.every(koreanCoord))
  return {ok:false,reason:'invalid_wgs84_coordinates'};
 const id=asText(dataset),sid=asText(sourceID),code=String(mountainCode??'');
 if(!id||!sid||!/^\d{9}$/.test(code))return {ok:false,reason:'missing_provenance_or_mountain_code'};
 const tags=feature.properties||{},category=classify(tags);
 // Coordinates are copied in source order. Nearby endpoints are NEVER merged.
 return {ok:true,line:{
  id:id+':'+sid,mountain_code:code,dataset:id,source_record_id:sid,
  display_category:category,geometry:{type:'LineString',coordinates:points.map(p=>p.slice())},
  evidence_status:'raw_source_only',
  source_node_identity_verified:false,
  current_access_verified:false,
  official_trail_verified:false,
  routing_allowed:false,
  synthetic_connection:false
 }};
}
function validateMountainIndex(records,expectedCount=2932){
 if(!Array.isArray(records))return {ok:false,reason:'not_array'};
 if(expectedCount!==null&&records.length!==expectedCount)return {ok:false,reason:'unexpected_count',count:records.length};
 const seen=new Set();
 for(const r of records){
  const code=String(r?.c??r?.code??''),name=asText(r?.n??r?.name);
  if(!/^\d{9}$/.test(code)||!name)return {ok:false,reason:'invalid_mountain_record'};
  if(seen.has(code))return {ok:false,reason:'duplicate_mountain_code',code};
  seen.add(code);
 }
 return {ok:true,count:records.length,unique_codes:seen.size};
}
function statusOf(line){
 if(!line?.routing_allowed){
  return {display:line?.display_category||'review',route:'not_verified',reason:'source_geometry_is_not_approved_route'};
 }
 // This contract NEVER upgrades an imported line to approved route by itself.
 return {display:line.display_category||'review',route:'outside_contract',reason:'routing_must_be_authorized_by_separate_verified_graph'};
}
root.SanbakNationwideContract=Object.freeze({
 version:VERSION,kinds:KINDS,classify,normalizeLine,validateMountainIndex,statusOf
});
})(typeof window!=='undefined'?window:globalThis);
