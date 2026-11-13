/** Historical v69 stitch decision regression. Never writes or authorizes routes. */
export function evaluateV69(a,b,forwardCount,reverseCount){
  const horizontalMeters=Number(a.horizontalMeters),verticalMeters=Number(a.verticalMeters);
  return {
    candidateOnly:true,
    stitchEligible:Number.isFinite(horizontalMeters)&&horizontalMeters>=0&&horizontalMeters<=0.75&&Number.isFinite(verticalMeters)&&verticalMeters>=0&&verticalMeters<=4&&a.degree===1&&b.degree>=1&&a.component!==b.component&&forwardCount===1&&reverseCount===1&&(b.degree!==1||b.reciprocal===true),
    passageAuthorized:false
  };
}
export function audit(){
 const cases=[
  ['35m-close-not-v69',{horizontalMeters:34.99,verticalMeters:0,degree:1,component:1},{degree:1,component:2},1,1,false],
  ['v69-boundary-unique',{horizontalMeters:.75,verticalMeters:4,degree:1,component:1},{degree:1,component:2,reciprocal:true},1,1,true],
  ['ambiguous-reverse',{horizontalMeters:.2,verticalMeters:1,degree:1,component:1},{degree:1,component:2},1,2,false],
  ['same-component',{horizontalMeters:.2,verticalMeters:1,degree:1,component:1},{degree:1,component:1},1,1,false],
  ['not-degree-one',{horizontalMeters:.2,verticalMeters:1,degree:2,component:1},{degree:1,component:2},1,1,false],
  ['nonreciprocal-degree-one',{horizontalMeters:.2,verticalMeters:1,degree:1,component:1},{degree:1,component:2,reciprocal:false},1,1,false],
  ['degree-two-target-allowed',{horizontalMeters:.2,verticalMeters:1,degree:1,component:1},{degree:2,component:2},1,1,true],
  ['vertical-mismatch',{horizontalMeters:.2,verticalMeters:4.01,degree:1,component:1},{degree:1,component:2},1,1,false],
  ['nan-distance',{horizontalMeters:NaN,verticalMeters:1,degree:1,component:1},{degree:1,component:2},1,1,false]
 ];
 for(const [name,a,b,f,r,expected] of cases){const result=evaluateV69(a,b,f,r);if(result.stitchEligible!==expected||result.passageAuthorized!==false)throw Error(name);}
 return {schema:'sanbak-v232-v69-fail-closed-rule-regression',cases:cases.length,passed:cases.length,authorizedConnections:0,rule:{maxHorizontalMeters:.75,maxVerticalMeters:4,sourceDegreeOne:true,targetDegreeAtLeastOne:true,distinctComponents:true,uniqueReverse:true,reciprocalIfTargetDegreeOne:true},note:'Synthetic rule tests only; not a nationwide geometric match or official authorization.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)console.log(JSON.stringify(audit(),null,2));
