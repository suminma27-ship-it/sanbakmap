// v84: forest roads use a muted olive line while hiking trails retain the original green.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('national-parks-trails.html',root),'utf8');
const readme=readFileSync(new URL('README.md',root),'utf8');
const trail='#267653',track='#6A8567',oldTrack='#816d4b';
assert(html.includes('국립공원 등산로 원본 · v84'));
assert(readme.includes('**현재 버전: v84**'));
assert(readme.includes('## v83 업데이트'),'prior OSM/GPX source audit should remain');
assert(!html.includes(oldTrack),'old brown road color must be removed');
assert.equal(html.split(track).length-1,3,'map road layers and legend should share one color');
assert.equal(html.split(trail).length-1,3,'hiking trail and legend colors must remain unchanged');
assert(html.includes('.swatch.track{border-color:'+track+';border-top-style:dashed}'));
assert(html.includes(".swatch{width:22px;height:0;border-top:3px solid "+trail+"}"));
assert.equal(html.split("stroke:'"+track+"'").length-1,2,'inside-park and exterior road SVG paths must agree');
assert.equal(html.split("stroke:'"+trail+"'").length-1,2,'inside-park and exterior hiking SVG paths must agree');
assert.equal(html.split("'stroke-dasharray':'4 4'").length-1,2,'road dashed pattern should be retained');
for(const required of ["v77.a.filter(r=>!excludedFacilityPathIds.has(r.i))",
 "v78.paths.filter(r=>r.h==='track')","outerSeorak.features.push(...added83)"]){
 assert(html.includes(required),'trail scope or source data changed: '+required);
}
assert(!html.includes('window.SanbakNationalRoutes.shortest'));
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,2);
for(const item of inline)new Function(item[1]);
console.log('PASS v84: 2 muted olive forest-road map layers + legend, hiking trail green unchanged, no source or routing edits');
