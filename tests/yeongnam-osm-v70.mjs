// v71: native SVG paths work without MapLibre, WebGL or a remote style.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),html=readFileSync(new URL('yeongnam-osm.html',root),'utf8');
assert(html.includes('산박지도 v72'));
assert(html.includes('value="lines" selected'));
assert(html.includes('<svg id="map"'));
for(const id of ['id="fitAllPaths"','id="zoomIn"','id="zoomOut"','id="showFoot"','id="showTrack"','id="showPoi"'])assert(html.includes(id),id);
for(const token of ["layers.foot=el('g'","layers.track=el('g'","layers.route=el('g'","layers.poi=el('g'",
'payload.trailNetwork.features',"svg.addEventListener('pointerdown'","svg.addEventListener('wheel'","typeof DecompressionStream!=='function'"])
 assert(html.includes(token),'SVG viewer missing: '+token);
assert(!html.includes('maplibregl.Map('));
assert(!html.includes('https://unpkg.com/maplibre-gl'));
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,2);
for(const match of scripts)new Function(match[1]);
const sw=readFileSync(new URL('sw.js',root),'utf8');assert(sw.includes('sanbakmap-v75-fresh-1'));
console.log('PASS: v71 native SVG hiking trail viewer with no external map engine');
