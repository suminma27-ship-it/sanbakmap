#!/usr/bin/env node
// v93: reproducible manual-review queue for v92 retained but unverified OSM footways.
// This is a NON-ROUTABLE data-quality artifact; no path is approved, removed, or added.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const sourceURL=new URL('../audits/seorak-v92-inside-footway-review.json', import.meta.url);
const questions={
 pedestrian:'Check against authoritative park-trail map: is this facility access, authorized park approach, or a hiking trail?',
 bridge:'Confirm whether this short bridge is part of a connected legal mountain route; do not delete based on length or one GPX crossing.',
 long_no_gpx:'Cross-reference official trail geometry and newer GPS traces; 2022 archive had no nearby samples.',
 long_with_gpx:'Inspect lengthwise continuity against official trail geometry and recent GPS; historical partial coverage is insufficient.',
 short:'Determine whether this is a true mountain-route connector or a building/park walkway, using authoritative imagery and access rules.'
};
const rank=Object.keys(questions);
const csvEscape=x=>'"'+String(x??'').replaceAll('"','""')+'"';

export function buildReviewQueue(review=JSON.parse(readFileSync(sourceURL,'utf8'))){
 assert.equal(review.version,92);
 assert.equal(review.rows.length,75);
 const excluded=[],evidence=[],pending=[];
 const ids=new Set();
 for(const row of review.rows){
  const [index,way,length,highway,coverage,nearby,tags]=row;
  assert(Number.isInteger(index)&&!ids.has(index));ids.add(index);
  assert(Number.isInteger(way)&&way>0 && Number.isFinite(length)&&length>0);
  assert(['f','p'].includes(highway)&&coverage>=0&&coverage<=1);
  const removed=tags.includes('x')||tags.includes('s');
  // Match the source's intentionally conservative 25/47 split exactly.
  const supporting=!removed&&(tags.includes('h')||(length>=80&&coverage>=0.7));
  if(removed){excluded.push(index);continue;}
  if(supporting){evidence.push(index);continue;}
  const group=highway==='p'?'pedestrian':
   tags.includes('b')?'bridge':
   length>=80?(nearby>0?'long_with_gpx':'long_no_gpx'):'short';
  pending.push({
   display_line_id:'v73:trail:'+index,
   inside_trail_index:index,
   osm_way_id:way,
   osm_way_url:'https://www.openstreetmap.org/way/'+way,
   highway:highway==='p'?'pedestrian':'footway',
   display_length_m:length,
   osm_flags:{bridge:tags.includes('b'),hiking_scale:tags.includes('h')},
   historical_gpx_2022:{max_single_archive_approx_coverage:coverage,nearby_archive_count:nearby,buffer_m:30},
   review_group:group,
   review_question:questions[group],
   official_trail_match:'not_checked',
   current_access_permission:'not_checked',
   pending_review:true,
   routing_allowed:false
  });
 }
 assert.deepEqual(excluded,[89,436,437]);
 assert.equal(evidence.length,25);
 assert.equal(pending.length,47);
 pending.sort((a,b)=>rank.indexOf(a.review_group)-rank.indexOf(b.review_group)||
  b.display_length_m-a.display_length_m||a.inside_trail_index-b.inside_trail_index);
 const groups=Object.fromEntries(rank.map(k=>[k,pending.filter(x=>x.review_group===k).length]));
 return {
  schema_version:93,
  source_v92_review:'audits/seorak-v92-inside-footway-review.json',
  osm_snapshot_date:review.osm_snapshot_date,
  source_pbf_sha256:review.source_osm_pbf_sha256,
  source_gpx:'Historical 2022 archive only; not current verification',
  note:'Review queue only. OSM source ways and dated GPX proximity do NOT establish current access rights, official KNPS routes, or route connectivity. Preserve all 47 displayed paths until separate evidence-based review.',
  map_visible_lines_unchanged:700,
  new_route_links:0,
  routes_removed:0,
  routing_allowed:false,
  summary:{reviewed:75,unchanged_exclusions:3,retained_with_prior_evidence:25,needs_review:47,groups},
  pending
 };
}
export function asCSV(queue){
 const fields=['display_line_id','osm_way_id','osm_way_url','review_group','highway','display_length_m','bridge','historical_gpx_coverage','historical_gpx_archive_count','official_trail_match','current_access_permission','review_question'];
 const lines=[fields.map(csvEscape).join(',')];
 for(const p of queue.pending){
  const row=[p.display_line_id,p.osm_way_id,p.osm_way_url,p.review_group,p.highway,p.display_length_m,
   p.osm_flags.bridge,p.historical_gpx_2022.max_single_archive_approx_coverage,
   p.historical_gpx_2022.nearby_archive_count,p.official_trail_match,p.current_access_permission,p.review_question];
  lines.push(row.map(csvEscape).join(','));
 }
 return lines.join('\n')+'\n';
}
function cli(){
 const i=process.argv.indexOf('--output-dir');
 if(i<0||!process.argv[i+1]){console.error('Usage: node tools/seorak-review-queue-v93.mjs --output-dir site');process.exitCode=2;return;}
 const dir=resolve(process.argv[i+1]);mkdirSync(dir,{recursive:true});
 const report=buildReviewQueue();
 writeFileSync(resolve(dir,'seorak-v93-pending-footways.json'),JSON.stringify(report,null,2)+'\n');
 writeFileSync(resolve(dir,'seorak-v93-pending-footways.csv'),'\uFEFF'+asCSV(report));
 console.log('SANBAK_V93_PENDING='+JSON.stringify(report.summary));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli();
