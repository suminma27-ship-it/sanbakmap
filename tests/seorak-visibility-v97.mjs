// v97: OSM display filters are independent of officially approved trails and routing.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scope={};
new Function('window',read('core/trail-visibility.js'))(scope);
const f=scope.SanbakTrailVisibility;
assert.equal(f.version,1);
assert.deepEqual(f.modes,['focus','roads','all']);
for(const [tag,kind] of [['path','trail'],['steps','trail'],['bridleway','trail'],
 ['track','forest_road'],['footway','uncertain_footway'],['pedestrian','uncertain_footway'],
 ['residential','review']])assert.equal(f.classifyOSM(tag),kind);
for(const [mode,allowed] of [
 ['focus',['trail']],['roads',['trail','forest_road']],['all',['trail','forest_road','uncertain_footway','review']]
]){
 for(const category of ['trail','forest_road','uncertain_footway','review'])
  assert.equal(f.visible(mode,category),allowed.includes(category));
}
assert.equal(f.visible('unrecognized','trail'),false);
const v92=JSON.parse(read('audits/seorak-v92-inside-footway-review.json'));
assert.equal(v92.map_lines_after,700);
assert.equal(v92.rows.length,75);
const review=new Set(v92.rows.map(row=>row[0]));
assert.equal(review.size,75);
assert.equal(v92.exclude_inside_v73_trail_indexes.length,3);
for(const i of review){
 assert.equal(f.insideTrail(i,'focus',review),false);
 assert.equal(f.insideTrail(i,'roads',review),false);
 assert.equal(f.insideTrail(i,'all',review),true);
}
assert.equal(f.insideTrail(25,'focus',review),true);
assert.equal(f.insideTrail(25,'roads',review),true);
assert.equal(f.insideTrail(25,'all',review),true);
assert.equal(f.insideTrail(-1,'all',review),false);
const html=read('national-parks-trails.html');
assert(html.includes('<span>산박지도 v97 · 산길 표시 간소화</span>'));
assert(html.includes('<script src="./core/trail-visibility.js"></script>'));
assert(html.includes('id="pathMode"'));
assert(html.includes('<option value="focus" selected>산길 중심</option>'));
assert(html.includes('<option value="roads">임도 포함</option>'));
assert(html.includes('<option value="all">전체 원본</option>'));
assert(html.includes("const visibleExtra=extra.filter(f=>visibility?.visible(mode,visibility.classifyOSM(f.properties?.highway))??true);"));
assert(html.includes('const seorakUncertainInsideTrailIndices=new Set('+JSON.stringify(v92.rows.map(x=>x[0]))+');'));
assert(html.includes('visibility.insideTrail(i,mode,seorakUncertainInsideTrailIndices)'));
assert(html.includes('const visibleRoads=showSeorak&&!visibility.visible(mode,\'forest_road\')?[]:record.segments.track;'));
assert(html.includes('const visibleCount=visibleTrails.length+visibleRoads.length+visibleExtra.length;'));
assert(html.includes("excludedSeorakInsideTrailIndices=new Set([89,436,437])"));
assert(html.includes("record.segments.trail.filter((_,i)=>!excludedSeorakInsideTrailIndices.has(i))"));
assert(html.includes('insideDisplayedCount+extra.length'));
const encoded=html.match(/window\.SANBAK_NP_OSM_B64="([^"]+)"/)?.[1];
assert(encoded);
const v91=JSON.parse(read('audits/seorak-v91-display-way-index.json'));
assert.equal(createHash('sha256').update(encoded).digest('hex'),v91.v73_embedded_source_sha256);
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);
for(const script of scripts)new Function(script[1]);
const wf=read('.github/workflows/deploy-pages.yml'),sw=read('sw.js');
assert(wf.includes('cp core/trail-visibility.js site/core/trail-visibility.js'));
assert(sw.includes("'./core/trail-visibility.js'"));
assert.equal(JSON.parse(read('deployment-version.json')).ui_version,'v97');
assert(read('README.md').includes('## v97 설악산 길 표시 간소화'));
console.log('PASS v97: three OSM display modes, 75 review indexes, source hash preserved, 700 source lines retained');
