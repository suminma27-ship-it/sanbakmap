// v59: endpoint reconciliation must not manufacture paths across genuine gaps.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const names=['lineSub','checkedGeoGraph','routeGraph','assembleGeoRoute','lineDistance'];
const functionSource=name=>{
 const a=html.indexOf('function '+name+'('),b=html.indexOf('\n}',a);
 assert(a>=0&&b>a,'Missing function '+name);
 return html.slice(a,b+2);
};
const api=new Function('const checkedGeoGraphs=new WeakMap();const hav=(a,b)=>111.195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);\n'+
 names.map(functionSource).join('\n')+'\nreturn {'+names.join(',')+'}')();
const node=(x,y,z=100)=>[x,y,z];
const netFor=(dx=0,elevation=100)=>{
 const nodes=[node(0,0),node(.001,0),node(.001+dx,0,elevation),node(.002,0,elevation)];
 return {nodes,edges:[[0,1,.111,[nodes[0],nodes[1]]],[2,3,.111,[nodes[2],nodes[3]]]]};
};
for(const [dx,z,linked] of [[0,100,true],[.000005,102,true],[.00003,100,false],[0,130,false]]){
 const net=netFor(dx,z),g=api.checkedGeoGraph(net);
 assert.equal(g.componentCount,linked?1:2,'Bad component topology '+dx+' '+z);
 assert.equal(!!api.routeGraph(net,{edge:0,t:.5},{edge:1,t:.5}),linked);
 if(linked){
  const assembled=api.assembleGeoRoute(net,[{edge:0,t:.5},{edge:1,t:.5}],.05);
  assert(assembled&&Math.abs(api.lineDistance(assembled.line)-assembled.km)<1e-7);
 }else if(dx>.00001)assert(g.nearMisses.length>0,'Uncertain gap should be diagnosed');
}
const crossing=[node(-.001,0),node(.001,0),node(0,-.001),node(0,.001)];
const crossed={nodes:crossing,edges:[[0,1,.222,[crossing[0],crossing[1]]],[2,3,.222,[crossing[2],crossing[3]]]]};
assert.equal(api.checkedGeoGraph(crossed).componentCount,2,'Crossing segments falsely joined');
const ambiguous=[node(0,0),node(.001,0),node(.001,0),node(.002,0),node(.001,0),node(.003,0)];
const multiple={nodes:ambiguous,edges:[[0,1,.111,[ambiguous[0],ambiguous[1]]],[2,3,.111,[ambiguous[2],ambiguous[3]]],[4,5,.111,[ambiguous[4],ambiguous[5]]]]};
assert.equal(api.checkedGeoGraph(multiple).stitches.length,0,'Ambiguous match must stay apart');
const parkData=html.match(/<script id="parkData" type="application\/json">([\s\S]*?)<\/script>/);
assert(parkData,'Embedded park data missing');
const parks=JSON.parse(parkData[1]);let total=0;
for(const p of parks.filter(p=>p.net)){
 const g=api.checkedGeoGraph(p.net);
 for(const m of g.stitches){assert(m.horizontalMeters<=.75001&&m.elevationMeters<=4);total++}
}
assert(total>=2,'Expected at least two repaired GIS node pairs');
console.log('PASS: v59 GIS node joins, rejection tests and '+total+' park-data repairs');
