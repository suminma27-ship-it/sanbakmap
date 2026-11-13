import test from 'node:test';
import assert from 'node:assert/strict';
import {guardMapHtml} from '../src/map-guard.mjs';

const source = '<!doctype html><html><head><title>Original map</title></head><body><main>Map</main></body></html>';
const result = guardMapHtml(source);
const script = result.match(/<script data-sanbakmap-lnt-map-guard>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'packaged map has a guard before the original map scripts');
assert.ok(result.indexOf('data-sanbakmap-lnt-map-guard') < result.indexOf('<title>'));
assert.equal(result.replace(/<script data-sanbakmap-lnt-map-guard>[\s\S]*?<\/script>/, '').replace(/\n(?=<title>)/, ''), source);
function visit({direct, unlocked, crossOrigin=false}) {
  let redirect = '';
  const parent = crossOrigin ? {get document(){throw Error('cross-origin')}} : {document:{body:{classList:{contains(name){return name==='unlocked' && unlocked}}}}};
  const window = {location:{replace(path){redirect=path}}};
  window.parent=direct?window:parent;
  new Function('window',script)(window);
  return redirect;
}
test('direct map URL requires LNT entry',()=>assert.equal(visit({direct:true}), './index.html'));
test('embedded map with locked parent requires LNT entry',()=>assert.equal(visit({unlocked:false}), './index.html'));
test('cross-origin parent fails closed',()=>assert.equal(visit({crossOrigin:true}), './index.html'));
test('accepted parent may render existing map',()=>assert.equal(visit({unlocked:true}), ''));
test('invalid or already guarded map fails packaging',()=>{
  assert.throws(()=>guardMapHtml('<body>No head</body>'));
  assert.throws(()=>guardMapHtml(result));
});
