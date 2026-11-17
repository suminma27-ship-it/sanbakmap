import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_GATE_SCRIPT,guardMapHtml} from '../src/map-guard.mjs';

test('packaged map keeps consent guard and return-to-catalog control',()=>{
  const html=guardMapHtml('<!doctype html><html><head><title>Map</title></head><body></body></html>');
  assert.match(html,/data-sanbakmap-lnt-map-guard/);
  assert.match(html,/classList\.contains\('unlocked'\)/);
  assert.match(html,/window\.parent === window/);
  assert.match(html,/sanbakmap-return-catalog/);
  assert.match(html,/getElementById\('app'\)\.src = '\.\/catalog\.html'/);
  assert.equal((html.match(/data-sanbakmap-lnt-map-guard/g)||[]).length,1);
  assert.equal(MAP_GATE_SCRIPT.includes('DOMContentLoaded'),true);
});

test('map source is untouched and double injection is rejected',()=>{
  const original='<html><head></head><body>Original map</body></html>';
  const packaged=guardMapHtml(original);
  assert.equal(original,'<html><head></head><body>Original map</body></html>');
  assert.match(packaged,/Original map/);
  assert.throws(()=>guardMapHtml(packaged),/already contains LNT guard/);
  assert.throws(()=>guardMapHtml('<html><body></body></html>'),/HTML head/);
});
