// v72: GPX and GeoJSON export of contiguous source OSM ridge legs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const mod=readFileSync(new URL('yeongnam-course-v72.js',root),'utf8');
const api=new Function('const window={};'+mod+';return window.SanbakAlpsCourses;')();
const html=readFileSync(new URL('yeongnam-osm.html',root),'utf8');
const enc=html.match(/SANBAK_OSM_ALPS_DATA_B64="([^"]+)"/)?.[1];
assert(enc,'OSM source not embedded');
const d=JSON.parse(gunzipSync(Buffer.from(enc,'base64')).toString());
assert.equal(d.legs.length,5);
const full=api.compose(d.legs,0,5),reverse=api.compose(d.legs,5,0);
assert(Math.abs(full.km-8.16)<.05,'Source path distance');
assert.deepEqual(reverse.coordinates,full.coordinates.slice().reverse());
assert.deepEqual(full.coordinates[0],d.legs[0].coordinates[0]);
assert.deepEqual(full.coordinates.at(-1),d.legs[4].coordinates.at(-1));
for(let i=0;i<=5;i++)for(let j=0;j<=5;j++){
 if(i===j){assert.throws(()=>api.compose(d.legs,i,j),/달라야/);continue}
 const p=api.compose(d.legs,i,j);
 assert.equal(p.legs,Math.abs(j-i));
 assert(p.coordinates.length>1);
 assert(p.km>0);
}
const broken=structuredClone(d.legs);
broken[1].coordinates[0][0]+=.001;
assert.throws(()=>api.compose(broken,0,3),/끊어진/);
const xml=api.gpx(full,'배내봉 & 영축산 <코스>');
assert(xml.includes('<trkseg>')&&xml.includes('배내봉 &amp; 영축산 &lt;코스&gt;'));
assert(!xml.includes('<ele>'),'Do not invent GPX elevation');
const geo=api.geojson(full,'테스트');
assert.equal(geo.metadata.field_verified,false);
assert.equal(geo.metadata.current_access_verified,false);
assert.equal(geo.features[0].geometry.coordinates.length,full.coordinates.length);
for(const key of ['id="courseStart"','id="courseEnd"','id="selectedCourseName"','id="showSelectedCourse"',
'id="downloadCourseGPX"','id="downloadCourseGeoJSON"','id="auditGpx"','yeongnam-course-v72.js',
'window.SanbakAlpsCourses.compose','renderSelectedRoute()'])assert(html.includes(key),key);
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);
for(const s of scripts)new Function(s[1]);
const worker=readFileSync(new URL('sw.js',root),'utf8');
const flow=readFileSync(new URL('.github/workflows/deploy-pages.yml',root),'utf8');
assert(worker.includes('sanbakmap-v72-fresh-1'));
assert(worker.includes('./yeongnam-course-v72.js'));
assert(flow.includes('yeongnam-course-v72.js'));
console.log('PASS: v72 30 directional continuous ridge selections, strict joins, export and SVG UI');
