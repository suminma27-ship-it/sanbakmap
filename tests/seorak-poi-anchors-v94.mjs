// v94: identity-based POI anchor audit. Never infer junction names or connect map geometry.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPOIAnchors,matchNamedPOICandidates,toGeoJSON} from '../tools/seorak-poi-anchors-v94.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const audit=buildPOIAnchors();
const source=JSON.parse(read('audits/seorak-v90-original-node-review.json'));
const visible=JSON.parse(read('audits/seorak-v92-inside-footway-review.json'));
assert.equal(audit.schema_version,94);
assert.equal(audit.source_contacts,26);
assert.deepEqual(audit.counts,{path_path:18,track_track:2,pedestrian_or_footway:6});
assert.equal(audit.map_line_count_unchanged,700);
assert.equal(audit.map_version_unchanged,92);
assert.equal(audit.named_summits_verified,0);
assert.equal(audit.named_junctions_verified,0);
assert.equal(audit.named_shelters_verified,0);
assert.equal(audit.geometry_added,0);
assert.equal(audit.routing_allowed,false);
assert.equal(audit.contacts.length,26);
const ids=new Set(audit.contacts.map(x=>x.original_osm_node_id));
assert.equal(ids.size,26);
const excluded=new Set(visible.exclude_inside_v73_trail_indexes.map(i=>'v73:trail:'+i));
for(const c of audit.contacts){
 const sourceCase=source.cases.find(x=>String(x.pbf_shared_node_id)===c.original_osm_node_id);
 assert(sourceCase,'Each anchor needs existing exact PBF evidence');
 assert.deepEqual(c.original_wgs84_lonlat,sourceCase.shared_source_vertex_lonlat);
 assert.equal(c.original_osm_node_url,'https://www.openstreetmap.org/node/'+c.original_osm_node_id);
 assert.deepEqual(c.original_way_ids,sourceCase.pbf_osm_way_ids.map(String).sort());
 assert(c.display_line_ids.every(id=>!excluded.has(id)));
 assert.equal(c.name,null);
 assert.equal(c.named_poi_kind,null);
 assert.equal(c.original_2026_11_05_pbf_source_verified,true);
 assert.equal(c.official_trail_junction_verified,false);
 assert.equal(c.official_access_verified,false);
 assert.equal(c.render_as_named_poi,false);
 assert.equal(c.enable_routing,false);
 assert.equal(c.connecting_new_geometry,false);
}
assert(audit.contacts.some(x=>x.contact_type==='pedestrian_or_footway'));
const pbf=String(source.cases[0].pbf_shared_node_id);
const matches=matchNamedPOICandidates([
 {original_osm_node_id:pbf,name:'가상 테스트 지점',kind:'junction',source:'synthetic-test-only'},
 {original_osm_node_id:'999999999999',name:'가상 테스트 지점',kind:'junction',source:'synthetic-test-only'},
 {original_osm_node_id:pbf,name:'',kind:'junction',source:'synthetic-test-only'}
],audit);
assert.deepEqual(matches.map(x=>x.status),[
 'exact_source_node_candidate_needs_official_review','no_exact_source_node_match','invalid_evidence_fields'
]);
assert(matches.every(x=>x.official_poi_verified===false&&x.render_on_map===false&&x.routing_allowed===false));
const geo=toGeoJSON(audit);
assert.equal(geo.type,'FeatureCollection');
assert.equal(geo.features.length,26);
assert(geo.features.every(x=>x.type==='Feature'&&x.geometry.type==='Point'&&x.properties.display_on_map===false));
assert.equal(read('audits/seorak-v94-source-contact-anchors.json'),JSON.stringify(audit,null,2)+'\n');
assert.equal(read('audits/seorak-v94-source-contact-anchors.geojson'),JSON.stringify(geo,null,2)+'\n');
const html=read('national-parks-trails.html');
assert(html.includes('등산로 v92 / 주요지점 계획 v96'));
assert(html.includes('excludedSeorakInsideTrailIndices=new Set([89,436,437])'));
assert(!html.includes('seorak-v94-source-contact-anchors.geojson'));
assert(read('.github/workflows/deploy-pages.yml').includes('node tools/seorak-poi-anchors-v94.mjs --output-dir site'));
assert(read('README.md').includes('v94 원본 노드 접점'));
console.log('PASS v94: 26 exact PBF source-node contacts; zero named POIs/route edges; no map changes');
