// v74: GIS trails and Web Mercator raster tiles share projection, not route features.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const moduleCode=readFileSync(new URL('national-parks-basemap.js',root),'utf8');
const api=new Function('const window={};'+moduleCode+';return window.SanbakParkBasemap;')();
const html=readFileSync(new URL('national-parks-trails.html',root),'utf8');
const b64=html.match(/window\.SANBAK_NP_OSM_B64="([^"]+)"/)?.[1];
assert(b64);
const data=JSON.parse(gunzipSync(Buffer.from(b64,'base64')).toString());
assert.equal(data.data_version,73,'park trail geometry must remain v73 source');
for(const [name,park] of Object.entries(data.parks)){
 const proj=api.fit(park.bbox);
 assert(api.xy(park.segments.trail[0][0],proj).every(Number.isFinite),name);
 for(const mode of ['standard','topo','lines']){
  const result=api.tiles(proj,{z:1,x:0,y:0},mode);
  assert(result.tiles.length<=48,'too many tiles');
  if(mode==='lines'){assert.equal(result.tiles.length,0);continue}
  assert(result.tiles.length>0,'no tiles '+name);
  for(const tile of result.tiles){
   const n=2**tile.z;
   assert(Math.abs(tile.svgX-(500+(tile.x/n-proj.mx)*proj.scale))<1e-6);
   assert(Math.abs(tile.svgY-(350+(tile.y/n-proj.my)*proj.scale))<1e-6);
   assert(Math.abs(tile.side-proj.scale/n)<1e-6);
   assert(tile.url.startsWith('https://'));
  }
  assert(api.tiles(proj,{z:3,x:250,y:-170},mode).tiles.length<=48);
 }
}
for(const token of ['value="standard" selected','value="topo"','value="lines"',
 'national-parks-basemap.js',"tileLayer=elem('g'","href:tile.url"])assert(html.includes(token),token);
assert(html.indexOf("tileLayer=elem('g'")<html.indexOf('const trails=record.segments.trail'),'tiles must be behind trails');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);
for(const item of scripts)new Function(item[1]);
const sw=readFileSync(new URL('sw.js',root),'utf8');
assert(sw.includes('sanbakmap-v75-fresh-1')&&sw.includes('./national-parks-basemap.js'));
const workflow=readFileSync(new URL('.github/workflows/deploy-pages.yml',root),'utf8');
assert(workflow.includes('national-parks-basemap.js'));
console.log('PASS: v74 OSM/Topo tile projection, native SVG trails, three parks and package');