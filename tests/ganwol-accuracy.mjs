// Run: node tests/ganwol-accuracy.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const fixture=readFileSync(new URL('ganwol-review-data.js',root),'utf8');
const encoded=fixture.match(/SANBAK_GANWOL_REVIEW_GZIP_B64='([^']+)'/)?.[1];
assert(encoded,'Embedded GPX fixture absent');
const decoded=JSON.parse(gunzipSync(Buffer.from(encoded,'base64')).toString());
assert.equal(decoded.s.length,20,'Original trail count');
assert.equal(decoded.g.length,408,'GPX point count');
assert.equal(decoded.s.reduce((n,p)=>n+p.length,0),327,'2m display simplification');
assert.deepEqual(decoded.g[0],[129.040198,35.55208]);
assert.deepEqual(decoded.g.at(-1),[129.065739,35.556173]);
const html=readFileSync(new URL('ganwol-review.html',root),'utf8');
const script=html.split('<script>\n')[1]?.split('</script>')[0];
assert(script,'Review page script not found');new Function(script);
for(const text of ['id="showOld"','id="showGpx"','id="showGaps"','id="summit"','id="east"',
 'data.g.slice(5)','allow_in_routing:false','verified:false','ganwol-gpx-unverified.geojson'])
 assert(html.includes(text),'Missing source or safety mark '+text);
const national=readFileSync(new URL('national.html',root),'utf8');
const nationalScript=national.split('<script>')[1]?.split('</script>')[0];new Function(nationalScript);
for(const token of ['id="ganwolAuditLink"','ganwol-review.html','id="allowUnverified"',
 "el('allowUnverified').checked=false",
 "window.SanbakNationalRoutes.build(sourcePaths,el('allowUnverified').checked?planningConnectors:[])",
 "node.setAttribute('stroke-dasharray','4 5')"])
 assert(national.includes(token),'Safety integration missing '+token);
const worker=readFileSync(new URL('sw.js',root),'utf8');
assert(worker.includes("const CACHE_NAME = 'sanbakmap-v")&&worker.includes('./ganwol-review.html')&&worker.includes('./ganwol-review-data.js'));
const workflow=readFileSync(new URL('.github/workflows/deploy-pages.yml',root),'utf8');
assert(workflow.includes('ganwol-review.html')&&workflow.includes('ganwol-review-data.js'));
console.log('PASS: v66 Ganwolsan GPX overlay, coordinate fixture, unverified default off and deploy assets');
