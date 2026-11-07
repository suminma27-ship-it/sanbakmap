// v70 basemap resilience regression
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('yeongnam-osm.html',root),'utf8');
const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert(js);new Function(js);
for(const keyword of ['value="lines"','style:selectedStyle()',"map.on('style.load'","layerSource();makePoi();",'fallbackToLines()', "map.setStyle(blankStyle)",'https://tile.openstreetmap.org/{z}/{x}/{y}.png'])assert(html.includes(keyword),keyword);
assert(!html.includes("style:'https://tiles.openfreemap.org/styles/liberty'"));
const sw=readFileSync(new URL('sw.js',root),'utf8');assert(sw.includes('sanbakmap-v70-fresh-1'));
console.log('PASS: v70 raster basemap resilient to external style fetch failure');
