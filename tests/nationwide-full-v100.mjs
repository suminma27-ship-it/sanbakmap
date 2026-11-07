import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('nationwide-full.html');
assert(html.includes('산박지도 v100 | 전국 기관 수록 등산로 상세 지도'));
assert(!html.includes('<script id="agency-chunks"'));
assert(html.includes("chunks=JSON.parse(window.SANBAK_FULL_PARTS.join(''))"));
const shell={SANBAK_FULL_PARTS:[]};
for(let i=0;i<11;i++){
 const path='data/nationwide-full/part-'+String(i).padStart(2,'0')+'.js';
 const src=read(path);
 assert(src.length>80000&&src.length<400200,path);
 new Function('window',src)(shell);
 assert.equal(typeof shell.SANBAK_FULL_PARTS[i],'string');
 assert(html.includes(path));
}
assert.equal(shell.SANBAK_FULL_PARTS.length,11);
const chunks=JSON.parse(shell.SANBAK_FULL_PARTS.join(''));
assert.equal(Object.keys(chunks).length,32);
const national=JSON.parse(html.match(/<script id="agency-catalog" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'null');
assert(national&&Object.keys(national.mountains).length===2932);
const withLines=Object.values(national.mountains).filter(x=>x.count>0);
assert.equal(withLines.length,2902);
const knps=JSON.parse(html.match(/<script id="knps-sample" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'null');
assert.equal(knps.features.length,19);
let records=0,covered=new Set(),sampleLines=0;
for(const [name,encoded] of Object.entries(chunks)){
 const raw=JSON.parse(gunzipSync(Buffer.from(encoded,'base64')).toString('utf8'));
 assert.equal(raw.schema,'sanbak-national-institutional-lines-v1');
 for(const [code,rows] of Object.entries(raw.mountains)){
  assert.equal(national.mountains[code].count,rows.length);
  covered.add(code);records+=rows.length;
  if(sampleLines<5){const item=rows[0];assert.equal(item.length,9);assert(item[5].length>=1);sampleLines++}
 }
}
assert.equal(covered.size,2902);
assert.equal(records,59368);
assert(html.includes('현행 법정 탐방로 지정·통행 허용'));
assert(!html.includes('SanbakNationalRoutes.shortest'));
assert(read('national.html').includes('./nationwide-full.html'));
const sw=read('sw.js'),wf=read('.github/workflows/deploy-pages.yml');
assert(sw.includes("'./nationwide-full.html'"));
assert(wf.includes('cp data/nationwide-full/part-*.js site/data/nationwide-full/'));
assert(wf.includes('test \"$(find data/nationwide-full -maxdepth 1'));
console.log('PASS v100: 2,932 searchable mountains, 2,902 agency geometry groups, 59,368 records, 11 chunks, KNPS sample, no invented routes');
