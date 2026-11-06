// Run: node tests/seorak-planning-junction.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.split('<script>\n(() => {')[1]?.split('</script>')[0];
assert(script,'App source missing');
const data=JSON.parse(html.match(/<script id="parkData" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'null');
const seorak=data.find(p=>p.id==='seorak');
assert(seorak?.net);
const sourceEdges=seorak.net.edges.length,sourceNodes=seorak.net.nodes.length;
const oldSegments=JSON.stringify([seorak.net.edges[9],seorak.net.edges[22]]);
const findFn=name=>{
 const i=script.indexOf('function '+name+'('),j=script.indexOf('\n}',i);
 assert(i>=0&&j>i,'Function absent: '+name);return script.slice(i,j+2);
};
const code=[
 "let parks=[JSON.parse(JSON.stringify(source))];const hav=(a,b)=>111.195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);",
 findFn('lineDistance'),findFn('installSeorakPlanningBridge'),findFn('routeUsesPlanningBridge'),
 "const checkedGeoGraphs=new WeakMap();",findFn('lineSub'),findFn('checkedGeoGraph'),findFn('routeGraph'),
 "return {parks,installSeorakPlanningBridge,routeUsesPlanningBridge,checkedGeoGraph,routeGraph};"
].join('\n');
const api=new Function('source',code)(seorak),net=api.parks[0].net;
assert.equal(net.edges.length,sourceEdges+5,'Two splits and one provisional connector expected');
assert.equal(net.nodes.length,sourceNodes+2);
assert.equal(JSON.stringify([net.edges[9],net.edges[22]]),oldSegments,'Original edge IDs must stay intact');
assert.equal(net._planningBaseEdges.join(','),'9,22');
const ix=net._planningConnectorIndex,bridge=net.edges[ix];
assert(bridge[4]?.verified===false,'Connector must remain explicitly unverified');
assert(bridge[2]>.06&&bridge[2]<.09,'Screenshot candidate spacing should be about 73m');
const g=api.checkedGeoGraph(net);assert(g.valid[ix]===1);
const qA={edge:ix-4,t:1},qB={edge:ix-2,t:1};
const joined=api.routeGraph(net,qA,qB);
assert(joined?.length>=2&&api.routeUsesPlanningBridge(net,joined),'Provisional junction must be usable by routing');
assert(html.includes("net._planningBaseEdges?.includes(edge)"),'New points should snap to split equivalents');
assert(html.includes('한계령 계획용 연결 포함(미검증)'),'Unverified route warning absent');
console.log('PASS: v64 Seoraksan 73m planning junction, old edges preserved, routable connector, warning');
