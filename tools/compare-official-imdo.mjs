#!/usr/bin/env node
// v87: offline geometry comparison for a legitimately obtained KFS Imdo SHP
// exported to WGS84 GeoJSON. No downloader, no invented government matches.
// Usage: node tools/compare-official-imdo.mjs --geojson /path/to/imdo-wgs84.geojson [--output /path/to/results.json]
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const EARTH=6371000, RAD=Math.PI/180;
const HELD_IDS=[658252273,1496520172];
const key=point=>point.join(',');
function isPoint(p){
 return Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])
   &&p[0]>124&&p[0]<132&&p[1]>33&&p[1]<39.9;
}
function euclid(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function toMetres(p,origin){
 return [(p[0]-origin[0])*RAD*EARTH*Math.cos(origin[1]*RAD),
         (p[1]-origin[1])*RAD*EARTH];
}
function distanceToSegment(point,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],len2=dx*dx+dy*dy;
 const t=len2?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/len2)):0;
 return euclid(point,[a[0]+dx*t,a[1]+dy*t]);
}
export function normalizeOfficialGeoJSON(data){
 if(!data||data.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length)
   throw Error('Official input must be a nonempty GeoJSON FeatureCollection');
 if(data.crs&&JSON.stringify(data.crs)!=='{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}}'
   && !/4326|CRS84/i.test(JSON.stringify(data.crs)))
   throw Error('Official data has a non-WGS84 CRS; convert it with ogr2ogr -t_srs EPSG:4326 first');
 const lines=[];
 for(let i=0;i<data.features.length;i++){
  const f=data.features[i];if(!f||f.type!=='Feature')throw Error('Non-Feature in official input');
  const g=f.geometry;if(!g)continue;
  if(!['LineString','MultiLineString'].includes(g.type))
   throw Error('Official Imdo input includes '+g.type+'; only centerline LineString/MultiLineString can be compared. Do not infer lines from Polygon boundaries.');
  const parts=g.type==='LineString'?[g.coordinates]:g.coordinates;
  for(const part of parts){
   if(!Array.isArray(part)||part.length<2||!part.every(isPoint))
    throw Error('Official geometry is not WGS84 (lon,lat) in South Korea or has missing vertices; verify the input .prj and reprojection');
   const xs=part.map(p=>p[0]),ys=part.map(p=>p[1]);
   lines.push({
    row:i,part:part.map(p=>[p[0],p[1]]),
    bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],
    properties:f.properties||{}
   });
  }
 }
 if(!lines.length)throw Error('No usable official Imdo centerlines in supplied GeoJSON');
 return lines;
}
function sampleTarget(points,intervalM=7){
 const origin=points[Math.floor(points.length/2)],xy=points.map(p=>toMetres(p,origin));
 const samples=[],cumulative=[0];
 for(let i=1;i<xy.length;i++)cumulative.push(cumulative.at(-1)+euclid(xy[i-1],xy[i]));
 const len=cumulative.at(-1);
 if(!Number.isFinite(len)||len<1)throw Error('OSM line too short');
 const count=Math.max(1,Math.ceil(len/intervalM));
 for(let j=0;j<=count;j++){
  const pos=len*j/count;
  let index=1;while(index<cumulative.length-1&&cumulative[index]<pos)index++;
  const start=cumulative[index-1],end=cumulative[index],t=end>start?(pos-start)/(end-start):0;
  const a=xy[index-1],b=xy[index];
  samples.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
 }
 return {origin,samples,length_m:len};
}
export function compareOneRoad(osmCoords,officialLines,{distanceThresholdM=15,sourceName=null}={}){
 if(!Array.isArray(osmCoords)||osmCoords.length<2||!osmCoords.every(isPoint))
   throw Error('OSM way vertices must be valid WGS84 lon/lat');
 const sampled=sampleTarget(osmCoords);
 const xs=osmCoords.map(p=>p[0]),ys=osmCoords.map(p=>p[1]);
 const bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
 const margin=0.0015;
 const nearby=officialLines.filter(row=>row.bounds[2]>=bounds[0]-margin
   &&row.bounds[0]<=bounds[2]+margin &&row.bounds[3]>=bounds[1]-margin
   &&row.bounds[1]<=bounds[3]+margin);
 const segments=[];
 for(const row of nearby){
  const pts=row.part.map(p=>toMetres(p,sampled.origin));
  for(let k=1;k<pts.length;k++)segments.push({a:pts[k-1],b:pts[k],row:row.row,
    label:row.properties.FRRD_NM||row.properties.frrd_nm||row.properties.name||null});
 }
 const nearest=sampled.samples.map(point=>{
  let dist=Infinity,row=null,label=null;
  for(const segment of segments){
   const d=distanceToSegment(point,segment.a,segment.b);
   if(d<dist){dist=d;row=segment.row;label=segment.label;}
  }
  return {dist,row,label};
 });
 const hit=nearest.map(n=>n.dist<=distanceThresholdM);
 const nearCount=hit.filter(Boolean).length;
 let longest=0,current=0;
 for(const v of hit){current=v?current+1:0;longest=Math.max(longest,current);}
 const coverage=nearCount/hit.length,run=longest/hit.length;
 const byRow=new Map();
 for(let i=0;i<nearest.length;i++)if(hit[i]){
  const row=nearest[i].row;byRow.set(row,(byRow.get(row)||0)+1);
 }
 const best=[...byRow.entries()].sort((a,b)=>b[1]-a[1])[0];
 const feature=nearby.find(x=>x.row===best?.[0]);
 const shortSegment=sampled.length_m<30;
 // A geometric match is never an access or permit confirmation.
 let conclusion='no_coordinate_alignment';
 if(shortSegment)conclusion='short_segment_requires_independent_review';
 else if(nearCount>=3&&coverage>=0.70&&run>=0.40)conclusion='possible_official_geometry_alignment_only';
 else if(nearCount>=3)conclusion='partial_proximity_only';
 return {
  input_osm_length_m:+sampled.length_m.toFixed(1),
  nearby_official_feature_count:nearby.length,
  nearest_official_m:Number.isFinite(Math.min(...nearest.map(x=>x.dist)))
    ?+Math.min(...nearest.map(x=>x.dist)).toFixed(1):null,
  sampled_points:sampled.samples.length,near_15m_points:nearCount,
  fraction_within_15m:+coverage.toFixed(3),longest_consecutive_fraction:+run.toFixed(3),
  nearest_feature_id:best?.[0]??null,
  nearest_feature_name:feature?.properties.FRRD_NM||feature?.properties.frrd_nm||feature?.properties.name||null,
  geometry_conclusion:conclusion,
  legal_access_verified:false,official_current_status_verified:false,route_allowed:false,
  caution:'OSM/official geometry proximity does not prove public access, current open status, or a routable connection.'
 };
}
export function compareOfficial(originalAudit,officialGeoJSON){
 const official=normalizeOfficialGeoJSON(officialGeoJSON);
 if(!originalAudit?.source_geometry_fixtures)throw Error('Source OSM way geometry audit missing');
 const comparisons=HELD_IDS.map(id=>{
  const points=originalAudit.source_geometry_fixtures[String(id)];
  if(!points?.length)throw Error('Original held OSM geometry missing for '+id);
  return {osm_way_id:id,...compareOneRoad(points,official)};
 });
 return {
  version:87,official_shp_actually_supplied:true,
  source_reference:'Korea Forest Service Imdo SHP converted to WGS84 GeoJSON',
  input_geometry_features:officialGeoJSON.features.length,
  evaluated_osm_way_ids:HELD_IDS,comparisons,
  geometry_comparison_only:true,
  confirmed_public_access:0,automatically_promoted_to_map:0,
  original_source_data_changed:false,
  note:'Check file provenance, survey vintage, official layer attribution/rights and current restrictions separately.'
 };
}
function execute(){
 const argv=process.argv.slice(2),arg=flag=>{
  const idx=argv.indexOf(flag);return idx<0?null:argv[idx+1];
 };
 const geojsonPath=arg('--geojson'),output=arg('--output');
 if(!geojsonPath||!output){
  process.stderr.write('Usage: node tools/compare-official-imdo.mjs --geojson imdo-wgs84.geojson --output imdo-review.json\n'
    +'Use an authorized SHP acquisition and preserve its .prj when converting with ogr2ogr -f GeoJSON -t_srs EPSG:4326.\n');
  process.exitCode=2;return;
 }
 const official=JSON.parse(readFileSync(resolve(geojsonPath),'utf8'));
 const previous=JSON.parse(readFileSync(new URL('../audits/seorak-v85-track-connections.json',import.meta.url),'utf8'));
 const result=compareOfficial(previous,official);
 writeFileSync(resolve(output),JSON.stringify(result,null,2)+'\n','utf8');
 process.stdout.write('Reviewed '+result.comparisons.length+' held OSM ways. Official coordinate geometry supplied; no automatic promotion or access claims. Output '+output+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))execute();
