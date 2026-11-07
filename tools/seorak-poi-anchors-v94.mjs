#!/usr/bin/env node
// v94: source-node-verified OSM contacts as future POI matching anchors.
// A shared OSM node is NOT proof of a named junction, permitted hiking route or park POI.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {v92VisibleLines} from './seorak-topology-v92.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=(file)=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const groups=['path_path','track_track','pedestrian_or_footway'];
const idString=id=>String(id);
const sortedIds=ids=>ids.map(idString).sort();
const approxValid=c=>Array.isArray(c)&&c.length===2&&c.every(Number.isFinite)&&
 c[0]>128.1&&c[0]<128.75&&c[1]>37.9&&c[1]<38.38;

export function buildPOIAnchors({
 v90=read('audits/seorak-v90-original-node-review.json'),
 v91=read('audits/seorak-v91-display-way-index.json'),
 v92=read('audits/seorak-v92-inside-footway-review.json'),
 activeLines=v92VisibleLines()
}={}){
 assert.equal(v90.version,90);
 assert.equal(v91.version,91);
 assert.equal(v92.version,92);
 assert.equal(v90.source_pbf_sha256,v91.source_pbf_sha256);
 assert.equal(v90.source_pbf_sha256,v92.source_osm_pbf_sha256);
 assert.equal(v90.source_way_node_pairs_checked,26);
 assert.equal(v90.source_way_node_pairs_sharing_exact_node,26);
 assert.equal(v90.unique_shared_pbf_node_ids,26);
 assert.equal(v90.cases.length,26);
 assert.equal(activeLines.length,700);
 const active=new Map(activeLines.map(p=>[p.id,p]));
 const excluded=new Set(v92.exclude_inside_v73_trail_indexes.map(i=>'v73:trail:'+i));
 assert.equal(active.size,700);
 const seenNodes=new Set();
 const contacts=[];
 for(const item of v90.cases){
  assert(Number.isInteger(item.number)&&item.number>0);
  assert(groups.includes(item.classification));
  assert(Number.isSafeInteger(item.pbf_shared_node_id));
  assert(approxValid(item.shared_source_vertex_lonlat));
  assert(item.offset_from_v89_display_crossing_m>=0&&item.offset_from_v89_display_crossing_m<0.75);
  assert.equal(item.confidence,'exact_shared_OSM_node_for_nearby_way_pair');
  assert.equal(item.allow_auto_link,false);
  assert.equal(item.allow_routing,false);
  assert.equal(item.confirmed_public_hiking_route,false);
  assert.equal(item.display_line_ids.length,2);
  assert.equal(item.pbf_osm_way_ids.length,2);
  assert.equal(item.pbf_highway_tags.length,2);
  const nodeID=idString(item.pbf_shared_node_id);
  assert(!seenNodes.has(nodeID),'Distinct source contacts must have distinct PBF node IDs');
  seenNodes.add(nodeID);
  const actualWayIds=item.display_line_ids.map((lineID)=>{
   assert(!excluded.has(lineID),'Excluded access-no/sidewalk paths cannot be POI anchors');
   const line=active.get(lineID);
   assert(line,'v94 contact references a line not displayed in v92');
   if(lineID.startsWith('v73:')){
    const parts=lineID.split(':');
    const offset=parts[1]==='trail'?0:480;
    assert(parts[1]==='trail'||parts[1]==='track');
    const mapped=v91.display_line_to_osm_way_id[offset+Number(parts[2])];
    assert(Number.isSafeInteger(mapped)&&mapped>0);
    return idString(mapped);
   }
   assert(line.osm_way_id,'Exterior contact must preserve original OSM way ID');
   return idString(line.osm_way_id);
  });
  assert.deepEqual(sortedIds(actualWayIds),sortedIds(item.pbf_osm_way_ids),
   'Contact-to-way mapping must match the exact source pair');
  const flags=item.pbf_highway_tags;
  assert(flags.every(t=>['path','track','footway','pedestrian'].includes(t)));
  const category=flags.every(t=>t==='path')?'path_path':
   flags.every(t=>t==='track')?'track_track':'pedestrian_or_footway';
  assert.equal(category,item.classification);
  const [lon,lat]=item.shared_source_vertex_lonlat;
  contacts.push({
   anchor_id:'pbf-node:'+nodeID,
   original_osm_node_id:nodeID,
   original_osm_node_url:'https://www.openstreetmap.org/node/'+nodeID,
   original_wgs84_lonlat:[lon,lat],
   original_way_ids:sortedIds(item.pbf_osm_way_ids),
   display_line_ids:item.display_line_ids.slice(),
   original_highway_tags:flags.slice(),
   contact_type:item.classification,
   original_way_node_identity:'confirmed_shared_source_node',
   original_2026_11_05_pbf_source_verified:true,
   name:null,
   named_poi_kind:null,
   official_trail_junction_verified:false,
   official_access_verified:false,
   render_as_named_poi:false,
   enable_routing:false,
   connecting_new_geometry:false
  });
 }
 contacts.sort((a,b)=>Number(a.original_osm_node_id)-Number(b.original_osm_node_id));
 const counts=Object.fromEntries(groups.map(k=>[k,contacts.filter(x=>x.contact_type===k).length]));
 assert.deepEqual(counts,{path_path:18,track_track:2,pedestrian_or_footway:6});
 return {
  schema_version:94,
  source_osm_snapshot:'2026-11-05 Geofabrik South Korea OSM PBF',
  source_pbf_sha256:v90.source_pbf_sha256,
  evidence_from:'audits/seorak-v90-original-node-review.json',
  source_way_mapping:'audits/seorak-v91-display-way-index.json',
  visible_path_filter:'audits/seorak-v92-inside-footway-review.json',
  note:'Exact original shared OSM nodes are verified only as topological source contacts. They do not verify named trail junctions, summits, huts, bridges, official trails, or legal access. Do NOT render these as park POIs or add routing edges.',
  map_line_count_unchanged:700,
  map_version_unchanged:92,
  source_contacts:26,
  named_summits_verified:0,
  named_shelters_verified:0,
  named_junctions_verified:0,
  geometry_added:0,
  routing_allowed:false,
  counts,
  contacts
 };
}

