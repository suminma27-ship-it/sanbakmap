/* Nationwide POI registration v105 — strict original GIS node identity.
 * This module only attaches historic agency names/categories to existing forest
 * graph nodes. It never changes graph topology, invents roads or approves access.
 * KNPS and forest node IDs belong to unrelated source graphs.
 */
(function(root){
'use strict';
const KINDS=Object.freeze(['분기점','시종점','정상','대피소']);
const ORIGIN='7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a';
function checkIndex(index){
 if(index?.schema!=='sanbak-poi-index-v105'||
    index.sourceZipSHA256!==ORIGIN||index.topologySourceSHA256!==ORIGIN||
    index.bucketCount!==32||index.matchedPoints!==45627||
    index.mountainsWithCandidatePoints!==2878||
    index.maxNodeDistanceMeters!==0.15||index.minimumJunctionDegree!==3||
    index.sourceAccessVerified!==false||index.routingAuthorized!==false||
    index.knpsCombined!==false)throw Error('Institution POI provenance validation failed');
 return index;
}
function checkBucket(data,index){
 checkIndex(index);
 if(data?.schema!=='sanbak-poi-node-candidates-v105'||data.crs!=='EPSG:5179'||
    data.source_zip_sha256!==index.sourceZipSHA256||
    data.topology_source_sha256!==index.topologySourceSHA256||
    data.node_match_max_m!==0.15||!Array.isArray(data.files)||
    !Array.isArray(data.kinds)||data.kinds.join('|')!==KINDS.join('|')||
    !data.mountains||typeof data.mountains!=='object'||
    !String(data.status).includes('no current access'))throw Error('Agency point source shard mismatch');
 return data;
}
function selectMountain(data,index,code,engine){
 checkBucket(data,index);
 if(!/^\d{9}$/.test(String(code))||!engine||engine.sourceKind!=='forest'||
    !Number.isInteger(engine.nodeCount)||!Number.isInteger(engine.edgeCount))
   throw Error('POIs may only be attached to their original forest-source graph');
 const rows=data.mountains[code]||[];
 if(!Array.isArray(rows)||rows.length>15000)throw Error('Invalid named node array');
 const result=[],dedup=new Set();
 for(const r of rows){
  if(!Array.isArray(r)||r.length!==7)throw Error('Invalid source point row');
  const [nodeId,kind,detail,fileid,rowIndex,matchedMeters,recordId]=r;
  if(!Number.isInteger(nodeId)||nodeId<0||nodeId>=engine.nodeCount||
     !Number.isInteger(kind)||kind<0||kind>=KINDS.length||
     !Number.isInteger(fileid)||fileid<0||fileid>=data.files.length||
     !Number.isInteger(rowIndex)||rowIndex<0||
     !Number.isFinite(matchedMeters)||matchedMeters<0||matchedMeters>0.15||
     typeof detail!=='string'||detail.length>65||
     typeof recordId!=='string')throw Error('Unverifiable original agency POI reference');
  if(kind===0&&engine.degreeOf(nodeId)<3)throw Error('Junction not joined to three graph directions');
  const originalFile=data.files[fileid],key=originalFile+':'+rowIndex;
  if(dedup.has(key))throw Error('Duplicate institution POI row');
  dedup.add(key);
  const label=detail.trim()&&!detail.includes('�')?detail.trim():KINDS[kind];
  result.push({nodeId,kind:KINDS[kind],detail:label,
   label:(label===KINDS[kind]?KINDS[kind]:(KINDS[kind]+' · '+label)),
   sourceFile:originalFile,sourceRow:rowIndex,originalRecordId:recordId,
   matchingDistanceMeters:matchedMeters,source:'산림청 원본 주요지점',
   coordinatesMatched:true,accessVerified:false,
   physicalLocationVerified:false,routingApproved:false});
 }
 return result;
}
root.SanbakNationwidePoiV105=Object.freeze({version:105,checkIndex,checkBucket,selectMountain,KINDS});
})(typeof window!=='undefined'?window:globalThis);
