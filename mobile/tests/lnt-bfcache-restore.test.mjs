import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../entry.html',import.meta.url),'utf8');
const match=html.match(/window\.addEventListener\('pageshow',event=>(\{[\s\S]*?\})\);/);
test('LNT gate registers a bfcache restoration handler',()=>assert.ok(match));

test('bfcache restore removes unlocked iframe and restores gate controls',()=>{
 assert.ok(match);
 const frame={removed:false,removeAttribute(name){assert.equal(name,'src');this.removed=true}};
 const body={unlocked:true,classList:{remove(name){assert.equal(name,'unlocked');body.unlocked=false}}};
 const accept={disabled:true},decline={disabled:true},closed={hidden:false};
 const document={body,getElementById(id){return id==='app'?frame:id==='closed'?closed:null}};
 let state={accepted:true,closed:false};
 const createGateState=()=>({accepted:false,closed:false});
 const handler=new Function('event','document','accept','decline','createGateState','getState','setState',
   'let state=getState();'+match[1]+';setState(state)');
 const run=event=>handler(event,document,accept,decline,createGateState,()=>state,next=>{state=next});
 run({persisted:false});
 assert.equal(body.unlocked,true);
 assert.equal(frame.removed,false);
 run({persisted:true});
 assert.deepEqual(state,{accepted:false,closed:false});
 assert.equal(body.unlocked,false);
 assert.equal(frame.removed,true);
 assert.equal(accept.disabled,false);
 assert.equal(decline.disabled,false);
 assert.equal(closed.hidden,true);
});
