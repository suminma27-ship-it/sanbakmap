// v81: rollback the v80 facility-walk review overlay without deleting audited OSM source data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const page=read('national-parks-trails.html');
const review=JSON.parse(read('audits/seorak-v80-five-footways.geojson'));
const scope=JSON.parse(read('audits/seorak-v81-map-scope.json'));
assert.equal(review.features.length,5);
assert.equal(review.display_in_map,false);
assert.equal(review.route_allowed,false);
assert.equal(scope.version,81);
assert.deepEqual(scope.excluded_v80_audit_only_footway_ids,
  review.features.map(f=>Number(f.properties.osm_id)));
for(const forbidden of [
 'id="reviewToolbar"','id="reviewToggle"','id="reviewSpot"','id="reviewStatus"',
 'seorak-v80-review','reviewMarkerLayer','drawReviewPaths','renderReviewMarkers',
 'reviewVisible','reviewUi','focusReview','미검증 후보 5곳 보기'
]){
 assert(!page.includes(forbidden),'Facility review overlay should be absent: '+forbidden);
}
assert(!page.includes('seorak-v80-extra.js'));
assert(!page.includes('window.SanbakNationalRoutes.shortest'));
const js=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(js.length,2);
for(const m of js)new Function(m[1]);
console.log('PASS v81: former five facility walk overlays absent; source audits retained; no added routing');
