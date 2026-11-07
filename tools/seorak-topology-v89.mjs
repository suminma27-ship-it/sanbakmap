// v89: conservative OSM trail/forest-road topology, deliberately not navigation.
// Shared *stored* vertices connect. Near segments and geometric crossings never auto-connect.
// v73 inside-park coordinates are display-simplified (~1m), not certified original OSM nodes.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const RAD=Math.PI/180,EARTH_M=6371000;
const EXPECTED_COUNTS={inside_v73:499,exterior_v75:156,exterior_v76:22,exterior_v77:19,exterior_v78:3,exterior_v83:4};
export const FOREST_ROAD_GRAPH_VERSION=89;

const assert=(check,msg)=>{if(!check)throw Error(msg);};
const read=(root,path)=>readFileSync(resolve(root,path),'utf8');
function compressedJS(js,variable){
 const b64=js.match(new RegExp(variable+"=['\"]([^'\"]+)['\"]"))?.[1];
 assert(b64,'Missing source payload '+variable);
 return JSON.parse(gunzipSync(Buffer.from(b64,'base64')).toString('utf8'));
}
export function decodeDeltaPolyline(encoded){
 assert(typeof encoded==='string'&&encoded.length>0,'v77 coordinate payload missing');
 const points=[],last=[0,0];let index=0;
 while(index<encoded.length){
  const p=[];
  for(let k=0;k<2;k++){
   let value=0,shift=0,part;
   do{
    assert(index<encoded.length,'Truncated v77 polyline');
    part=encoded.charCodeAt(index++)-63;
    assert(part>=0&&part<64,'Invalid encoded v77 point');
    value+=(part%32)*2**shift;shift+=5;
    assert(shift<=60&&Number.isSafeInteger(value),'Invalid v77 integer delta');
   }while(part>=32);
   last[k]+=value%2?-(Math.floor(value/2)+1):value/2;
   p.push(last[k]/1e7);
  }
  points.push(p);
 }
 assert(points.length>=2,'Decoded v77 line empty');
 return points;
}
function validateCoord(p){
 return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
   &&p[0]>128.1&&p[0]<128.75&&p[1]>37.9&&p[1]<38.38;
}
export function loadSeorakDisplayedLines(root){
 const html=read(root,'national-parks-trails.html');
 const base=compressedJS(html,'SANBAK_NP_OSM_B64');
 assert(base.data_version===73&&base.parks?.seorak?.line_count===499,
   'v73 source changed; an explicit review is required before graph generation');
 const record=base.parks.seorak;
 const lines=[];
 for(const kind of ['trail','track']){
  record.segments[kind].forEach((points,i)=>lines.push({
   id:'v73:'+kind+':'+i,source_stage:'inside_v73',
   kind,osm_way_id:null,geometry_accuracy:'display_simplified_not_original_node',
   points
  }));
 }
 const v75text=html.match(/<script id="seorak-border-v75" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
 assert(v75text,'Missing v75 source geometry');
 const v75=JSON.parse(v75text);
 assert(v75.features?.length===156,'v75 geometry count changed');
 v75.features.forEach((f,i)=>{
  const kind=f.properties?.highway==='track'?'track':'trail';
  lines.push({id:'v75:'+i,source_stage:'exterior_v75',kind,
   osm_way_id:String(f.properties.osm_id),geometry_accuracy:'source_coords_may_be_boundary_clipped',
   points:f.geometry.coordinates});
 });
 const v76=compressedJS(read(root,'seorak-v76-extra.js'),'SANBAK_SEORAK_V76_B64');
 assert(v76.v===76&&v76.paths?.length===22,'v76 source changed');
 v76.paths.forEach((p,i)=>lines.push({
  id:'v76:'+i,source_stage:'exterior_v76',kind:p.h==='track'?'track':'trail',
  osm_way_id:String(p.i),geometry_accuracy:'source_coords_may_be_boundary_clipped',
  points:p.p
 }));
 const excluded=new Set([485958070,485958071,485958085,485958086,1167747441,1167747442,1167747443]);
 const v77=compressedJS(read(root,'seorak-v77-extra.js'),'SANBAK_SEORAK_V77_B64');
 assert(v77.v===77&&v77.a?.length===27,'v77 source changed');
 v77.a.forEach((p,i)=>{
  if(excluded.has(p.i))return;
  lines.push({id:'v77:'+i,source_stage:'exterior_v77',kind:'trail',
   osm_way_id:String(p.i),geometry_accuracy:'source_coords_may_be_boundary_clipped',
   points:decodeDeltaPolyline(p.e)});
 });
 const v78=compressedJS(read(root,'seorak-v78-extra.js'),'SANBAK_SEORAK_V78_B64');
 assert(v78.v===78&&v78.paths?.length===9,'v78 source changed');
 v78.paths.forEach((p,i)=>{
  if(p.h!=='track')return;
  lines.push({id:'v78:'+i,source_stage:'exterior_v78',kind:'track',
   osm_way_id:String(p.i),geometry_accuracy:'source_coords_may_be_boundary_clipped',points:p.p});
 });
 const match=read(root,'seorak-v83-gpx-tracks.js').match(/window\.SANBAK_SEORAK_V83_GPX_TRACKS=(\{.*\});/);
 assert(match,'Missing four v83 OSM track sources');
 const v83=JSON.parse(match[1]);
 assert(v83.version===83&&v83.paths?.length===4&&v83.route_allowed===false,'v83 source changed');
 v83.paths.forEach((p,i)=>lines.push({
  id:'v83:'+i,source_stage:'exterior_v83',kind:'track',
  osm_way_id:String(p.i),geometry_accuracy:'source_coords_may_be_boundary_clipped',points:p.p}));
 const counts={};for(const line of lines){
  counts[line.source_stage]=(counts[line.source_stage]||0)+1;
  assert(line.points?.length>=2&&line.points.every(validateCoord),'Invalid source geometry '+line.id);
 }
 assert(JSON.stringify(counts)===JSON.stringify(EXPECTED_COUNTS),
   'Displayed geometry source stages changed: '+JSON.stringify(counts));
 assert(lines.length===703,'Expected exactly 703 displayed source lines');
 assert(new Set(lines.map(l=>l.id)).size===703,'Duplicate per-fragment line IDs');
 return lines;
}
export function metres(a,b){
 const lat=(b[1]-a[1])*RAD,lon=(b[0]-a[0])*RAD;
 const h=Math.sin(lat/2)**2+Math.cos(a[1]*RAD)*Math.cos(b[1]*RAD)*Math.sin(lon/2)**2;
 return 2*EARTH_M*Math.asin(Math.min(1,Math.sqrt(h)));
}
const key=p=>p.join(',');
function segmentCrossing(a,b,c,d){
 // Strict 2D interior/interior crossing; endpoint touches and collinear overlap are not promoted.
 const ax=b[0]-a[0],ay=b[1]-a[1],cx=d[0]-c[0],cy=d[1]-c[1];
 const denom=ax*cy-ay*cx;
 if(Math.abs(denom)<1e-18)return null;
 const qx=c[0]-a[0],qy=c[1]-a[1];
 const t=(qx*cy-qy*cx)/denom,u=(qx*ay-qy*ax)/denom;
 if(t<=1e-7||t>=1-1e-7||u<=1e-7||u>=1-1e-7)return null;
 return [a[0]+ax*t,a[1]+ay*t];
}
export function buildTopology(lines,{analyzeNearMisses=true,analyzeCrossings=true}={}){
 assert(Array.isArray(lines)&&lines.length>0,'Missing source lines');
 const nodes=[],edges=[],lineIndex={},nodeIndex=new Map(),parents=[],ranks=[];
 const makeNode=(p)=>{
  const k=key(p);if(nodeIndex.has(k))return nodeIndex.get(k);
  const id=nodes.length;nodeIndex.set(k,id);
  nodes.push({coord:p,kind_mask:0,incident:[],in_source:false,in_display_simplified:false});
  parents.push(id);ranks.push(0);return id;
 };
 function find(x){while(parents[x]!==x){parents[x]=parents[parents[x]];x=parents[x];}return x;}
 function union(a,b){let ra=find(a),rb=find(b);if(ra===rb)return;if(ranks[ra]<ranks[rb])[ra,rb]=[rb,ra];parents[rb]=ra;if(ranks[ra]===ranks[rb])ranks[ra]++;}
 let zeroLengthEdges=0;
 const summaryBySource={};
 for(let lineId=0;lineId<lines.length;lineId++){
  const line=lines[lineId];
  assert(typeof line.id==='string'&&Array.isArray(line.points)&&line.points.length>=2
    &&['trail','track'].includes(line.kind),'Bad line record '+lineId);
  assert(line.points.every(validateCoord),'Invalid coordinate line '+line.id);
  assert(!Object.hasOwn(lineIndex,line.id),'Duplicate line ID '+line.id);
  lineIndex[line.id]=lineId;
  const nodeIds=line.points.map(makeNode);
  const isDisplay=line.geometry_accuracy==='display_simplified_not_original_node';
  const mask=line.kind==='track'?2:1;
  for(const n of new Set(nodeIds)){
   const node=nodes[n];node.kind_mask|=mask;node.incident.push(lineId);
   if(isDisplay)node.in_display_simplified=true;else node.in_source=true;
  }
  const stage=summaryBySource[line.source_stage]||{lines:0,trail:0,track:0,vertices:0};
  stage.lines++;stage[line.kind]++;stage.vertices+=line.points.length;
  summaryBySource[line.source_stage]=stage;
  for(let i=1;i<nodeIds.length;i++){
   const a=nodeIds[i-1],b=nodeIds[i];
   if(a===b){zeroLengthEdges++;continue;}
   const dist=metres(nodes[a].coord,nodes[b].coord);
   assert(Number.isFinite(dist)&&dist>0,'Invalid edge distance '+line.id);
   edges.push({a,b,line_id:lineId,metres:Math.round(dist*100)/100,
     source_stage:line.source_stage,kind:line.kind,
     display_simplified:isDisplay});
   union(a,b);
  }
 }
 const rootId=new Map(),components=[];
 for(let n=0;n<nodes.length;n++){
  const root=find(n);
  if(!rootId.has(root)){
   rootId.set(root,components.length);
   components.push({node_count:0,edge_count:0,line_ids:new Set(),track_lines:new Set(),
    trail_lines:new Set(),inside_v73_line_count:0,external_source_line_count:0});
  }
  const cid=rootId.get(root);nodes[n].component=cid;components[cid].node_count++;
 }
 const lineComponents=new Map();
 for(const edge of edges){
  const cid=nodes[edge.a].component;
  assert(cid===nodes[edge.b].component,'Broken union-find');
  const comp=components[cid];comp.edge_count++;comp.line_ids.add(edge.line_id);
  if(edge.kind==='track')comp.track_lines.add(edge.line_id);else comp.trail_lines.add(edge.line_id);
  if(!lineComponents.has(edge.line_id))lineComponents.set(edge.line_id,cid);
 }
 for(const [lid,cid] of lineComponents){
  if(lines[lid].source_stage==='inside_v73')components[cid].inside_v73_line_count++;
  else components[cid].external_source_line_count++;
 }
 const contacts={shared_vertex_nodes:0,shared_original_only_vertex_nodes:0,
    mixed_display_and_original_vertex_nodes:0,trail_track_vertex_nodes:0,
    trail_track_original_only_vertex_nodes:0,source_stage_border_vertex_nodes:0};
 for(const node of nodes){
  if(node.incident.length<2)continue;
  contacts.shared_vertex_nodes++;
  if(node.in_display_simplified&&node.in_source)contacts.mixed_display_and_original_vertex_nodes++;
  if(!node.in_display_simplified)contacts.shared_original_only_vertex_nodes++;
  if(node.kind_mask===3){
   contacts.trail_track_vertex_nodes++;
   if(!node.in_display_simplified)contacts.trail_track_original_only_vertex_nodes++;
  }
  const inside=node.incident.some(id=>lines[id].source_stage==='inside_v73');
  const exterior=node.incident.some(id=>lines[id].source_stage!=='inside_v73');
  if(inside&&exterior)contacts.source_stage_border_vertex_nodes++;
 }
 const componentCounts=components.map((c,i)=>({
  id:i,node_count:c.node_count,edge_count:c.edge_count,line_count:c.line_ids.size,
  trail_line_count:c.trail_lines.size,track_line_count:c.track_lines.size,
  simplified_inside_line_count:c.inside_v73_line_count,
  exterior_source_line_count:c.external_source_line_count,
  original_only:c.inside_v73_line_count===0
 })).sort((a,b)=>b.line_count-a.line_count||a.id-b.id);
 const endpoints=new Set();
 for(const line of lines){
  endpoints.add(nodeIndex.get(key(line.points[0])));
  endpoints.add(nodeIndex.get(key(line.points.at(-1))));
 }
 const near={endpoint_pairs_1_to_5m:0,endpoint_pairs_5_to_15m:0,
  endpoint_pairs_15_to_30m:0,examples:[]};
 if(analyzeNearMisses){
  const grid=new Map(),cell=.00024;
  const ij=p=>[Math.floor(p[0]/cell),Math.floor(p[1]/cell)];
  for(const id of endpoints){
   const ijk=ij(nodes[id].coord),name=ijk.join(',');
   if(!grid.has(name))grid.set(name,[]);
   grid.get(name).push(id);
  }
  for(const id of endpoints){
   const p=nodes[id].coord,[x,y]=ij(p);
   for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){
    for(const other of grid.get([x+dx,y+dy].join(','))||[]){
     if(other<=id||nodes[other].component===nodes[id].component)continue;
     const d=metres(p,nodes[other].coord);
     if(d<1||d>30)continue;
     if(d<5)near.endpoint_pairs_1_to_5m++;
     else if(d<15)near.endpoint_pairs_5_to_15m++;
     else near.endpoint_pairs_15_to_30m++;
     near.examples.push({a:id,b:other,distance_m:+d.toFixed(1),
       a_component:nodes[id].component,b_component:nodes[other].component});
    }
   }
  }
  near.examples.sort((a,b)=>a.distance_m-b.distance_m);
  near.examples=near.examples.slice(0,30);
 }
 const crossings={internal_2d_crossings_between_disconnected_components:0,
    distinct_line_pairs:0,examples:[],limit_note:'2D planar crossings are audit candidates, NOT routable junctions'};
 if(analyzeCrossings){
  // Spatial grid keeps the check subquadratic. Crossings only between disconnected
  // components of different source lines are considered; overlapping segments ignored.
  const grid=new Map(),lonCell=.00030,latCell=.00030;
  const segmentCells=edge=>{
   const a=nodes[edge.a].coord,b=nodes[edge.b].coord;
   const ix0=Math.floor(Math.min(a[0],b[0])/lonCell),ix1=Math.floor(Math.max(a[0],b[0])/lonCell),
     iy0=Math.floor(Math.min(a[1],b[1])/latCell),iy1=Math.floor(Math.max(a[1],b[1])/latCell);
   const cells=[];
   for(let i=ix0;i<=ix1;i++)for(let j=iy0;j<=iy1;j++)cells.push(i+','+j);
   return cells;
  };
  const seen=new Set(),pairs=new Set();
  for(let eid=0;eid<edges.length;eid++){
   const e=edges[eid];
   for(const cell of segmentCells(e)){
    const others=grid.get(cell)||[];
    for(const oid of others){
     const o=edges[oid];
     if(e.line_id===o.line_id||nodes[e.a].component===nodes[o.a].component)continue;
     const token=oid+':'+eid;if(seen.has(token))continue;seen.add(token);
     const p=segmentCrossing(nodes[e.a].coord,nodes[e.b].coord,nodes[o.a].coord,nodes[o.b].coord);
     if(!p)continue;
     crossings.internal_2d_crossings_between_disconnected_components++;
     pairs.add([Math.min(e.line_id,o.line_id),Math.max(e.line_id,o.line_id)].join(':'));
     if(crossings.examples.length<40)crossings.examples.push({
       line_a:lines[e.line_id].id,line_b:lines[o.line_id].id,at_lonlat:p,
       a_component:nodes[e.a].component,b_component:nodes[o.a].component});
    }
    if(!grid.has(cell))grid.set(cell,[]);
    grid.get(cell).push(eid);
   }
  }
  crossings.distinct_line_pairs=pairs.size;
 }
 const stats={
  schema_version:89,source:'OpenStreetMap Geofabrik South Korea 2026-11-05',
  displayed_source_lines:lines.length,source_stage_breakdown:summaryBySource,
  vertex_instances:lines.reduce((n,x)=>n+x.points.length,0),
  unique_stored_coordinate_nodes:nodes.length,
  source_consecutive_edges:edges.length,zero_length_input_edges_skipped:zeroLengthEdges,
  connected_components:components.length,
  component_stats:componentCounts.slice(0,20),
  component_single_line_count:componentCounts.filter(c=>c.line_count===1).length,
  component_exterior_source_only_count:componentCounts.filter(c=>c.original_only).length,
  contacts,near, crossings,
  important_source_limit:'v73 inside-park records are 1m-simplified display geometry without OSM way/node IDs. Their coincident display coordinates are NOT independently verified original OSM topology.',
  routing_allowed:false,route_planner_ready_for_public_navigation:false,
  synthetic_joins_created:0,coordinate_snapping_tolerance_m:0
 };
 return {nodes,edges,lines:lines.map(({points,...rest})=>rest),components:componentCounts,stats};
}
export function previewOnlyShortestPath(graph,startCoord,endCoord,{acknowledgeUnverifiedDisplayTopology=false}={}){
 // Never offer a public navigation route from display-only topology.
 if(!acknowledgeUnverifiedDisplayTopology)
  throw Error('Display-derived draft graph is not a verified routable hiking network');
 const nodes=graph.nodes,edges=graph.edges;
 const index=new Map(nodes.map((n,i)=>[key(n.coord),i]));
 const a=index.get(key(startCoord)),b=index.get(key(endCoord));
 if(a===undefined||b===undefined)
  return {status:'nonexistent_exact_vertex',routing_allowed:false};
 if(nodes[a].component!==nodes[b].component)
  return {status:'disconnected_no_synthetic_join',routing_allowed:false};
 const adj=Array.from({length:nodes.length},()=>[]);
 edges.forEach((e,i)=>{
  adj[e.a].push([e.b,i,e.metres]);adj[e.b].push([e.a,i,e.metres]);
 });
 const dist=new Float64Array(nodes.length).fill(Infinity),parent=new Int32Array(nodes.length).fill(-1),
  prevEdge=new Int32Array(nodes.length).fill(-1),visited=new Uint8Array(nodes.length);
 dist[a]=0;
 const heap=[[0,a]];
 const push=(pair)=>{
  heap.push(pair);let i=heap.length-1;
  while(i){const p=(i-1)>>1;if(heap[p][0]<=pair[0])break;heap[i]=heap[p];i=p;}
  heap[i]=pair;
 };
 const pop=()=>{
  const head=heap[0],end=heap.pop();if(!heap.length)return head;
  let i=0;while(2*i+1<heap.length){
   let child=i*2+1;if(child+1<heap.length&&heap[child+1][0]<heap[child][0])child++;
   if(heap[child][0]>=end[0])break;
   heap[i]=heap[child];i=child;
  }
  heap[i]=end;return head;
 };
 while(heap.length){
  const [current,u]=pop();if(visited[u]||current>dist[u])continue;
  visited[u]=1;if(u===b)break;
  for(const [v,eid,length]of adj[u]){
   const next=current+length;if(next>=dist[v])continue;
   dist[v]=next;parent[v]=u;prevEdge[v]=eid;push([next,v]);
  }
 }
 if(!Number.isFinite(dist[b]))return {status:'disconnected_no_synthetic_join',routing_allowed:false};
 const steps=[],nodeIds=[];for(let v=b;v!==-1;v=parent[v]){
  nodeIds.push(v);if(prevEdge[v]!==-1)steps.push(prevEdge[v]);
  if(v===a)break;
 }
 nodeIds.reverse();steps.reverse();
 return {status:'unverified_draft_preview_only',routing_allowed:false,
  length_m:+dist[b].toFixed(2),point_coordinates:nodeIds.map(i=>nodes[i].coord),
  source_edges:steps.map(i=>({line_id:graph.lines[edges[i].line_id].id,
    display_simplified:edges[i].display_simplified})),
  must_not_be_used_for_navigation:true};
}
export function writeTopology(root,graph,outDir){
 mkdirSync(outDir,{recursive:true});
 const dir=resolve(outDir),gz=resolve(dir,'seorak-v89-topology.json.gz'),
  summary=resolve(dir,'seorak-v89-topology-summary.json');
 const graphExport={
  schema_version:89,routing_allowed:false,not_for_navigation:true,
  source_projection:'WGS84 longitude latitude',
  source_mixing_warning:graph.stats.important_source_limit,
  nodes:graph.nodes.map(n=>n.coord),
  components:graph.nodes.map(n=>n.component),
  edges:graph.edges.map(e=>[e.a,e.b,e.line_id,e.metres]),
  lines:graph.lines.map(({id,source_stage,kind,osm_way_id,geometry_accuracy})=>({
   id,source_stage,kind,osm_way_id,geometry_accuracy,route_allowed:false}))
 };
 writeFileSync(gz,gzipSync(Buffer.from(JSON.stringify(graphExport)),{level:9}));
 writeFileSync(summary,JSON.stringify(graph.stats,null,2)+'\n');
 return {gz,summary};
}
function cli(){
 const root=fileURLToPath(new URL('../',import.meta.url));
 const outIndex=process.argv.indexOf('--output-dir');
 if(outIndex<0||!process.argv[outIndex+1]){
  process.stderr.write('Usage: node tools/seorak-topology-v89.mjs --output-dir site\n');
  process.exitCode=2;return;
 }
 const lines=loadSeorakDisplayedLines(root);
 const graph=buildTopology(lines);
 const files=writeTopology(root,graph,resolve(process.argv[outIndex+1]));
 const small={
  lines:graph.stats.displayed_source_lines,
  by_stage:graph.stats.source_stage_breakdown,
  unique_nodes:graph.stats.unique_stored_coordinate_nodes,
  edges:graph.stats.source_consecutive_edges,
  components:graph.stats.connected_components,
  single_line_components:graph.stats.component_single_line_count,
  contacts:graph.stats.contacts,
  near:{...graph.stats.near,examples:graph.stats.near.examples.slice(0,6)},
  crossings:graph.stats.crossings,
  largest_components:graph.stats.component_stats.slice(0,8),
  files
 };
 process.stdout.write('SANBAK_V89_TOPOLOGY_SUMMARY='+JSON.stringify(small)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli();
