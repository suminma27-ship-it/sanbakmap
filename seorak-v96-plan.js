/* Sanbakmap v96: non-routable waypoint ordering for verified-name POI display catalog.
   Never infer a hiking segment, network connection, travel distance or permission. */
(function(root){
'use strict';
const MAX=20;
function catalogIds(catalog){
 if(!catalog||catalog.version!==95||catalog.park!=='seorak'||
   catalog.render_as_route_vertices!==false||catalog.allow_nearest_snap!==false||
   !Array.isArray(catalog.features)||catalog.features.length!==4)return [];
 const ids=new Set(),out=[];
 for(const p of catalog.features){
  if(typeof p.id!=='string'||!/^seorak-[a-z0-9-]+$/.test(p.id)||
    !p.display_allowed||p.route_anchor_verified!==false||
    p.official_trail_access_verified!==false||
    !Array.isArray(p.lonlat)||p.lonlat.length!==2||
    !p.lonlat.every(Number.isFinite)||ids.has(p.id))return [];
  ids.add(p.id);out.push(p.id);
 }
 return out;
}
function normalize(value,allowed){
 const allow=new Set(Array.isArray(allowed)?allowed:[]),out=[],seen=new Set();
 if(!Array.isArray(value))return out;
 for(const id of value){
  if(typeof id!=='string'||!allow.has(id)||seen.has(id))continue;
  seen.add(id);out.push(id);if(out.length>=MAX)break;
 }
 return out;
}
function add(state,id,allowed){
 const out=normalize(state,allowed);
 if(!allowed.includes(id)||out.includes(id)||out.length>=MAX)return out;
 return [...out,id];
}
function remove(state,id,allowed){return normalize(state,allowed).filter(x=>x!==id)}
function move(state,id,delta,allowed){
 const out=normalize(state,allowed),at=out.indexOf(id),next=at+delta;
 if(!Number.isInteger(delta)||Math.abs(delta)!==1||at<0||next<0||next>=out.length)return out;
 // Swap by index; never discard any other waypoint or mutate an in-use array.
 [out[at],out[next]]=[out[next],out[at]];
 return out;
}
function insertAt(state,id,index,allowed){
 const out=normalize(state,allowed),before=out.indexOf(id);
 if(before<0||!Number.isInteger(index)||index<0||index>=out.length)return out;
 out.splice(before,1);out.splice(index,0,id);return out;
}
function serialize(state,allowed){
 return JSON.stringify({version:96,park:'seorak',poi_ids:normalize(state,allowed),routing_allowed:false});
}
function deserialize(raw,allowed){
 try{
  const data=JSON.parse(raw);
  if(data?.version!==96||data?.park!=='seorak'||data.routing_allowed!==false)return [];
  return normalize(data.poi_ids,allowed);
 }catch(_){return [];}
}
function summary(state,allowed){
 return {kind:'unordered_route_geometry',waypoints:normalize(state,allowed).slice(),
  routing_allowed:false,physical_track_created:false,distance_km:null,ascent_m:null,descent_m:null};
}
root.SanbakPOIPlanV96=Object.freeze({
 version:96,catalogIds,normalize,add,remove,move,insertAt,serialize,deserialize,summary
});
})(window);
