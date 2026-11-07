#!/usr/bin/env node
// v92: map-visible topology excluding only OSM access=no and explicit sidewalks.
// This audit graph is NOT an approved navigation/routing graph.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSeorakDisplayedLines,buildTopology} from './seorak-topology-v89.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));

export function v92VisibleLines(rootDir=root){
 const v91=read('audits/seorak-v91-display-way-index.json');
 const review=read('audits/seorak-v92-inside-footway-review.json');
 assert.equal(review.version,92);
 assert.equal(v91.display_line_count,499);
 assert.deepEqual(review.exclude_inside_v73_trail_indexes,[89,436,437]);
 assert.deepEqual(review.exclude_osm_way_ids,[351060038,1554715873,1554715874]);
 const ids=new Set(review.exclude_inside_v73_trail_indexes.map(i=>'v73:trail:'+i));
 const all=loadSeorakDisplayedLines(rootDir);
 for(const idx of review.exclude_inside_v73_trail_indexes)
   assert.equal(v91.display_line_to_osm_way_id[idx],
     review.rows.find(r=>r[0]===idx)?.[1],
     'OSM exclusion must match source way index');
 const filtered=all.filter(r=>!ids.has(r.id));
 assert.equal(all.length,703);
 assert.equal(filtered.length,700);
 assert(filtered.every(r=>!ids.has(r.id)));
 return filtered;
}
export function generateV92Graph(rootDir=root){
 const lines=v92VisibleLines(rootDir);
 const graph=buildTopology(lines);
 assert.equal(graph.stats.displayed_source_lines,700);
 assert.equal(graph.stats.connected_components,67,
   'Filter must not detach any previously connected OSM area');
 assert.equal(graph.stats.source_stage_breakdown.inside_v73.lines,496);
 assert.equal(graph.stats.source_stage_breakdown.exterior_v75.lines,156);
 assert.equal(graph.stats.source_stage_breakdown.exterior_v76.lines,22);
 assert.equal(graph.stats.source_stage_breakdown.exterior_v77.lines,19);
 assert.equal(graph.stats.source_stage_breakdown.exterior_v78.lines,3);
 assert.equal(graph.stats.source_stage_breakdown.exterior_v83.lines,4);
 assert.equal(graph.stats.routing_allowed,false);
 assert.equal(graph.stats.synthetic_joins_created,0);
 return graph;
}
function cli(){
 const i=process.argv.indexOf('--output-dir');
 if(i<0||!process.argv[i+1]){
  process.stderr.write('Usage: node tools/seorak-topology-v92.mjs --output-dir site\n');
  process.exitCode=2;return;
 }
 const graph=generateV92Graph();
 const output=resolve(process.argv[i+1]);mkdirSync(output,{recursive:true});
 const sourceIndex=read('audits/seorak-v91-display-way-index.json');
 const result={
  schema_version:92,source:'OSM 2026-11-05, v91 original way index',
  reviewed_footways:75,removed_inside_original_way_ids:[351060038,1554715873,1554715874],
  removed_v73_trail_indices:[89,436,437],
  routing_allowed:false,not_for_navigation:true,
  original_way_identity_warning:'Only 412 of 499 v91 inside lines have original-node subsequence proof; 87 remain geometry-only candidates.',
  user_visible_line_count:700,
  nodes:graph.nodes.map(n=>n.coord),
  components:graph.nodes.map(n=>n.component),
  edges:graph.edges.map(e=>[e.a,e.b,e.line_id,e.metres]),
  lines:graph.lines.map(x=>({...x,
   osm_way_id:x.id.startsWith('v73:trail:')?String(sourceIndex.display_line_to_osm_way_id[Number(x.id.split(':')[2])]):
    x.id.startsWith('v73:track:')?String(sourceIndex.display_line_to_osm_way_id[480+Number(x.id.split(':')[2])]):x.osm_way_id,
   route_allowed:false
  }))
 };
 const stats={...graph.stats,version:92,removed_inside_paths:3,removed_length_m_approx:293.1,
  old_displayed_lines:703,new_displayed_lines:700};
 writeFileSync(resolve(output,'seorak-v92-topology.json.gz'),gzipSync(Buffer.from(JSON.stringify(result)),{level:9}));
 writeFileSync(resolve(output,'seorak-v92-topology-summary.json'),JSON.stringify(stats,null,2)+'\n');
 process.stdout.write('SANBAK_V92_TOPOLOGY='+JSON.stringify({
  nodes:stats.unique_stored_coordinate_nodes,edges:stats.source_consecutive_edges,
  connected_components:stats.connected_components,
  displayed_source_lines:stats.displayed_source_lines,
  trial_only:true
 })+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli();
