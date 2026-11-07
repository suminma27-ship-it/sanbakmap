import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(join(root,'core/nationwide-topology-v102.js'),'utf8');
const scope={};new Function('window',source)(scope);
const topology=scope.SanbakTopologyV102;
const knps=JSON.parse(readFileSync(join(root,'data/knps-seorak-2018.geojson'),'utf8'));
const lines=topology.historicKnps(knps);
const graph=topology.build(lines,{sourceGeometry:'original'});
assert.equal(lines.length,21);
assert.equal(graph.summary.geometricComponents,17);
assert.equal(graph.summary.nodes,39);
assert.equal(graph.summary.edges,22);
assert.equal(graph.summary.nearEndsReviewOnly,1);
assert.equal(graph.summary.proximityEdgesCreated,0);
assert.equal(graph.routable,false);
const at=process.argv.indexOf('--output-dir');
if(at>=0){
 const out=resolve(process.argv[at+1]);mkdirSync(out,{recursive:true});
 writeFileSync(join(out,'knps-seorak-topology-v102.json'),JSON.stringify({
  mountainCode:'428302602',source:'KNPS 2018 historic line facilities',
  features:19,sourceDate:'2018-12-31',currentAccessVerified:false,graph
 })+'\n');
}
console.log('PASS KNPS v102 sample: 19 historic trail features / 21 parts / 17 components / 0 snapped gaps');
