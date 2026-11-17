import assert from 'node:assert/strict';
import fs from 'node:fs';

// Regression: Leaflet 1.9.4 styles .leaflet-pane with absolute positioning,
// not .leaflet-container with relative positioning. The old probe always
// switched a functioning map to a plain SVG fallback.
const html=fs.readFileSync('mountain-trails.html','utf8');
const css=fs.readFileSync('vendor/leaflet.css','utf8');
const workflow=fs.readFileSync('.github/workflows/deploy-pages.yml','utf8');
const serviceWorker=fs.readFileSync('sw.js','utf8');
assert.match(css,/\.leaflet-pane,[\s\S]{0,400}?position:\s*absolute\s*;/);
assert.match(html,/<link rel="stylesheet" href="\.\/vendor\/leaflet\.css\?v=20261118b">/);
assert.match(html,/probe\.className='leaflet-pane'/);
assert.match(html,/cssReady=window\.getComputedStyle\(probe\)\.position==='absolute'/);
assert.doesNotMatch(html,/cssReady=window\.getComputedStyle\(probe\)\.position==='relative'/);
assert.match(workflow,/cp vendor\/leaflet\.css site\/vendor\/leaflet\.css/);
assert.match(serviceWorker,/'\.\/vendor\/leaflet\.css'/);
assert.match(serviceWorker,/url\.pathname\.endsWith\('\/vendor\/leaflet\.css'\)/);
console.log('PASS Leaflet stylesheet probe matches the shipped v1.9.4 CSS and local file is deployed');
