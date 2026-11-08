import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const win={};
new Function('window',read('core/nationwide-elevation-v107.js'))(win);
new Function('window',read('core/nationwide-elevation-chart-v107.js'))(win);
const profile=win.SanbakElevationV107;
assert.equal(profile.version,107);
assert.equal(win.SanbakElevationChartV107.version,107);
const manifest=profile.checkIndex(JSON.parse(read('data/nationwide-elevation/index.json')));
assert.equal(manifest.mountains['428302602:knps']?.path,'./data/nationwide-elevation/seorak-knps-v108.json','historical KNPS DEM dataset remains source matched');
const forest={nodes:[[0,0],[100,0],[150,0]],edges:[
 [0,1,10,0,0,1],[1,2,5,0,1,2]]};
const testDEM={schema:'sanbak-original-edge-dem-v107',mountainCode:'428302602',
 sourceKind:'forest',graphArchiveSHA256:'7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a',
 nodeCount:3,edgeCount:2,
 dem:{sha256:'1'.repeat(64),name:'FIXTURE: synthetic unit-test input only',
 verticalDatum:'EGM96',units:'m',resolutionMeters:30,
 sampleMethod:'georeferenced-dem-to-original-edge'},
 accessVerified:false,
 edgeSamples:{'0':[[0,100],[4,106],[10,110]],'1':[[0,110],[5,105]]}};
const route={status:'geometry_preview_only',legs:[
 {nodeIds:[0,1,2],edgeIds:[0,1]}],distanceMeters:15};
const first=profile.profile(route,forest,'forest','428302602',testDEM);
assert.equal(first.status,'ready');assert.equal(first.points.length,4);
assert.equal(first.totalMeters,15);
assert.equal(first.ascentMeters,10);
assert.equal(first.descentMeters,5);
assert.deepEqual(first.points.map(x=>x.distanceMeters),[0,4,10,15]);
assert.equal(first.accessVerified,false);
const reverse=profile.profile({status:'geometry_preview_only',legs:[
 {nodeIds:[2,1,0],edgeIds:[1,0]}],distanceMeters:15},
 forest,'forest','428302602',testDEM);
assert.equal(reverse.status,'ready');
assert.equal(reverse.ascentMeters,5);
assert.equal(reverse.descentMeters,10);
assert.deepEqual(reverse.points.map(x=>x.distanceMeters),[0,5,11,15]);
assert.equal(profile.profile(route,forest,'forest','428302602',null).status,'no_dem');
assert.equal(profile.profile({status:'disconnected'},forest,'forest','428302602',testDEM).status,'no_route');
const gap={...testDEM,edgeSamples:{'0':testDEM.edgeSamples['0']}};
assert.equal(profile.profile(route,forest,'forest','428302602',gap).status,'incomplete');
assert.throws(()=>profile.profile(route,forest,'forest','428302602',
 {...testDEM,graphArchiveSHA256:'0'.repeat(64)}),/검증 실패/);
assert.throws(()=>profile.profile(route,forest,'forest','428302602',
 {...testDEM,edgeSamples:{'0':[[0,100],[20,110]]}}),/손상|일치하지 않아/);
const page=read('nationwide-plan.html');
for(const token of ['산박지도 v115 | 지도 노드 탭 좌표 수정',
 'id="elevationPanel"','id="elevationChart"','id="elevationStatus"',
 'core/nationwide-elevation-v107.js','core/nationwide-elevation-chart-v107.js',
 'data/nationwide-elevation/index.json','altCore.profile(p,originalGraph',
 '원본 구간','고도그래프'])assert(page.includes(token),token);
new Function(page.slice(page.lastIndexOf('<script>')+8,page.lastIndexOf('</script>')));
const wf=read('.github/workflows/deploy-pages.yml'),sw=read('sw.js');
assert(wf.includes('cp core/nationwide-elevation-v107.js core/nationwide-elevation-chart-v107.js core/nationwide-elevation-pack-v108.js core/nationwide-elevation-archive-v110.js site/core/'));
assert(wf.includes('cp data/nationwide-elevation/*.json site/data/nationwide-elevation/'));
assert(sw.includes('sanbakmap-v115-node-tap-mobile-fix'));
for(const file of ['core/nationwide-elevation-v107.js','core/nationwide-elevation-chart-v107.js','data/nationwide-elevation/index.json'])
 assert(sw.includes('./'+file));
assert(read('national.html').includes('전국 코스 선형 v115'));
console.log('PASS v107: source-locked altitude samples, correct segment reversals and climb/drop, missing DEM cannot generate fake profile, UI and Pages packaging');
