// v93: data QA only. Never silently turn uncertain OSM footways into routes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildReviewQueue,asCSV} from '../tools/seorak-review-queue-v93.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const input=JSON.parse(read('audits/seorak-v92-inside-footway-review.json'));
const q=buildReviewQueue(input);
assert.equal(q.schema_version,93);
assert.deepEqual(q.summary,{reviewed:75,unchanged_exclusions:3,retained_with_prior_evidence:25,
 needs_review:47,groups:{pedestrian:1,bridge:12,long_no_gpx:6,long_with_gpx:10,short:18}});
assert.equal(q.map_visible_lines_unchanged,700);
assert.equal(q.new_route_links,0);
assert.equal(q.routes_removed,0);
assert.equal(q.routing_allowed,false);
assert.equal(q.pending.length,47);
const set=new Set(q.pending.map(p=>p.inside_trail_index));
assert.equal(set.size,47);
assert(![89,436,437].some(x=>set.has(x)));
for(const p of q.pending){
 assert.equal(p.display_line_id,'v73:trail:'+p.inside_trail_index);
 assert.equal(p.osm_way_url,'https://www.openstreetmap.org/way/'+p.osm_way_id);
 assert.equal(p.pending_review,true);
 assert.equal(p.routing_allowed,false);
 assert.equal(p.official_trail_match,'not_checked');
 assert.equal(p.current_access_permission,'not_checked');
 const source=input.rows.find(x=>x[0]===p.inside_trail_index);
 assert(source);
 assert.equal(source[1],p.osm_way_id);
 assert(!/[xs]/.test(source[6]));
 assert(!source[6].includes('h'));
 assert(!(source[2]>=80 && source[4]>=0.7));
}
const ids=new Set(q.pending.map(p=>p.osm_way_id));
assert(ids.has(1533443355),'Unverified pedestrian must remain reviewable');
assert(!ids.has(711262954),'Previously evidenced approach remains retained, not reclassified');
const csv=asCSV(q).trimEnd().split('\n');
assert.equal(csv.length,48);
assert(csv[0].includes('review_question'));
assert(csv.some(l=>l.includes('1533443355')));
const html=read('national-parks-trails.html');
assert(html.includes('excludedSeorakInsideTrailIndices=new Set([89,436,437])'));
assert(html.includes('산박지도 v96 · 주요지점 순서 계획'));
assert(html.includes('excludedSeorakInsideTrailIndices=new Set([89,436,437])'));
assert(html.includes('<script src="./seorak-v96-plan.js"></script>'));

assert(read('.github/workflows/deploy-pages.yml').includes('seorak-review-queue-v93.mjs --output-dir site'));
assert(read('README.md').includes('v93 검토 목록'));
assert.equal(read('audits/seorak-v93-pending-footways.json'),JSON.stringify(q,null,2)+'\n');
assert.equal(read('audits/seorak-v93-pending-footways.csv'),'\uFEFF'+asCSV(q));
console.log('PASS v93: 47 review rows exported; source unchanged; no new routing or UI overlays');
