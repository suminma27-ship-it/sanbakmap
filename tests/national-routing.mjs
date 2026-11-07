// Run: node tests/national-routing.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../national_routes.js',import.meta.url),'utf8');
const engine=new Function('const window={};\n'+src+'\nreturn window.SanbakNationalRoutes;')();
const a=[127,37],b=[127.001,37],c=[127.002,37],d=[127.003,37];
const link={type:'Feature',properties:{feature_kind:'planning_connector',verified:false},geometry:{type:'LineString',coordinates:[b,c]}};
const original=[[a,b],[c,d]],sourceJSON=JSON.stringify(original);
const disconnected=engine.build(original,[]);
assert.equal(disconnected.nodes.length,4);
assert.equal(engine.shortest(disconnected,0,3),null,'Disconnected source segments must remain separate');
const bridged=engine.build(original,[link]);
const route=engine.shortest(bridged,0,3);
assert(route&&route.provisional===1&&route.coords.length===4);
assert(Math.abs(route.km-(engine.km(a,b)+engine.km(b,c)+engine.km(c,d)))<1e-8);
assert.equal(JSON.stringify(original),sourceJSON,'Source paths mutated');
const graph=engine.build([[a,b,c,d]],[link]);
assert.equal(engine.shortest(graph,0,3).provisional,0,'Source-only path preferred to provisional link');
assert.equal(engine.shortest(graph,0,3).coords.length,4);
assert.equal(engine.nearest(graph,p=>p,127.00001,37,.0001),0);
assert.equal(engine.nearest(graph,p=>p,130,37,.0001),-1);
assert.equal(engine.shortest(graph,100,0),null);
const html=readFileSync(new URL('../national.html',import.meta.url),'utf8');
const script=html.split('<script>')[1]?.split('</script>')[0];
assert(script);new Function(script);
for(const part of ['id="routePlanner"','id="plannerToggle"','id="plannerReset"','national_routes.js',
 'function nationalRouteTap(e)','routeGraph=window.SanbakNationalRoutes.build',
 'Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8','sourcePaths=[];routeGraph=null;resetNationalRoute()'])
 assert(html.includes(part),'Missing route UI '+part);
const workflow=readFileSync(new URL('../.github/workflows/deploy-pages.yml',import.meta.url),'utf8');
assert(workflow.includes('national_routes.js'));
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
assert(Number(worker.match(/const CACHE_NAME = 'sanbakmap-v(\d+)-/)?.[1])>=65&&worker.includes('./national_routes.js'));
console.log('PASS: v65 source graph, shortest paths, tagged bridges, touch selection and deployment');
