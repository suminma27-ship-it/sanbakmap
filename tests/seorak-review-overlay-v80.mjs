// v80 review overlay: the five held footways are visual-only, data-identical to reviewed OSM source.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const load=name=>readFileSync(new URL(name,root),'utf8');
const page=load('national-parks-trails.html');
const src=JSON.parse(load('audits/seorak-v80-five-footways.geojson'));
const embedded=page.match(/<script id="seorak-v80-review" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
assert(embedded,'five held footway line geometries must be embedded for review');
const review=JSON.parse(embedded);
assert.deepEqual(review,src,'displayed review lines must exactly match audited source');
assert.equal(review.features.length,5);
assert.equal(review.route_allowed,false);
assert.equal(review.display_in_map,false,'these are held audit lines, not promoted route lines');
assert(review.features.every(f=>f.properties.routing_allowed===false&&f.properties.field_verified===false));
const ids=review.features.map(f=>f.properties.osm_id);
assert.deepEqual(ids,['485958084','485958093','485958097','485958100','485958102']);
for(const token of ['id="reviewToolbar"','id="reviewToggle"','id="reviewSpot"','id="reviewStatus"',
  'reviewVisible=!!reviewData','new URLSearchParams(location.search)',"get('review')==='5'",
  'function drawReviewPaths','function renderReviewMarkers','function focusReview','function reviewUi',
  "data-review-id","'pointer-events':'none'","reviewVisible=!reviewVisible",
  'if(reviewVisible&&', "stroke:'#b24791'"]) {
 assert(page.includes(token),'review overlay UI missing: '+token);
}
const blocks=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(blocks.length,2);
for(const block of blocks)new Function(block[1]);
assert(!page.includes('seorak-v80-extra.js'),'review-only way should never join official map layer');
assert(!page.includes('window.SanbakNationalRoutes.shortest'),'review-only way cannot affect routing');
const existing=load('tests/seorak-footway-review-v80.mjs');
assert(existing.includes("assert.equal(review.route_allowed,false)"));
console.log('PASS five held OSM way overlays: exact source geom, toggle and focus, no routing');
