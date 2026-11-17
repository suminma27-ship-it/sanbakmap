import assert from 'node:assert/strict';
import {scanDisplayContacts} from '../tools/audit-nationwide-contact-v125.mjs';
const p=(part,component,points)=>({part,component,points});
const parts=[
 p(0,0,[[0,0],[100,0],[200,0]]),
 p(1,1,[[50,-30],[50,30],[50,-30]]),
 p(2,2,[[60,7],[60,10],[70,10]]),
 p(3,3,[[500,0],[500,100]]),
 p(4,4,[[70,15],[70,45]]),
 p(5,5,[[0,20],[100,20]]),
 p(6,6,[[5000,5000],[100000,100000]])
];
const source=JSON.stringify(parts);
const summary=v=>v.topCandidates.map(c=>({
 pair:c.sourceParts,segments:c.sourceSegments,gap:c.gapMeters,
 kind:c.kind,anchors:c.anchorsEPSG5179
}));
const expected10=[
 {pair:[2,4],segments:[1,0],gap:5,kind:'transverse_gap_candidate',anchors:[[70,10],[70,15]]},
 {pair:[0,2],segments:[0,0],gap:7,kind:'transverse_gap_candidate',anchors:[[60,0],[60,7]]},
 {pair:[2,5],segments:[0,0],gap:10,kind:'transverse_gap_candidate',anchors:[[60,10],[60,20]]},
 {pair:[0,1],segments:[0,0],gap:0,kind:'crossing_or_overlap',anchors:[[50,0],[50,0]]},
 {pair:[1,5],segments:[0,0],gap:0,kind:'crossing_or_overlap',anchors:[[50,20],[50,20]]},
 {pair:[4,5],segments:[0,0],gap:0,kind:'crossing_or_overlap',anchors:[[70,20],[70,20]]},
 {pair:[1,2],segments:[0,0],gap:10,kind:'parallel_or_duplicate',anchors:[[50,7],[60,7]]}
];
const ten=scanDisplayContacts(parts,{maxMeters:10,maxShown:100});
const thirtyFive=scanDisplayContacts(parts,{maxMeters:35,maxShown:100});
assert.deepEqual(summary(ten),expected10);
assert.equal(ten.stats.total,7);
assert.equal(ten.skippedLong,1);
assert.equal(ten.stats.gapBandsMeters['5-10'],3);
assert.equal(thirtyFive.stats.total,10,'Retain 35m audit inventory');
assert.equal(thirtyFive.stats.gapBandsMeters['10-20'],3);
assert.deepEqual(summary(thirtyFive).slice(0,3),expected10.slice(0,3));
assert.deepEqual(summary(thirtyFive).slice(4,8),expected10.slice(3));
assert.equal(thirtyFive.skippedLong,1);
const limited=scanDisplayContacts(parts,{maxMeters:35,maxShown:2});
assert.equal(limited.stats.total,10);
assert.deepEqual(summary(limited),summary(thirtyFive).slice(0,2));
for(const c of thirtyFive.topCandidates){
 assert.equal(c.proposedOnly,true);
 assert.equal(c.passageVerified,false);
 assert.equal(c.originalFullVerticesRechecked,false);
}
assert.equal(JSON.stringify(parts),source,'Original geometry changed');
const lattice=[];
for(let i=0;i<14;i++)lattice.push(p(i,i,[[i*3,0],[i*3,180]]));
for(let i=0;i<14;i++)lattice.push(p(i+14,i+14,[[0,i*3],[180,i*3]]));
const crossed=scanDisplayContacts(lattice,{maxMeters:35,maxShown:5000});
const keys=crossed.topCandidates.map(x=>x.sourceParts.join(':'));
assert.equal(keys.length,new Set(keys).size);
assert(crossed.stats.crossingOrOverlap>=196);
assert(crossed.topCandidates.every(c=>c.proposedOnly&&!c.passageVerified));
console.log('PASS v322: repeated spatial cells, zero-gap minima, stable 10m/35m candidates, no approvals');
