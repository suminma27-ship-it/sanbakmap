/* Nationwide reusable display-only filter v1, 2026-11-08.
 * Visible road categories are OSM/source labels, NOT official trail permission.
 * No geometry mutation, road promotion or route building.
 */
(function(root){
 'use strict';
 const modes=Object.freeze(['focus','roads','all']);
 function classifyOSM(highway){
  if(highway==='track')return 'forest_road';
  if(['path','steps','bridleway'].includes(highway))return 'trail';
  if(['footway','pedestrian'].includes(highway))return 'uncertain_footway';
  return 'review';
 }
 function visible(mode,category){
  if(!modes.includes(mode))return false;
  if(mode==='all')return true;
  if(category==='trail')return true;
  return mode==='roads'&&category==='forest_road';
 }
 function insideTrail(index,mode,uncertainIndices){
  if(!modes.includes(mode)||!Number.isInteger(index)||index<0)return false;
  return mode==='all'||!(uncertainIndices instanceof Set&&uncertainIndices.has(index));
 }
 root.SanbakTrailVisibility=Object.freeze({version:1,modes,classifyOSM,visible,insideTrail});
})(window);
