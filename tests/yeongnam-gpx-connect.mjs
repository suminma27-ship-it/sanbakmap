// v68: source GPX graph composition is explicitly provisional and never a full summit route.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const base=new URL('../',import.meta.url);
const page=readFileSync(new URL('yeongnam-gpx-connect.html',base),'utf8');
const b64=page.match(/SANBAK_YEONGNAM_GPX_B64="([^\"]+)"/)?.[1];assert(b64,'Embedded GPX missing');
const data=JSON.parse(gunzipSync(Buffer.from(b64,'base64')).toString());
assert.equal(data.version,68);
assert.equal(data.ganwol.length,1);
assert.equal(data.shinbul.length,8,'Source segmented Shinbulsan GPX must NOT be flattened');
assert.equal(data.ganwol.flat().length,408);
assert.equal(data.shinbul.flat().length,303);
assert.equal(data.stats.ganwol_km,4.594);
assert.equal(data.stats.shinbul_segment_km,3.116);
assert.equal(data.stats.provisional_route_km,6.409);
assert(data.stats.junction_m>2.4&&data.stats.junction_m<2.5);
assert(data.stats.shinbul_summit_gap_straight_m>900);
assert(data.stats.route_target_highest_gpx_ele===679);
assert.deepEqual(data.route[0],data.ganwol[0][0]);
assert.deepEqual(data.route.at(-1),data.stats.route_target_point);
const xy=(a,b)=>111195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);
let short=0;for(let i=1;i<data.route.length;i++){const d=xy(data.route[i-1],data.route[i]);assert(d<85,'Unexpected phantom edge in route: '+d);if(d>2.3&&d<2.7)short++}
assert(xy(data.candidate_connection[0],data.candidate_connection[1])>2.4);
assert(data.shinbul.flat().every(p=>p[2]<=679));
const scripts=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2,'Inline raw GPS and viewer scripts expected');
for(const s of scripts)new Function(s[1]);
for(const text of ['id="focusJunction"','id="focusSummit"','id="export"',
 'allow_in_routing:false','GPX 없음','2.46m'])assert(page.includes(text),text);
const worker=readFileSync(new URL('sw.js',base),'utf8');
assert(worker.includes('sanbakmap-v70-fresh-1')&&worker.includes('./yeongnam-gpx-connect.html'));
const flow=readFileSync(new URL('.github/workflows/deploy-pages.yml',base),'utf8');
assert(flow.includes('yeongnam-gpx-connect.html'));
console.log('PASS: v68 dual GPX, 8 source segments, 2.46m provisional join, incomplete summit and responsive viewer');
