// v98: uploaded historical KNPS SHP displayed apart from 700 OSM ways.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('data/knps-seorak-2018.geojson'));
assert.equal(data.type,'FeatureCollection');
assert.equal(data.features.length,24);
assert.equal(data.metadata.feature_count,24);
assert.equal(data.metadata.trail_features,19);
assert.equal(data.metadata.routing_allowed,false);
assert.equal(data.metadata.osm_matching_verified,false);
assert.equal(data.metadata.access_verified,false);
assert.equal(data.metadata.source_file_date,'2018-12-31');
assert.equal(data.metadata.source_zip_sha256,'a4a378233fe491b35bcdc157420d58ca7f9e9f57e1c6af4399dbafcad6ba9baf');
const tally={};const ids=new Set(),rows=new Set();
for(const f of data.features){
 assert.equal(f.type,'Feature');
 const props=f.properties;
 tally[props.facility_type]=(tally[props.facility_type]||0)+1;
 assert(props.original_facility_id.startsWith('05UMC'));
 assert.equal(props.source_archive_sha256,data.metadata.source_zip_sha256);
 assert.equal(props.routing_allowed,false);
 assert.equal(props.current_access_verified,false);
 assert.equal(props.matched_to_osm_verified,false);
 assert.equal(props.source_geometry_preserved,true);
 assert(!rows.has(props.original_row_index));
 rows.add(props.original_row_index);
 ids.add(props.original_facility_id);
 assert(['LineString','MultiLineString'].includes(f.geometry?.type));
 const groups=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
 for(const line of groups){
  assert(line.length>=2);
  for(const p of line){
   assert(p.length>=2&&p[0]>128.1&&p[0]<128.8&&p[1]>37.9&&p[1]<38.4);
  }
 }
}
assert.deepEqual(tally,{탐방로:19,삭도:1,진입도로:3,궤도:1});
assert(ids.size<24,'Duplicate historic IDs must be preserved as separate rows');
const html=read('national-parks-trails.html');
assert(html.includes('<span>산박지도 v98 · 공단 등록 탐방로</span>'));
assert(html.includes('<option value="knps" selected>공단 탐방로 (2018 자료)</option>'));
assert(html.includes('historicalKNPS=data;'));
assert(html.includes("const response=await fetch('./data/knps-seorak-2018.geojson')"));
assert(html.includes("const features=historicalKNPS?.features?.filter(f=>f.properties?.facility_type==='탐방로')||[];"));
assert(html.includes("geom?.type==='MultiLineString'?geom.coordinates:[]"));
assert(html.includes("'stroke-width':2.6"));
assert(html.includes("mode==='knps'"));
assert(html.includes("$('pathMode').value='focus'"));
assert(html.includes("const visibleTrails=showSeorak&&mode!=='all'"));
assert(html.includes("excludedSeorakInsideTrailIndices=new Set([89,436,437])"));
assert(!html.includes("window.SanbakNationalRoutes.shortest"));
const original=html.match(/window\.SANBAK_NP_OSM_B64="([^"]+)"/)?.[1];
assert(original);
const old=JSON.parse(read('audits/seorak-v91-display-way-index.json'));
assert.equal(createHash('sha256').update(original).digest('hex'),old.v73_embedded_source_sha256);
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,2);
for(const s of inline)new Function(s[1]);
const sw=read('sw.js'),wf=read('.github/workflows/deploy-pages.yml');
assert(sw.includes("'./data/knps-seorak-2018.geojson'"));
assert(wf.includes('cp data/knps-seorak-2018.geojson site/data/knps-seorak-2018.geojson'));
assert.equal(JSON.parse(read('deployment-version.json')).ui_version,'v98');
assert(read('README.md').includes('## v98 공단 선형시설 업로드 도입'));
console.log('PASS v98: 24 source KNPS facilities, 19 historic trails, separated from OSM and current access');
