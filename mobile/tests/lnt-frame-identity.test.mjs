import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {MAP_GATE_SCRIPT} from '../src/map-guard.mjs';

const catalog=readFileSync(new URL('../catalog.html',import.meta.url),'utf8');
const catalogGuard=catalog.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
const mapGuard=MAP_GATE_SCRIPT.replace(/^<script[^>]*>/,'').replace(/<\/script>$/,'');
function attempt(script,{top=false,unlocked=true,correctFrame=true,throws=false}={}){
  const frame={};
  const parent={document:{body:{classList:{contains:()=>unlocked}},getElementById:()=>throws?(()=>{throw Error('blocked')})():correctFrame?frame:{}}};
  const redirects=[];
  const child={frameElement:frame,location:{replace:href=>redirects.push(href)},parent};
  if(top)child.parent=child;
  runInNewContext(script,{window:child,document:{body:{style:{}}}});
  return redirects;
}
for(const [name,script] of [['catalog',catalogGuard],['map',mapGuard]]){
  test(name+' LNT iframe identity and refusal',()=>{
    assert.ok(script);
    assert.deepEqual(attempt(script),[]);
    assert.deepEqual(attempt(script,{top:true}),['./index.html']);
    assert.deepEqual(attempt(script,{unlocked:false}),['./index.html']);
    assert.deepEqual(attempt(script,{correctFrame:false}),['./index.html']);
    assert.deepEqual(attempt(script,{throws:true}),['./index.html']);
  });
}
