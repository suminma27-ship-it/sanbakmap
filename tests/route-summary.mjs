// Run from the repository root: node tests/route-summary.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function routeSummaryText(');
const end=html.indexOf('\n}',start);
assert(start>=0&&end>start,'Missing summary text generator');
const body=html.slice(start,end+2);
const fmt=(n,unit,d=0)=>Number.isFinite(n)?n.toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d})+unit:'—';
const render=new Function('fmt',body+'\nreturn routeSummaryText;')(fmt);

const sample={km:9.234,gain:1120.7,loss:230.2,max:1708.1};
const geo=render('설악산',['한계령','끝청','대청봉'],sample,false);
assert(geo.includes('경유지 (3개)'));
assert(geo.includes('1. 한계령\n2. 끝청\n3. 대청봉'));
assert(geo.includes('거리: 9.23km'));
assert(geo.includes('누적 상승: 1,121m'));
assert(geo.includes('누적 하강: 230m'));
assert(geo.includes('최고 고도: 1,708m'));
assert(geo.includes('현장 GPS 노선이 아닙니다.'));
assert(!geo.includes('약 1,121m'),'GIS estimate markers must be distinct');

const plan=render('설악산',['들머리','정상'],sample,true);
assert(plan.includes('누적 상승: 약 1,121m'));
assert(plan.includes('실제 탐방로 좌표가 없습니다.'));
assert.equal(render('설악산',['들머리'],sample,false),null);
assert.equal(render('설악산',['들머리','정상'],{...sample,km:0},true),null);
assert.equal(render('설악산',['들머리','정상'],{...sample,max:NaN},false),null);
assert.equal(render('설악산',['들머리',null],sample,false),null);
for(const id of ['planCopy','copyGeo']){
 assert(html.includes('id="'+id+'"'),'Missing UI copy control: '+id);
 assert(html.includes("$('"+id+"').onclick=copyRouteSummary;"),'Missing copy click action: '+id);
 assert(html.includes("$('"+id+"').disabled=!m;"),'Missing copy validity state: '+id);
}
assert(html.includes('verifiedPlanSnapshot(pk.plan_graph,plan.choices,plan.preset)'));
assert(html.includes('verifiedGeoSnapshot(pk.net,builder.choices)'));
assert(html.includes('await navigator.clipboard.writeText(summary)'));
console.log('PASS: route text summary, plan estimate label, invalid route guard, clipboard UI');
