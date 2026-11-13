import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../catalog.html',import.meta.url),'utf8');
const match=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(match,'catalog must include the navigation gate');
function visit({direct,unlocked}) {
 let redirected=false;
 const parent={document:{body:{classList:{contains(name){return name==='unlocked' && unlocked}}}}};
 const window={location:{replace(path){assert.equal(path,'./index.html');redirected=true}}};
 window.parent=direct?window:parent;
 new Function('window',match[1])(window);
 return redirected;
}
test('direct catalog navigation redirects to LNT entry',()=>assert.equal(visit({direct:true,unlocked:false}),true));
test('embedded catalog remains blocked until parent accepted LNT',()=>assert.equal(visit({direct:false,unlocked:false}),true));
test('accepted LNT parent allows embedded catalog',()=>assert.equal(visit({direct:false,unlocked:true}),false));
