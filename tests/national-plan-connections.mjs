// Run: node tests/national-plan-connections.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../national.html',import.meta.url),'utf8');
const code=html.split('<script>')[1]?.split('</script>')[0];
assert(code);new Function(code);
for(const part of ["candidates:gaps,candidateTotal:gaps.length","feature_kind:'planning_connector'","verified:false","planningConnectors=diagnosis.candidates.map","data.features.concat(planningConnectors)","id=\"planningDownload\"","lines=result.paths.concat"])assert(html.includes(part),part);
const fn=name=>{
 const i=code.indexOf('function '+name+'('),j=code.indexOf('\n}',i);
 assert(i>=0&&j>i);return code.slice(i,j+2);
};
const diagnose=new Function(fn('diagnoseConnectivity')+'\nreturn diagnoseConnectivity')();
const a=[[127,37],[127.00015,37]],b=[[127.00016,37],[127.00031,37]],c=[[127.00032,37],[127.00047,37]];
const raw=[a,b,c],snapshot=JSON.stringify(raw),result=diagnose(raw);
assert.equal(result.components,3);assert(result.candidateTotal>=2);
assert.equal(result.candidates.length,result.candidateTotal,'All candidate links must be available, not capped at eight');
assert.equal(JSON.stringify(raw),snapshot,'Source geometry must not be mutated');
for(const candidate of result.candidates){assert(candidate.meters>0&&candidate.meters<=30)}
console.log('PASS: v64 nationwide planning links and unmodified source geometry');
