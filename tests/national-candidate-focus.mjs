// Run: node tests/national-candidate-focus.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../national.html',import.meta.url),'utf8');
const script=html.split('<script>')[1]?.split('</script>')[0];
assert(script,'National map script missing');new Function(script);
for(const token of ['id="connectivityCandidates"','id="connectivityStatus"','aria-pressed','function focusConnectivityCandidate(index)','function fullProjection(paths)','selectedCandidate=-1','cam.x=-cam.z*(mid[0]-500)','cam.y=-cam.z*(mid[1]-325)','(selectedCandidate>=0?9:6)/cam.z','function renderCandidateList()'])assert(html.includes(token),token);
function extract(name){
 const start=script.indexOf('function '+name+'('),end=script.indexOf('\n}',start);
 assert(start>=0&&end>start,'Missing '+name);return script.slice(start,end+2);
}
const state=new Map(),mk=id=>({id,open:false,textContent:'',scrollIntoView(){state.set('scrolled',true)}});
for(const id of ['map','connectivity','connectivityStatus'])state.set(id,mk(id));
const mock={el:id=>state.get(id),render:()=>state.set('rendered',true),renderCandidateList:()=>state.set('listRendered',true)};
const api=new Function('mock',
 "let {el,render,renderCandidateList}=mock;let displayMode='full',connectivity=null,selectedCandidate=-1,lines=[],cam={z:1,x:0,y:0};\n"+
 ['fullProjection','focusConnectivityCandidate'].map(extract).join('\n')+
 "\nreturn {fullProjection,focusConnectivityCandidate,setData:(c,l)=>{connectivity=c;lines=l},getState:()=>({cam,selectedCandidate}),setMode:v=>{displayMode=v}};"
)(mock);
const paths=[[[127,37],[127.02,37]],[[127.02001,37],[127.03,37]]];
const candidate={a:[127.02,37],b:[127.02001,37],meters:.89};
api.setData({candidates:[candidate]},paths);
assert.equal(api.focusConnectivityCandidate(0),true);
const {cam,selectedCandidate}=api.getState();
assert.equal(selectedCandidate,0);assert(cam.z>=12&&cam.z<=300);
const proj=api.fullProjection(paths),a=proj(candidate.a),b=proj(candidate.b);
const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
assert(Math.abs(cam.x+cam.z*(mid[0]-500))<1e-6,'X midpoint not centered');
assert(Math.abs(cam.y+cam.z*(mid[1]-325))<1e-6,'Y midpoint not centered');
assert(state.get('connectivity').open);
assert(state.get('connectivityStatus').textContent.includes('A 37.000000'));
assert.equal(state.get('scrolled'),true);assert.equal(state.get('rendered'),true);assert.equal(state.get('listRendered'),true);
assert.equal(api.focusConnectivityCandidate(9),false,'Invalid candidate accepted');
api.setMode('preview');assert.equal(api.focusConnectivityCandidate(0),false,'Preview should not focus candidate');
assert(html.includes('selectedCandidate=-1;if(connectivity)'),'Full extent should clear candidate focus');
assert(html.includes("selectedCandidate=-1;el('connectivity').hidden=true"),'Selecting new mountain should clear focus');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
assert(Number(sw.match(/const CACHE_NAME = 'sanbakmap-v(\d+)-/)?.[1])>=63,'PWA cache not invalidated');
console.log('PASS: v63 candidate focus, exact midpoint, invalid selection, preview guard, coordinates, reset and cache');
