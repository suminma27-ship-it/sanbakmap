import test from 'node:test';
import assert from 'node:assert/strict';
import {NATIONAL_REGIONS,nationwideCategoryRegions} from '../src/regions.mjs';
test('all 17 nationwide regions selectable with no place records',()=>{
 const choices=nationwideCategoryRegions([],'valley');
 assert.equal(NATIONAL_REGIONS.length,17);
 assert.equal(new Set(NATIONAL_REGIONS).size,17);
 assert.deepEqual(new Set(choices),new Set(NATIONAL_REGIONS));
});
test('actual subregions appear only for the selected category',()=>{
 const rows=[{category:'valley',region:'경기도 안산시 상록구'},{category:'island',region:'전라남도 신안군'}];
 const valleys=nationwideCategoryRegions(rows,'valley');
 assert.ok(valleys.includes('경기도 안산시'));
 assert.ok(valleys.includes('경기도 안산시 상록구'));
 assert.ok(!valleys.includes('전라남도 신안군'));
 assert.ok(nationwideCategoryRegions(rows,'island').includes('전라남도 신안군'));
});
test('whitespace and compatibility forms normalize without inventing places',()=>{
 const regions=nationwideCategoryRegions([{category:'trekking',region:'경기도　 안산시  상록구'}],'trekking');
 assert.ok(regions.includes('경기도 안산시 상록구'));
 assert.equal(regions.filter(r=>r==='경기도').length,1);
});
