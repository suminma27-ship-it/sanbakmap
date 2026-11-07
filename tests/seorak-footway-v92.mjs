// v92: retain actual OSM hiking footways, exclude explicit sidewalk/access=no only.
// Archived 2022 GPX proximity is screening, not a government-approved route.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {v92VisibleLines,generateV92Graph} from '../tools/seorak-topology-v92.mjs';

const root=new URL('../',import.meta.url),read=name=>readFileSync(new URL(name,root),'utf8');
const html=read('national-parks-trails.html');
const review=JSON.parse(read('audits/seorak-v92-inside-footway-review.json'));
const v91=JSON.parse(read('audits/seorak-v91-display-way-index.json'));
const v89=JSON.parse(read('audits/seorak-v89-topology-audit.json'));
assert.equal(review.version,92);
assert.equal(review.reviewed_way_fragments,75);
assert.equal(review.original_distinct_way_ids,73);
assert.deepEqual(review.original_tags,{footway:73,pedestrian:2});
assert.equal(review.osm_tag_counts.sac_scale_hiking,19);
assert.equal(review.osm_tag_counts.bridge_yes,17);
assert.equal(review.osm_tag_counts.access_no,1);
assert.equal(review.osm_tag_counts.footway_sidewalk,2);
assert.equal(review.gpx_screening.archive_gpx_files,6748);
assert.equal(review.gpx_screening.archive_gpx_files_with_points_in_region,58);
assert.equal(review.gpx_screening.display_fragments_with_any_2022_gpx_sample_within_30m,55);
assert.equal(review.gpx_screening.best_single_gpx_coverage_over_70pct,38);
assert.deepEqual(review.classification_summary,{
 exclude_from_hiking_map:3,retained_with_OSM_hiking_tag_or_material_GPX_screening:25,
 retained_pending_more_verification:47,retained_total:72
});
assert.equal(review.display_length_m_excluded,293.1);
assert.equal(review.display_length_m_before_footway_group,9746.2);
assert.equal(review.map_lines_before,703);
assert.equal(review.map_lines_after,700);
assert.deepEqual(review.exclude_inside_v73_trail_indexes,[89,436,437]);
assert.deepEqual(review.exclude_osm_way_ids,[351060038,1554715873,1554715874]);
assert.equal(review.rows.length,75);
assert.equal(new Set(review.rows.map(r=>r[0])).size,75);
const oldWayIds=v91.display_line_to_osm_way_id;
assert.equal(oldWayIds.length,499);
let flags={f:0,p:0,h:0,b:0,x:0,s:0};
const indices=new Set();
for(const row of review.rows){
 const [trailIndex,wayId,length,tag,coverage,archives,tags]=row;
 assert(Number.isInteger(trailIndex)&&trailIndex<480&&!indices.has(trailIndex));
 assert.equal(oldWayIds[trailIndex],wayId);
 indices.add(trailIndex);
 assert(length>0);
 assert(['f','p'].includes(tag));
 assert(coverage>=0&&coverage<=1);
 assert(Number.isInteger(archives)&&archives>=0);
 flags[tag]++;
 for(const x of ['h','b','x','s'])if(tags.includes(x))flags[x]++;
}
assert.deepEqual(flags,{f:73,p:2,h:19,b:17,x:1,s:2});
const removed=review.rows.filter(r=>r[6].includes('s')||r[6].includes('x'));
assert.deepEqual(removed.map(r=>r[0]),review.exclude_inside_v73_trail_indexes);
assert.deepEqual(removed.map(r=>r[1]),review.exclude_osm_way_ids);
assert.equal(+removed.reduce((n,r)=>n+r[2],0).toFixed(1),293.1);
assert(review.rows.some(r=>r[1]===711262954&&r[3]==='p'),
 'GPX-recorded Seoraksan-ro approach must NOT be silently excluded');
assert(review.rows.some(r=>r[1]===1533443355&&r[3]==='p'),
 'unverified second pedestrian way must remain pending');
const existing=html.match(/window\.SANBAK_NP_OSM_B64="([^"]+)"/)?.[1];
assert(existing,'original v73 compressed geometry must remain');
assert.equal(createHash('sha256').update(existing).digest('hex'),v91.v73_embedded_source_sha256);
const base=JSON.parse(gunzipSync(Buffer.from(existing,'base64')));
assert.equal(base.parks.seorak.line_count,499,'original historical OSM source must remain intact');
assert.equal(base.parks.jiri.line_count,824);
assert.equal(base.parks.bukhan.line_count,1173);
assert(html.includes('excludedSeorakInsideTrailIndices=new Set([89,436,437])'));
assert(html.includes('record.segments.trail.filter((_,i)=>!excludedSeorakInsideTrailIndices.has(i))'));
assert(html.includes('insideDisplayedCount+extra.length'));
assert(html.includes('산박지도 v97 · 산길 표시 간소화'));
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
assert(!html.includes('seorak-v92-park-candidate-overlay.js'));
assert(html.includes("v77.a.filter(r=>!excludedFacilityPathIds.has(r.i))"));
assert(html.includes("v78.paths.filter(r=>r.h==='track')"));
assert.equal(html.split('#6A8567').length-1,3);
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);for(const x of scripts)new Function(x[1]);
const active=v92VisibleLines();
assert.equal(active.length,700);
assert(active.every(l=>!removed.some(r=>l.id==='v73:trail:'+r[0])));
assert.equal(active.filter(l=>l.kind==='trail').length,606);
assert.equal(active.filter(l=>l.kind==='track').length,94);
const graph=generateV92Graph();
assert.equal(graph.stats.displayed_source_lines,700);
assert.equal(graph.stats.connected_components,67);
assert.equal(graph.stats.synthetic_joins_created,0);
assert.equal(graph.stats.routing_allowed,false);
assert.equal(graph.stats.source_stage_breakdown.inside_v73.lines,496);
assert.equal(graph.stats.source_stage_breakdown.exterior_v83.lines,4);
assert.equal(v89.map_display_lines,703,'v89 historical baseline must remain immutable');
assert(read('README.md').includes('**현재 버전: v92**'));
assert(read('.github/workflows/deploy-pages.yml').includes('tools/seorak-topology-v92.mjs --output-dir site'));
console.log('PASS v92: 75 assessed; 2 OSM sidewalks + 1 access=no way excluded (293.1m); 700 displayed, 67 components, no inferred routes');
