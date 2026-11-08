import assert from 'node:assert/strict';
import {scanDisplayContacts,auditMountain} from '../tools/audit-nationwide-contact-v125.mjs';
const part=(part,component,points)=>({part,component,points});
const n=scanDisplayContacts([
 part(0,1,[[0,0],[100,0]]),
 part(1,1,[[50,18],[50,80]]),
 part(2,2,[[50,150],[50,180]])
]);
assert.equal(n.stats.total,1);
assert.equal(n.stats.alreadyConnected,1);
assert.equal(n.stats.transverse,1);
assert.equal(n.topCandidates[0].gapMeters,18);
assert.equal(n.topCandidates[0].passageVerified,false);
assert.equal(n.topCandidates[0].proposedOnly,true);
assert.deepEqual(n.topCandidates[0].sourceParts,[0,1]);
assert.deepEqual(n.topCandidates[0].anchorsEPSG5179,[[50,0],[50,18]]);
assert.deepEqual(n.topCandidates[0].sourceSegments,[0,0]);
assert.equal(n.stats.gapBandsMeters['10-20'],1);
assert.equal(n.stats.v69HorizontalOnlyMax075m,0);
const v69Threshold=(horizontal,vertical,unique,degreeOne,otherComponent)=>
 horizontal<=.75&&vertical<=4&&unique&&degreeOne&&otherComponent;
assert.equal(v69Threshold(18,0,true,true,true),false,
 'v69 would NOT have connected the 18m synthetic gap');
assert.equal(v69Threshold(.4,3,true,true,true),true);
assert.equal(v69Threshold(.4,5,true,true,true),false);
assert.equal(v69Threshold(.4,2,true,true,false),false,
 'v69 does not stitch two points already in one graph component');
const far=scanDisplayContacts([part(0,1,[[0,0],[100,0]]),part(1,2,[[50,90],[50,180]])]);
assert.equal(far.stats.total,0);
const crossing=scanDisplayContacts([part(0,1,[[0,0],[100,100]]),part(1,2,[[0,100],[100,0]])]);
assert.equal(crossing.stats.total,1);
assert.equal(crossing.topCandidates[0].kind,'crossing_or_overlap');
const graph={summary:{navigable:false,access_verified:false,
 physical_junction_verified:false,geometric_components:2},
 source_files:['mock.zip'],source_parts:[[0,7,0],[0,8,0]],
 nodes:[[0,0],[10,0],[20,0],[30,0]],
 edges:[[0,1,10,0,0,1],[2,3,10,1,0,1]]};
const display={schema:'sanbak-national-institutional-lines-v1',agency:'산림청',
 mountains:{'123456789':[]}};
const result=auditMountain('123456789',graph,display);
assert.equal(result.createdConnectingEdges,0);
assert.equal(graph.edges.length,2);
assert.equal(result.contact.total,0);
console.log('PASS v125: nationwide candidate audit scans connected detours, rejects distant and unverified crossing routes');
