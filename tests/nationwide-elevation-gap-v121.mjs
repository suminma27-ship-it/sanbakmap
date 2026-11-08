import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const w={};
for(const file of ['core/nationwide-topology-v102.js','core/nationwide-knps-contacts-v117.js',
 'core/nationwide-knps-nearby-v118.js','core/nationwide-route-preview-v104.js',
 'core/nationwide-elevation-v107.js','core/nationwide-elevation-pack-v108.js',
 'core/nationwide-elevation-partial-v119.js'])
 new Function('window',read(file))(w);
const geo=JSON.parse(read('data/knps-seorak-2018.geojson'));
const original=w.SanbakTopologyV102.build(w.SanbakTopologyV102.historicKnps(geo),{sourceGeometry:'original'});
const exact=w.SanbakKnpsContactsV117.enhance(original,geo);
const planning=w.SanbakKnpsNearbyV118.enhance(exact.graph,geo,{maxGapMeters:250});
const packed=JSON.parse(read('data/nationwide-elevation/seorak-knps-v108.json'));
const data=w.SanbakElevationPackV108.expand(packed,original,'knps','428302602');
assert.equal(original.edges.length,22);
assert.equal(Object.keys(data.edgeSamples).length,22);
const route=w.SanbakGeometryPlannerV104.create(planning.graph,'knps').plan([23,33]);
const p=w.SanbakElevationPartialV119.profile(route,original,planning.graph,'knps','428302602',data);
assert.equal(p.status,'partial');
assert.equal(p.gaps.length,2);
assert.equal(p.estimates.length,2);
assert(p.unknownMeters>185&&p.unknownMeters<187);
assert(Math.abs(p.coveredMeters+p.unknownMeters-route.distanceMeters)<.2);
assert(p.estimates.every(pts=>pts.length===2&&pts.every(x=>Number.isFinite(x.elevationMeters))));
const svg={children:[],setAttribute(){},append(x){this.children.push(x)},replaceChildren(){this.children=[]}};
globalThis.document={createElementNS:(_ns,tag)=>({tag,attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v},append(x){this.children.push(x)}})};
new Function('window',read('core/nationwide-elevation-chart-v107.js'))(w);
const chart=w.SanbakElevationChartV107.create(svg);
assert.equal(chart.show(p),'partial');
assert.equal(svg.children.filter(x=>x.tag==='path'&&x.attrs['stroke-dasharray']==='7 5').length,0);
assert.equal(svg.children.filter(x=>x.tag==='path'&&x.attrs.stroke==='#cf8423').length,0);
assert.equal(svg.children.filter(x=>x.tag==='path'&&x.attrs.stroke==='#25704c').length,1,
 'measured DEM and interpolated ends must render as one continuous line');
assert.equal(svg.children.filter(x=>x.tag==='rect').length,1,'no amber bands');
const missing={...p,segments:[
 [{distanceMeters:0,elevationMeters:100},{distanceMeters:30,elevationMeters:110}],
 [{distanceMeters:60,elevationMeters:130},{distanceMeters:100,elevationMeters:135}]
 ],estimates:[],gaps:[{fromMeters:30,toMeters:60,provisional:false}],totalMeters:100};
chart.show(missing);
assert.equal(svg.children.filter(x=>x.tag==='path'&&x.attrs.stroke==='#25704c').length,2,
 'never bridge unmeasured intervals without endpoint estimates');
console.log('PASS v123: 22 source DEM edges retained; endpoint interpolation blends green, other missing elevations stay disconnected');