// Never snap by distance. A named POI needs an independently sourced exact OSM node ID.
// Even an exact hit stays pending official/name/access checks and is not drawn or routable.
export function matchNamedPOICandidates(pois,anchorAudit){
 assert(Array.isArray(pois));
 const anchors=new Map(anchorAudit.contacts.map(x=>[x.original_osm_node_id,x]));
 const allowed=['summit','junction','shelter','water_source'];
 return pois.map(p=>{
  const node=idString(p?.original_osm_node_id??'');
  const valid=typeof p?.name==='string'&&p.name.trim().length>0&&
   allowed.includes(p?.kind)&&/^\d+$/.test(node)&&
   typeof p?.source==='string'&&p.source.trim().length>0;
  const found=valid?anchors.get(node):null;
  return {
   candidate_name:valid?p.name.trim():null,
   candidate_kind:valid?p.kind:null,
   candidate_osm_node_id:node,
   status:!valid?'invalid_evidence_fields':found?'exact_source_node_candidate_needs_official_review':'no_exact_source_node_match',
   source_node_match:Boolean(found),
   official_poi_verified:false,
   permitted_hiking_route_verified:false,
   render_on_map:false,
   routing_allowed:false
  };
 });
}
export function toGeoJSON(audit){
 return {
  type:'FeatureCollection',
  name:'seorak-v94-source-contact-anchors-audit-only',
  routing_allowed:false,
  not_for_navigation:true,
  features:audit.contacts.map(item=>({
   type:'Feature',
   geometry:{type:'Point',coordinates:item.original_wgs84_lonlat},
   properties:{
    anchor_id:item.anchor_id,osm_node_id:item.original_osm_node_id,
    contact_type:item.contact_type,original_way_ids:item.original_way_ids,
    display_line_ids:item.display_line_ids,official_junction_verified:false,
    named_poi:false,routing_allowed:false,display_on_map:false
   }
  }))
 };
}
function cli(){
 const i=process.argv.indexOf('--output-dir');
 if(i<0||!process.argv[i+1]){
  console.error('Usage: node tools/seorak-poi-anchors-v94.mjs --output-dir site');
  process.exitCode=2;return;
 }
 const out=resolve(process.argv[i+1]);mkdirSync(out,{recursive:true});
 const audit=buildPOIAnchors();
 writeFileSync(resolve(out,'seorak-v94-source-contact-anchors.json'),JSON.stringify(audit,null,2)+'\n');
 writeFileSync(resolve(out,'seorak-v94-source-contact-anchors.geojson'),JSON.stringify(toGeoJSON(audit),null,2)+'\n');
 console.log('SANBAK_V94='+JSON.stringify({contacts:audit.source_contacts,counts:audit.counts,named_pois:audit.named_junctions_verified,routing_allowed:audit.routing_allowed}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli();
